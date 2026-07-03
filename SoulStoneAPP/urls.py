


from django.urls import path
from . import views


urlpatterns = [
    path('', views.index, name='index'),
    path('login/', views.login, name='login'),
    path('checkout/', views.checkout, name='checkout'),
    path('contact/', views.contact, name='contact'),
    path('my-orders/', views.my_orders, name='my_orders'),
    path('order-successful/', views.order_successful, name='order_successful'),
    path('our-story/', views.ourstory, name='ourstory'),
    path('products/', views.products, name='products'),
    path('products/<slug:slug>/', views.product_detail, name='product_detail'),
    path('track-order/', views.track_order, name='track_order'),
]