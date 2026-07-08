from decimal import Decimal, InvalidOperation

import razorpay
from django.contrib import messages
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET, require_POST

from django.http import HttpResponse, HttpResponseForbidden

from .cart_utils import get_existing_cart, get_or_create_cart, merge_guest_cart_into_user, serialize_cart
from .forms import CheckoutForm, ContactForm, LoginForm, RegisterForm
from .invoice_utils import invoice_filename, render_invoice_pdf
from .models import CartItem, Category, Contact, Order, Product, Testimonial
from .order_utils import CheckoutError, create_pending_order, finalize_paid_order, mark_order_failed
from django.core.mail import send_mail
from threading import Thread

from django.conf import settings
# Create your views here.


PRODUCTS_PER_PAGE = 20

SORT_OPTIONS = {
    "featured": ("-is_featured", "-created_at"),
    "newest": ("-created_at",),
    "oldest": ("created_at",),
    "price_low": ("new_price",),
    "price_high": ("-new_price",),
}


def get_active_products_by_category(category_slug):
    """Reusable helper for future category pages."""
    return (
        Product.objects.filter(category__slug=category_slug, is_active=True)
        .select_related("category")
        .order_by("-created_at")
    )







def send_contact_email(form_data):
    subject = f"New Contact Form Submission: {form_data['subject']}"
    message = f"""
    You have received a new contact form submission:

    Full Name: {form_data['fullName']}
    Email Address: {form_data['emailAddress']}
    Phone Number: {form_data['phoneNumber']}
    Subject: {form_data['subject']}
    Message:
    {form_data['message']}
    """
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [settings.DEFAULT_FROM_EMAIL],
    )

def index(request):
    latest_products = Product.objects.filter(is_active=True).order_by('-created_at')[:12]
    collection_products = (
        Product.objects.filter(is_active=True)
        .select_related('category')
        .order_by('?')
    )
    testimonials = Testimonial.objects.filter(is_active=True).order_by('-created_at')[:6]
    return render(request, 'index.html', {
        'latest_products': latest_products,
        'collection_products': collection_products,
        'testimonials': testimonials,
    })


def login(request):
    login_form = LoginForm()
    register_form = RegisterForm()
    active_form = 'login'

    if request.method == 'POST':
        form_type = request.POST.get('form_type')

        if form_type == 'register':
            active_form = 'register'
            register_form = RegisterForm(request.POST)
            if register_form.is_valid():
                register_form.save()
                messages.success(request, "Your account has been created successfully. Please login.")
                return redirect('login')
        elif form_type == 'login':
            active_form = 'login'
            login_form = LoginForm(request.POST)
            if login_form.is_valid():
                guest_session_key = request.session.session_key
                user = login_form.cleaned_data['user']
                auth_login(request, user)
                merge_guest_cart_into_user(guest_session_key, user)
                messages.success(request, "Welcome back!")
                return redirect('index')

    return render(request, 'login.html', {
        'login_form': login_form,
        'register_form': register_form,
        'active_form': active_form,
    })


def logout_view(request):
    auth_logout(request)
    messages.success(request, "You have been logged out.")
    return redirect('index')


def checkout(request):
    cart = get_existing_cart(request)
    items = list(cart.items.select_related('product', 'product__category').all()) if cart else []

    if not items:
        messages.info(request, "Your cart is empty. Add a stone before checking out.")
        return redirect('products')

    subtotal = sum(item.line_total for item in items)

    prefill = {}
    if request.user.is_authenticated:
        prefill = {
            'billingName': request.user.get_full_name() or request.user.username,
            'billingEmail': request.user.email,
            'billingPhone': getattr(getattr(request.user, 'profile', None), 'mobile_number', '') or '',
        }

    return render(request, 'checkout.html', {
        'cart_items': items,
        'cart_subtotal': subtotal,
        'cart_total': subtotal,
        'prefill': prefill,
        'razorpay_key_id': settings.RAZORPAY_KEY_ID,
    })


def _razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return None
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


