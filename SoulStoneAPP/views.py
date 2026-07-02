from django.shortcuts import render

# Create your views here.



def index(request):
    return render(request, 'index.html')


def login(request):
    return render(request, 'login.html')


def checkout(request):
    return render(request, 'checkout.html')


def contact(request):
    return render(request, 'contact.html')


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