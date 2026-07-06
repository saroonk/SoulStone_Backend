from threading import Thread

from django.conf import settings
from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from . import emails
from .models import Order, UserProfile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)


# ------------------------------------------------------------------
# Order status emails. pre_save captures the status as it was in the DB
# before this save; post_save compares it to the new value and sends the
# matching email only when order_status actually changed, so calling
# order.save() repeatedly (or saving unrelated fields) never re-sends.
# ------------------------------------------------------------------
ORDER_STATUS_EMAILS = {
    Order.STATUS_CONFIRMED: emails.send_order_confirmed_emails,
    Order.STATUS_SHIPPED: emails.send_order_shipped_email,
    Order.STATUS_DELIVERED: emails.send_order_delivered_email,
    Order.STATUS_CANCELLED: emails.send_order_cancelled_email,
    Order.STATUS_RETURNED: emails.send_order_returned_email,
}


@receiver(pre_save, sender=Order)
def _capture_previous_order_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_order_status = None
        return
    try:
        instance._previous_order_status = Order.objects.get(pk=instance.pk).order_status
    except Order.DoesNotExist:
        instance._previous_order_status = None


@receiver(post_save, sender=Order)
def _send_order_status_email(sender, instance, created, **kwargs):
    previous_status = getattr(instance, "_previous_order_status", None)
    if previous_status == instance.order_status:
        return  # status didn't change on this save; never re-send

    send_email = ORDER_STATUS_EMAILS.get(instance.order_status)
    if not send_email:
        return

    # Emails must never add latency (or hold row locks) inside the checkout
    # request. transaction.on_commit() waits until the enclosing atomic
    # block (e.g. finalize_paid_order's stock update) has actually
    # committed — so we never email about an order that got rolled back —
    # and the real SMTP I/O then runs on a background thread, off the
    # request/response path entirely. Outside any atomic block (e.g. an
    # admin save), on_commit() just runs the callback immediately.
    def _send_in_background():
        Thread(target=send_email, args=(instance,), daemon=True).start()

    transaction.on_commit(_send_in_background)