@require_POST
def checkout_create_order(request):
    """Step 1 of payment: validate the checkout form + cart/stock, create a
    Pending Order snapshot, open a matching Razorpay order, and hand the
    frontend everything it needs to open the Razorpay Checkout widget.
    """
    client = _razorpay_client()
    if client is None:
        return JsonResponse({'success': False, 'message': "Online payment is not configured yet. Please contact support."}, status=503)

    form = CheckoutForm(request.POST)
    if not form.is_valid():
        first_error = next(iter(form.errors.values()))[0]
        return JsonResponse({'success': False, 'message': first_error}, status=400)

    try:
        order, _cart = create_pending_order(request, form)
    except CheckoutError as exc:
        return JsonResponse({'success': False, 'message': str(exc)}, status=400)

    try:
        razorpay_order = client.order.create(data={
            'amount': int(order.total_amount * 100),
            'currency': 'INR',
            'receipt': order.order_number,
            'notes': {'order_number': order.order_number},
        })
    except Exception:
        return JsonResponse({'success': False, 'message': "Could not start payment. Please try again."}, status=502)

    order.razorpay_order_id = razorpay_order['id']
    order.save(update_fields=['razorpay_order_id', 'updated_at'])

    return JsonResponse({
        'success': True,
        'key_id': settings.RAZORPAY_KEY_ID,
        'razorpay_order_id': razorpay_order['id'],
        'amount': razorpay_order['amount'],
        'currency': razorpay_order['currency'],
        'order_number': order.order_number,
        'name': "SoulStones",
        'description': f"Order {order.order_number}",
        'prefill': {
            'name': order.full_name,
            'email': order.email,
            'contact': order.mobile_number,
        },
    })


@require_POST
def checkout_verify_payment(request):
    """Step 2: called from the Razorpay Checkout `handler` once the customer
    completes payment. Verifies the signature server-side (never trust the
    frontend), then finalizes the order — stock reduction, cart clearing,
    and the Confirmed-status email all happen here, only on real success.
    """
    order_number = request.POST.get('order_number')
    razorpay_order_id = request.POST.get('razorpay_order_id')
    razorpay_payment_id = request.POST.get('razorpay_payment_id')
    razorpay_signature = request.POST.get('razorpay_signature')

    order = Order.objects.filter(order_number=order_number, razorpay_order_id=razorpay_order_id).first()
    if not order:
        return JsonResponse({'success': False, 'message': "Order not found."}, status=404)

    client = _razorpay_client()
    if client is None:
        return JsonResponse({'success': False, 'message': "Online payment is not configured yet."}, status=503)

    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        mark_order_failed(order)
        return JsonResponse({'success': False, 'message': "Payment verification failed. Please try again."}, status=400)

    order.razorpay_payment_id = razorpay_payment_id
    order.razorpay_signature = razorpay_signature
    order.save(update_fields=['razorpay_payment_id', 'razorpay_signature', 'updated_at'])

    cart = get_existing_cart(request)
    try:
        finalize_paid_order(order, cart)
    except CheckoutError as exc:
        mark_order_failed(order)
        return JsonResponse({'success': False, 'message': str(exc)}, status=400)

    return JsonResponse({'success': True, 'redirect_url': f"/order-successful/?order={order.order_number}"})


@require_POST
def checkout_payment_failed(request):
    """Razorpay's own `payment.failed` widget event lands here so a Failed
    order isn't left silently Pending forever. Stock/cart are untouched.
    """
    order_number = request.POST.get('order_number')
    order = Order.objects.filter(order_number=order_number).first()
    if order and order.payment_status != Order.PAYMENT_PAID:
        mark_order_failed(order)
    return JsonResponse({'success': True})


