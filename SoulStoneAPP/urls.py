


from django.urls import path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('checkout/', views.checkout, name='checkout'),
    path('checkout/create-order/', views.checkout_create_order, name='checkout_create_order'),
    path('checkout/verify-payment/', views.checkout_verify_payment, name='checkout_verify_payment'),
    path('checkout/payment-failed/', views.checkout_payment_failed, name='checkout_payment_failed'),
    path('cart/data/', views.cart_data, name='cart_data'),
    path('cart/add/', views.cart_add, name='cart_add'),
    path('cart/increase/', views.cart_increase, name='cart_increase'),
    path('cart/decrease/', views.cart_decrease, name='cart_decrease'),
    path('cart/remove/', views.cart_remove, name='cart_remove'),
    path('contact/', views.contact, name='contact'),
    path('my-orders/', views.my_orders, name='my_orders'),
    path('order-successful/', views.order_successful, name='order_successful'),
    path('orders/<str:order_number>/invoice/', views.order_invoice, name='order_invoice'),
    path('our-story/', views.ourstory, name='ourstory'),
    path('products/', views.products, name='products'),
    path('products/<slug:slug>/', views.product_detail, name='product_detail'),
    path('track-order/', views.track_order, name='track_order'),
]