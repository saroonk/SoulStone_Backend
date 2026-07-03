from django.contrib import messages
from django.core.paginator import Paginator
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ContactForm
from .models import Contact, Product
from django.core.mail import send_mail
from threading import Thread

from django.conf import settings
# Create your views here.


PRODUCTS_PER_PAGE = 12

SORT_OPTIONS = {
    "newest": "-created_at",
    "oldest": "created_at",
    "price_low": "new_price",
    "price_high": "-new_price",
    "name_asc": "name",
    "name_desc": "-name",
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
    return render(request, 'index.html', {'latest_products': latest_products})


def login(request):
    return render(request, 'login.html')


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


def products(request):
    sort = request.GET.get('sort', 'newest')
    if sort not in SORT_OPTIONS:
        sort = 'newest'

    products_qs = (
        Product.objects.filter(is_active=True)
        .select_related('category')
        .order_by(SORT_OPTIONS[sort])
    )

    paginator = Paginator(products_qs, 20)
    page_obj = paginator.get_page(request.GET.get('page'))

    context = {
        'products': page_obj.object_list,
        'page_obj': page_obj,
        'paginator': paginator,
        'is_paginated': page_obj.has_other_pages(),
        'sort': sort,
    }
    return render(request, 'product.html', context)


def track_order(request):
    return render(request, 'track-order.html')