def contact(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            Contact.objects.create(
                full_name=form.cleaned_data['fullName'],
                email=form.cleaned_data['emailAddress'],
                phone_number=form.cleaned_data['phoneNumber'],
                subject=form.cleaned_data['subject'],
                message=form.cleaned_data['message'],
            )
            messages.success(
                request,
                "Thank you for contacting SoulStones. We have received your "
                "message successfully. Our team will get back to you as soon as possible."
            )

            Thread(target=send_contact_email, args=(form.cleaned_data,)).start()
            return redirect('contact')
    else:
        form = ContactForm()
    return render(request, 'contact.html', {'form': form})


@login_required
def my_orders(request):
    orders = (
        Order.objects.filter(user=request.user)
        .prefetch_related('items', 'items__product')
        .order_by('-created_at')
    )
    return render(request, 'my-orders.html', {'orders': orders})


def order_successful(request):
    order_number = request.GET.get('order')
    order = None
    if order_number:
        order_qs = Order.objects.filter(order_number=order_number).prefetch_related('items')
        if request.user.is_authenticated:
            order = order_qs.filter(user=request.user).first()
        else:
            order = order_qs.filter(session_key=request.session.session_key).first()
    if not order:
        messages.info(request, "We couldn't find that order.")
        return redirect('index')
    return render(request, 'order-successful.html', {'order': order})


def _user_owns_order(request, order):
    if request.user.is_staff:
        return True
    if request.user.is_authenticated:
        return order.user_id == request.user.id
    return bool(order.session_key) and order.session_key == request.session.session_key


def order_invoice(request, order_number):
    """Serves a PDF invoice generated on the fly (never stored on disk).
    Ownership is checked the same way as order_successful — by user for
    logged-in accounts, by session_key for guests — plus a staff bypass for
    the admin download column. Both "no such order" and "not yours" return
    the same generic 403 so order numbers can't be probed. Invoices only
    exist once an order is actually paid.
    """
    order = Order.objects.filter(order_number=order_number).prefetch_related('items', 'items__product').first()
    if not order or order.payment_status != Order.PAYMENT_PAID or not _user_owns_order(request, order):
        return HttpResponseForbidden("You do not have permission to access this invoice.")

    pdf_bytes = render_invoice_pdf(order)
    response = HttpResponse(pdf_bytes, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{invoice_filename(order)}"'
    return response


def ourstory(request):
    return render(request, 'ourstory.html')


def privacy_policy(request):
    return render(request, 'privacy-policy.html')


def shipping_return_policy(request):
    return render(request, 'shipping-return-policy.html')


def terms_and_conditions(request):
    return render(request, 'terms-and-conditions.html')


def product_detail(request, slug):
    product = get_object_or_404(
        Product.objects.select_related('category'),
        slug=slug,
        is_active=True,
    )

    gallery_images = product.images.all()

    related_products = (
        Product.objects.filter(category=product.category, is_active=True)
        .exclude(pk=product.pk)
        .select_related('category')
        .order_by('?')[:4]
    )

    context = {
        'product': product,
        'gallery_images': gallery_images,
        'related_products': related_products,
    }
    return render(request, 'product-detail.html', context)


def _parse_price_range(value):
    try:
        low, high = value.split('-', 1)
        return Decimal(low), Decimal(high)
    except (ValueError, InvalidOperation):
        return None


def _products_hero_title(selected_categories):
    """Products page hero title: the site default with no category filter,
    the category's own name when exactly one is selected, or a generic
    label once more than one is active (never lists every name).
    """
    if not selected_categories:
        return "Our Collection"
    if len(selected_categories) > 1:
        return "Filtered Collection"
    category = Category.objects.filter(slug=selected_categories[0]).first()
    return f"{category.name} Collection" if category else "Our Collection"


def products(request):
    search_query = request.GET.get('search', '').strip()
    selected_categories = request.GET.getlist('category')
    selected_availability = request.GET.getlist('availability')
    selected_price = request.GET.getlist('price')

    sort = request.GET.get('sort', 'featured')
    if sort not in SORT_OPTIONS:
        sort = 'featured'

    products_qs = Product.objects.filter(is_active=True).select_related('category')

    if search_query:
        products_qs = products_qs.filter(
            Q(name__icontains=search_query) | Q(subtitle__icontains=search_query)
        )

    if selected_categories:
        products_qs = products_qs.filter(category__slug__in=selected_categories)

    if selected_availability:
        availability_q = Q()
        if 'in_stock' in selected_availability:
            availability_q |= Q(stock__gt=0)
        if 'out_of_stock' in selected_availability:
            availability_q |= Q(stock=0)
        products_qs = products_qs.filter(availability_q)

    if selected_price:
        price_q = Q()
        has_valid_range = False
        for raw_range in selected_price:
            parsed = _parse_price_range(raw_range)
            if parsed is None:
                continue
            low, high = parsed
            price_q |= Q(new_price__gte=low, new_price__lte=high)
            has_valid_range = True
        if has_valid_range:
            products_qs = products_qs.filter(price_q)

    products_qs = products_qs.order_by(*SORT_OPTIONS[sort])

    paginator = Paginator(products_qs, PRODUCTS_PER_PAGE)
    page_obj = paginator.get_page(request.GET.get('page'))

    base_query = request.GET.copy()
    base_query.pop('page', None)
    base_querystring = base_query.urlencode()

    context = {
        'products': page_obj.object_list,
        'page_obj': page_obj,
        'paginator': paginator,
        'is_paginated': page_obj.has_other_pages(),
        'sort': sort,
        'base_querystring': base_querystring,
    }

    hero_title = _products_hero_title(selected_categories)

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        html = render_to_string('partials/product_grid.html', context, request=request)
        return JsonResponse({'html': html, 'count': paginator.count, 'hero_title': hero_title})

    context.update({
        'search_query': search_query,
        'selected_categories': selected_categories,
        'selected_availability': selected_availability,
        'selected_price': selected_price,
        'hero_title': hero_title,
    })
    return render(request, 'product.html', context)


def track_order(request):
    orders = None
    searched_email = ''
    if request.method == 'POST':
        searched_email = request.POST.get('email', '').strip()
        if searched_email:
            orders = (
                Order.objects.filter(email__iexact=searched_email)
                .prefetch_related('items', 'items__product')
                .order_by('-created_at')
            )
    return render(request, 'track-order.html', {
        'orders': orders,
        'searched': request.method == 'POST',
        'searched_email': searched_email,
    })


def _cart_error(request, message, status=400):
    return JsonResponse(
        {'success': False, 'message': message, 'cart': serialize_cart(get_existing_cart(request))},
        status=status,
    )


@require_GET
def cart_data(request):
    return JsonResponse({'success': True, 'cart': serialize_cart(get_existing_cart(request))})


@require_POST
def cart_add(request):
    slug = request.POST.get('slug')
    try:
        quantity = int(request.POST.get('quantity', 1))
    except (TypeError, ValueError):
        quantity = 1
    quantity = max(1, quantity)

    product = Product.objects.filter(slug=slug, is_active=True).first()
    if not product:
        return _cart_error(request, "Product not found.", status=404)

    if product.stock <= 0:
        return _cart_error(request, f"{product.name} is out of stock.")

    cart = get_or_create_cart(request)
    existing_item = CartItem.objects.filter(cart=cart, product=product).first()
    current_quantity = existing_item.quantity if existing_item else 0
    new_quantity = current_quantity + quantity

    if new_quantity > product.stock:
        remaining = max(product.stock - current_quantity, 0)
        if remaining:
            return _cart_error(request, f"Only {remaining} more of {product.name} can be added (stock limit reached).")
        return _cart_error(request, f"You already have the maximum available stock of {product.name} in your cart.")

    if existing_item:
        existing_item.quantity = new_quantity
        existing_item.save()
    else:
        CartItem.objects.create(cart=cart, product=product, quantity=new_quantity)

    return JsonResponse({
        'success': True,
        'message': f"{product.name} added to cart.",
        'cart': serialize_cart(cart),
    })


@require_POST
def cart_increase(request):
    slug = request.POST.get('slug')
    cart = get_or_create_cart(request)
    item = CartItem.objects.filter(cart=cart, product__slug=slug).select_related('product').first()
    if not item:
        return _cart_error(request, "Item not found in cart.", status=404)

    if item.quantity + 1 > item.product.stock:
        return _cart_error(request, f"Only {item.product.stock} of {item.product.name} left in stock.")

    item.quantity += 1
    item.save()

    return JsonResponse({'success': True, 'message': "Quantity updated.", 'cart': serialize_cart(cart)})


@require_POST
def cart_decrease(request):
    slug = request.POST.get('slug')
    cart = get_or_create_cart(request)
    item = CartItem.objects.filter(cart=cart, product__slug=slug).first()
    if not item:
        return _cart_error(request, "Item not found in cart.", status=404)

    item.quantity -= 1
    if item.quantity <= 0:
        item.delete()
        message = "Item removed."
    else:
        item.save()
        message = "Quantity updated."

    return JsonResponse({'success': True, 'message': message, 'cart': serialize_cart(cart)})


@require_POST
def cart_remove(request):
    slug = request.POST.get('slug')
    cart = get_or_create_cart(request)
    CartItem.objects.filter(cart=cart, product__slug=slug).delete()
    return JsonResponse({'success': True, 'message': "Item removed.", 'cart': serialize_cart(cart)})