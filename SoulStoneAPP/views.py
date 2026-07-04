from decimal import Decimal, InvalidOperation

from django.contrib import messages
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string

from .forms import ContactForm, LoginForm, RegisterForm
from .models import Contact, Product
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
                auth_login(request, login_form.cleaned_data['user'])
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
    return render(request, 'checkout.html')


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