"""Order notification emails. Called from signals.py whenever an order is
confirmed or its status changes, so the sending logic lives in one place.
"""
from django.conf import settings
from django.core.mail import EmailMessage, mail_admins, send_mail

from .invoice_utils import invoice_filename, render_invoice_pdf


def _order_lines(order):
    return "\n".join(
        f"- {item.product_name} x {item.quantity} — Rs.{item.line_total}"
        for item in order.items.all()
    )


def _send(order, subject, message):
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.email],
        fail_silently=True,
    )


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

    email = EmailMessage(
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
    )


def send_order_shipped_email(order):
    _send(
        order,
        subject="Your Order Has Been Shipped",
        message=(
            f"Hello {order.full_name},\n\n"
            f"Your order {order.order_number} has been shipped and is on its way to you.\n\n"
            "Tracking information: your courier's tracking details will be shared shortly.\n\n"
            "Thank you for shopping with SoulStones."
        ),
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
    )
