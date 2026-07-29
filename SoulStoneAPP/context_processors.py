from django.conf import settings
from django.db.models import Prefetch

from .cart_utils import get_existing_cart
from .models import Category, CollectionType, SubCategory


def categories(request):
    """Feeds the navbar's Collections mega-menu (Category -> SubCategory ->
    CollectionType) as well as the products page's category filter sidebar.
    Prefetched with to_attr so the nested nav.html loops don't issue a query
    per category/subcategory.
    """
    active_collection_types = CollectionType.objects.filter(is_active=True)
    subcategories_with_collection_types = SubCategory.objects.prefetch_related(
        Prefetch("collection_types", queryset=active_collection_types, to_attr="active_collection_types")
    )
    categories_with_hierarchy = Category.objects.prefetch_related(
        Prefetch("subcategories", queryset=subcategories_with_collection_types, to_attr="nav_subcategories")
    )
    return {"categories": categories_with_hierarchy}


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
