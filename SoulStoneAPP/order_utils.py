"""Checkout/order business logic, kept out of views.py so the views stay
thin. Two entry points matter to callers:

- create_pending_order(request, form): validates the cart and stock, then
  creates a Pending Order + OrderItem snapshot. Call inside transaction.atomic().
- finalize_paid_order(order): called only after Razorpay signature
  verification succeeds — re-validates and reduces stock, marks the order
  Paid/Confirmed, and clears the cart it came from.
"""
from django.db import IntegrityError, transaction

from .cart_utils import get_existing_cart
from .models import Order, OrderItem, Product


class CheckoutError(Exception):
    """Raised with a message that is safe to show directly to the customer."""


def _validate_locked_cart_items(cart):
    """Must be called inside transaction.atomic(). Locks the cart's products
    (not the cart/cart-item rows themselves) and checks each is still active
    and in stock, returning the cart items with fresh, locked product
    instances attached.
    """
    cart_items = list(cart.items.select_related("product").all())
    if not cart_items:
        raise CheckoutError("Your cart is empty.")

    product_ids = [item.product_id for item in cart_items]
    locked_products = {
        product.pk: product
        for product in Product.objects.select_for_update().filter(pk__in=product_ids)
    }

    for item in cart_items:
        product = locked_products.get(item.product_id)
        if product is None or not product.is_active:
            name = item.product.name if item.product else "A product in your cart"
            raise CheckoutError(f"{name} is no longer available.")
        if item.quantity > product.stock:
            raise CheckoutError(f"Only {product.stock} of {product.name} left in stock.")
        item.product = product

    return cart_items


def create_pending_order(request, form):
    """Validates the current cart/stock and creates a Pending Order with its
    OrderItem snapshot, all inside one transaction so the stock lock taken
    during validation is held until the order is safely written. Returns
    (order, cart). Raises CheckoutError if the cart is empty or any product
    fails validation.
    """
    cart = get_existing_cart(request)
    if not cart:
        raise CheckoutError("Your cart is empty.")

    data = form.cleaned_data
    order_kwargs = dict(
        user=request.user if request.user.is_authenticated else None,
        session_key=None if request.user.is_authenticated else request.session.session_key,
        full_name=data["billingName"],
        email=data["billingEmail"],
        mobile_number=data["billingPhone"],
        address_line1=data["addressLine1"],
        address_line2=data.get("addressLine2", ""),
        city=data["city"],
        state=data["state"],
        country=data["country"],
        pincode=data["pinCode"],
    )

    order = None
    for _attempt in range(5):
        try:
            with transaction.atomic():
                cart_items = _validate_locked_cart_items(cart)
                total_amount = sum(item.quantity * item.product.new_price for item in cart_items)
                order = Order.objects.create(total_amount=total_amount, **order_kwargs)
                OrderItem.objects.bulk_create([
                    OrderItem(
                        order=order,
                        product=item.product,
                        product_name=item.product.name,
                        product_price=item.product.new_price,
                        quantity=item.quantity,
                        line_total=item.quantity * item.product.new_price,
                    )
                    for item in cart_items
                ])
        except IntegrityError:
            continue  # order_number collision (rare); Order.save() regenerates it
        else:
            break
    if order is None:
        raise CheckoutError("Could not create your order. Please try again.")

    return order, cart


def finalize_paid_order(order, cart):
    """Only called once Razorpay has confirmed payment. Re-validates stock
    (another order may have used it up while payment was in progress),
    reduces it, marks the order Paid/Confirmed, and clears the cart.
    """
    with transaction.atomic():
        order_items = list(order.items.select_related("product"))
        product_ids = [item.product_id for item in order_items if item.product_id]
        locked_products = {
            product.pk: product
            for product in Product.objects.select_for_update().filter(pk__in=product_ids)
        }

        for item in order_items:
            product = locked_products.get(item.product_id)
            if product is None:
                continue
            if item.quantity > product.stock:
                raise CheckoutError(f"Only {product.stock} of {product.name} left in stock.")

        for item in order_items:
            product = locked_products.get(item.product_id)
            if product is None:
                continue
            product.stock -= item.quantity
            product.save(update_fields=["stock"])

        order.payment_status = Order.PAYMENT_PAID
        order.order_status = Order.STATUS_CONFIRMED
        order.save()

        if cart is not None:
            cart.items.all().delete()


def mark_order_failed(order):
    order.payment_status = Order.PAYMENT_FAILED
    order.save(update_fields=["payment_status", "updated_at"])
