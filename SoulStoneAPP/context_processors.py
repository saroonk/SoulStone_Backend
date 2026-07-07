from django.conf import settings

from .cart_utils import get_existing_cart
from .models import Category


def categories(request):
    return {"categories": Category.objects.all()}


def whatsapp(request):
    """Centralizes the WhatsApp number used by every "consult-band" advisor
    section, so changing SoulStones.settings.WHATSAPP_NUMBER once updates
    every WhatsApp button across the site.
    """
    return {"whatsapp_number": settings.WHATSAPP_NUMBER}


def cart(request):
    """Makes the cart badge count available on every page without every
    view having to query it. Read-only: doesn't create a Cart row just
    because a page was viewed.
    """
    current_cart = get_existing_cart(request)
    count = current_cart.total_items if current_cart else 0
    return {"cart_count": count}
