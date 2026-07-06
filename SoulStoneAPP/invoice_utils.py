"""PDF invoice generation, kept out of views.py so the same renderer can be
reused by the customer/admin download endpoints and the confirmation email.

Invoices are never written to disk: every call renders templates/invoice.html
straight from the Order/OrderItem rows into an in-memory PDF (xhtml2pdf is a
pure-Python HTML->PDF converter, so it needs no native system libraries).
"""
import base64
from io import BytesIO

from django.template.loader import render_to_string
from django.utils import timezone
from PIL import Image
from xhtml2pdf import pisa

THUMB_SIZE = (110, 110)


def _product_image_data_uri(product):
    """Best-effort inline thumbnail for the invoice table. Returns None if
    the product or its image is missing/unreadable — the invoice must never
    fail to generate just because one product photo can't be embedded.
    """
    if not product or not product.main_image:
        return None
    try:
        with Image.open(product.main_image.path) as img:
            img = img.convert("RGB")
            img.thumbnail(THUMB_SIZE)
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
            return f"data:image/png;base64,{encoded}"
    except Exception:
        return None


def render_invoice_pdf(order):
    """Render the invoice template for this order and return the finished PDF as bytes."""
    items = list(order.items.select_related("product").all())
    for item in items:
        item.invoice_image = _product_image_data_uri(item.product)

    html = render_to_string("invoice.html", {
        "order": order,
        "items": items,
        "invoice_date": order.created_at or timezone.now(),
    })

    buffer = BytesIO()
    pisa.CreatePDF(src=html, dest=buffer, encoding="utf-8")
    return buffer.getvalue()


def invoice_filename(order):
    return f"Invoice-{order.order_number}.pdf"
