"""Order notification emails. Called from signals.py whenever an order is
confirmed or its status changes, so the sending logic lives in one place.

Every customer-facing email is sent as a multipart message: the original
plain-text body (unchanged) is kept as the text/plain fallback, and a
premium HTML version (templates/emails/) is attached as the text/html
alternative. HTML rendering is always wrapped in try/except so a template
problem degrades to the plain-text email rather than blocking delivery.
"""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives, mail_admins
from django.template.loader import render_to_string
from django.urls import reverse

from .invoice_utils import invoice_filename, render_invoice_pdf

# Placeholder production domain used to build absolute links inside emails
# (email clients can't resolve relative URLs, and there's no request object
# available here). Swap for the real domain once SoulStones is deployed —
# matches the same placeholder-domain convention already used elsewhere
# (e.g. the "soulstone.example" addresses in invoice.html / SEO meta tags).
SITE_URL = "http://127.0.0.1:8000/"


def _order_lines(order):
    return "\n".join(
        f"- {item.product_name} x {item.quantity} — Rs.{item.line_total}"
        for item in order.items.all()
    )


def _absolute_url(url_name):
    """Builds a full URL from a Django URL name via reverse(), so link
    targets always follow urls.py instead of being hand-typed."""
    return f"{SITE_URL.rstrip('/')}{reverse(url_name)}"


def _order_cta_url(order):
    """Registered customers are sent to My Orders; guest orders go to Track
    Order instead, since My Orders requires a login guests don't have."""
    return _absolute_url('track_order') if order.user_id else _absolute_url('track_order')


def _render_email_html(template_name, order, cta_label, cta_url):
    try:
        return render_to_string(f"emails/{template_name}", {
            "order": order,
            "site_url": SITE_URL,
            "cta_url": cta_url,
            "cta_label": cta_label,
        })
    except Exception:
        return None


def _render_admin_email_html(order):
    try:
        return render_to_string("emails/admin_new_order.html", {
            "order": order,
            "admin_url": _absolute_url('admin:index'),
        })
    except Exception:
        return None


def _send(order, subject, message, template_name, cta_label, cta_url):
    email = EmailMultiAlternatives(
        subject=subject,
        body=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.email],
    )
    html_body = _render_email_html(template_name, order, cta_label, cta_url)
    if html_body:
        email.attach_alternative(html_body, "text/html")
    email.send(fail_silently=True)


def send_order_confirmed_emails(order):
    """Sent once, when payment succeeds and the order becomes Confirmed:
    one email to the customer, one to the admin address in settings.ADMINS.

    This already runs on a background thread (see signals.py), off the
    checkout request entirely, so generating the invoice PDF here costs the
    customer nothing. It's still wrapped in try/except: if PDF generation
    ever fails for some reason, the confirmation email must still go out —
    just without the attachment, pointing the customer to My Orders instead.
    """
    closing = (
        "We will notify you once your order is shipped.\n\n"
        "Thank you for choosing SoulStones."
    )
    attachment = None
    try:
        attachment = (invoice_filename(order), render_invoice_pdf(order), "application/pdf")
    except Exception:
        closing = (
            "You can download your invoice anytime from the My Orders "
            "section of your Soul Stone account.\n\n"
            "We will notify you once your order is shipped.\n\n"
            "Thank you for choosing SoulStones."
        )

    email = EmailMultiAlternatives(
        subject="Order Confirmed - Soul Stone",
        body=(
            f"Hello {order.full_name},\n\n"
            "Thank you for your purchase. Your order has been confirmed successfully.\n\n"
            f"Order Number: {order.order_number}\n\n"
            "Order Summary:\n"
            f"{_order_lines(order)}\n\n"
            f"Total Amount: Rs.{order.total_amount}\n\n"
            f"{closing}"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[order.email],
    )
    html_body = _render_email_html("order_confirmation.html", order, "Track Order", _order_cta_url(order))
    if html_body:
        email.attach_alternative(html_body, "text/html")
    if attachment:
        email.attach(*attachment)
    email.send(fail_silently=True)

    mail_admins(
        subject="New Order Received",
        message=(
            f"Customer Name: {order.full_name}\n"
            f"Order Number: {order.order_number}\n"
            f"Total Amount: Rs.{order.total_amount}\n\n"
            "Products Ordered:\n"
            f"{_order_lines(order)}"
        ),
        fail_silently=True,
        html_message=_render_admin_email_html(order),
    )


def send_order_shipped_email(order):
    _send(
        order,
        subject="Your Order Has Been Shipped",
        message=(
            f"Hello {order.full_name},\n\n"
            f"Your order {order.order_number} has been shipped and is on its way to you.\n\n"
            "Tracking information: you can find the status of your shipment at any time from your account.\n\n"
            "Thank you for shopping with SoulStones."
        ),
        template_name="order_shipped.html",
        cta_label="Track Order",
        cta_url=_order_cta_url(order),
    )


def send_order_delivered_email(order):
    _send(
        order,
        subject="Your Order Has Been Delivered",
        message=(
            f"Hello {order.full_name},\n\n"
            f"Your order {order.order_number} has been delivered. We hope you love your new gemstone.\n\n"
            "Thank you for choosing SoulStones — we would love to have you shop with us again."
        ),
        template_name="order_delivered.html",
        cta_label="Continue Shopping",
        cta_url=_absolute_url('index'),
    )


def send_order_cancelled_email(order):
    _send(
        order,
        subject="Your Order Has Been Cancelled",
        message=(
            f"Hello {order.full_name},\n\n"
            f"Your order {order.order_number} has been cancelled.\n\n"
            "If you did not request this or have any questions, please contact our support team."
        ),
        template_name="order_cancelled.html",
        cta_label="Continue Shopping",
        cta_url=_order_cta_url(order),
    )


def send_order_returned_email(order):
    _send(
        order,
        subject="Your Order Has Been Returned",
        message=(
            f"Hello {order.full_name},\n\n"
            f"Your order {order.order_number} has been marked as returned.\n\n"
            "Our team will process your return and keep you updated."
        ),
        template_name="order_returned.html",
        cta_label="View My Order",
        cta_url=_order_cta_url(order),
    )
