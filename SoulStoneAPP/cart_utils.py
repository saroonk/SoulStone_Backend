"""Reusable cart logic shared by the cart AJAX views, the checkout view,
and the cart context processor, so cart rules live in exactly one place.
"""
from .models import Cart


def get_existing_cart(request):
    """Read-only lookup: returns the current cart, or None if none exists yet.

    Used by the context processor so anonymous visitors who never add
    anything don't get an empty Cart row created on every page view.
    """
    if request.user.is_authenticated:
        return Cart.objects.filter(user=request.user).first()

    session_key = request.session.session_key
    if not session_key:
        return None
    return Cart.objects.filter(session_key=session_key, user=None).first()


def get_or_create_cart(request):
    """Returns the cart for this request, creating it (and a session, for
    guests) if it doesn't exist yet. Use this from views that mutate the cart.
    """
    if request.user.is_authenticated:
        cart, _ = Cart.objects.get_or_create(user=request.user)
        return cart

    if not request.session.session_key:
        request.session.create()
    session_key = request.session.session_key
    cart, _ = Cart.objects.get_or_create(session_key=session_key, user=None)
    return cart


def merge_guest_cart_into_user(session_key, user):
    """Called right after login. Moves items from the guest session's cart
    into the user's cart: quantities are combined for shared products,
    other items are moved as-is, and the now-empty guest cart is deleted.
    """
    if not session_key:
        return

    try:
        guest_cart = Cart.objects.get(session_key=session_key, user=None)
    except Cart.DoesNotExist:
        return

    user_cart, _ = Cart.objects.get_or_create(user=user)

    for item in guest_cart.items.select_related("product").filter(quantity__gte=1):
        existing = user_cart.items.filter(product=item.product).first()
        if existing:
            existing.quantity += item.quantity
            existing.save(update_fields=["quantity", "updated_at"])
        else:
            item.cart = user_cart
            item.save(update_fields=["cart"])

    guest_cart.delete()


def serialize_cart(cart):
    """JSON-serializable snapshot of a cart, used by every cart AJAX response
    so the frontend can re-render the drawer/badge/totals from one payload.
    """
    if cart is None:
        return {"count": 0, "subtotal": "0.00", "items": []}

    items = cart.items.select_related("product", "product__category").all()
    return {
        "count": sum(item.quantity for item in items),
        "subtotal": str(cart.subtotal),
        "items": [
            {
                "slug": item.product.slug,
                "name": item.product.name,
                "meta": item.product.category.name if item.product.category else "",
                "image": item.product.main_image.url if item.product.main_image else "",
                "price": str(item.product.new_price),
                "quantity": item.quantity,
                "line_total": str(item.line_total),
                "stock": item.product.stock,
            }
            for item in items
        ],
    }
