from django.contrib import messages
from django.shortcuts import redirect, render

from .forms import ContactForm
from .models import Contact
from django.core.mail import send_mail
from threading import Thread

from django.conf import settings
# Create your views here.







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
    return render(request, 'index.html')


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


def product_detail(request):
    return render(request, 'product-detail.html')


def products(request):
    return render(request, 'product.html')


def track_order(request):
    return render(request, 'track-order.html')