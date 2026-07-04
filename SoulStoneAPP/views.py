from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.views.decorators.http import require_GET, require_POST

from .cart_utils import get_existing_cart, get_or_create_cart, merge_guest_cart_into_user, serialize_cart
from .forms import ContactForm, LoginForm, RegisterForm
from .models import CartItem, Contact, Product
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
    return render(request, 'index.html', {
        'latest_products': latest_products,
        'collection_products': collection_products,
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

    return render(request, 'checkout.html', {
        'cart_items': items,
        'cart_subtotal': subtotal,
        'cart_total': subtotal,
    })


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


def my_orders(request):
    return render(request, 'my-orders.html')


def order_successful(request):
    return render(request, 'order-successful.html')


def ourstory(request):
    return render(request, 'ourstory.html')


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

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        html = render_to_string('partials/product_grid.html', context, request=request)
        return JsonResponse({'html': html, 'count': paginator.count})

    context.update({
        'search_query': search_query,
        'selected_categories': selected_categories,
        'selected_availability': selected_availability,
        'selected_price': selected_price,
    })
    return render(request, 'product.html', context)


def track_order(request):
    return render(request, 'track-order.html')


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