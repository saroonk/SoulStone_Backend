from datetime import timedelta

from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone
from ckeditor_uploader.fields import RichTextUploadingField

# Create your models here.


class Contact(models.Model):
    SUBJECT_CHOICES = [
        ("general", "General inquiry"),
        ("stone-guidance", "Stone guidance"),
        ("existing-order", "Existing order"),
        ("wholesale", "Wholesale enquiry"),
        ("other", "Other"),
    ]

    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone_number = models.CharField(max_length=20, blank=True)
    subject = models.CharField(max_length=30, choices=SUBJECT_CHOICES, blank=True)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.email})"






from django.utils.text import slugify


class Category(models.Model):
    image = models.ImageField(upload_to="categories/")
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Category"
        verbose_name_plural = "Categories"

    def save(self, *args, **kwargs):
        self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="products"
    )
    name = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    subtitle = models.CharField(max_length=200, blank=True)
    short_description = models.TextField(blank=True)
    description_and_benefits = RichTextUploadingField()
    certification_authenticity = RichTextUploadingField()
    stone_origin = RichTextUploadingField()
    new_price = models.DecimalField(max_digits=10, decimal_places=2)
    old_price = models.DecimalField(max_digits=10, decimal_places=2)
    main_image = models.ImageField(upload_to="products/")
    is_certified = models.BooleanField(default=False)
    stock = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def discount_percentage(self):
        if not self.old_price:
            return 0
        return round((self.old_price - self.new_price) / self.old_price * 100)

    @property
    def is_new(self):
        return self.created_at >= timezone.now() - timedelta(days=7)

    @property
    def in_stock(self):
        return self.stock > 0

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="products/gallery/")
    alt_text = models.CharField(max_length=150, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order"]

    def __str__(self):
        return f"{self.product.name} - image {self.display_order}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    mobile_number = models.CharField(max_length=15, unique=True, null=True, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.mobile_number})"


class Cart(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="cart", null=True, blank=True, unique=True
    )
    session_key = models.CharField(max_length=40, null=True, blank=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())

    @property
    def subtotal(self):
        return sum(item.line_total for item in self.items.all())

    def __str__(self):
        return f"Cart #{self.pk} ({self.user or self.session_key})"


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("cart", "product")

    @property
    def line_total(self):
        return self.product.new_price * self.quantity

    def save(self, *args, **kwargs):
        # Belt-and-suspenders: no code path (view, admin, merge, shell) may
        # ever persist a CartItem with quantity < 1. Callers that would
        # reduce it to zero should delete the row instead of saving it.
        if self.quantity < 1:
            raise ValueError("CartItem quantity must be at least 1; delete the row instead of saving 0.")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"


def generate_order_number():
    """SS + year + a 5-digit sequence, e.g. SS202600001. Retried on collision
    by the caller (order_number is unique), so this only needs to be close."""
    prefix = f"SS{timezone.now().year}"
    last = (
        Order.objects.filter(order_number__startswith=prefix)
        .order_by("-order_number")
        .values_list("order_number", flat=True)
        .first()
    )
    next_seq = int(last[len(prefix):]) + 1 if last else 1
    return f"{prefix}{next_seq:05d}"


class Order(models.Model):
    PAYMENT_PENDING = "pending"
    PAYMENT_PAID = "paid"
    PAYMENT_FAILED = "failed"
    PAYMENT_REFUNDED = "refunded"
    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_PENDING, "Pending"),
        (PAYMENT_PAID, "Paid"),
        (PAYMENT_FAILED, "Failed"),
        (PAYMENT_REFUNDED, "Refunded"),
    ]

    STATUS_PENDING = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_SHIPPED = "shipped"
    STATUS_DELIVERED = "delivered"
    STATUS_CANCELLED = "cancelled"
    STATUS_RETURNED = "returned"
    ORDER_STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_SHIPPED, "Shipped"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_RETURNED, "Returned"),
    ]

    # Badge class already defined in my-orders.css for each order_status.
    STATUS_BADGE_CLASS = {
        STATUS_PENDING: "mo-status--processing",
        STATUS_CONFIRMED: "mo-status--confirmed",
        STATUS_SHIPPED: "mo-status--shipped",
        STATUS_DELIVERED: "mo-status--delivered",
        STATUS_CANCELLED: "mo-status--cancelled",
        STATUS_RETURNED: "mo-status--returned",
    }

    # Customer information
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="orders")
    session_key = models.CharField(max_length=40, null=True, blank=True)
    order_number = models.CharField(max_length=20, unique=True, editable=False)
    full_name = models.CharField(max_length=150)
    email = models.EmailField()
    mobile_number = models.CharField(max_length=15)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    country = models.CharField(max_length=100, default="India")
    pincode = models.CharField(max_length=10)

    # Order information
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default=PAYMENT_PENDING)
    order_status = models.CharField(max_length=10, choices=ORDER_STATUS_CHOICES, default=STATUS_PENDING)
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_signature = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = generate_order_number()
        super().save(*args, **kwargs)

    @property
    def status_badge_class(self):
        return self.STATUS_BADGE_CLASS.get(self.order_status, "mo-status--processing")

    @property
    def estimated_delivery(self):
        # Demo calculation, as explicitly allowed: 5 business-ish days out.
        return self.created_at + timedelta(days=5)

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    product_name = models.CharField(max_length=200)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"


class Testimonial(models.Model):
    RATING_1 = 1
    RATING_2 = 2
    RATING_3 = 3
    RATING_4 = 4
    RATING_5 = 5
    RATING_CHOICES = [
        (RATING_1, "⭐ 1 Star"),
        (RATING_2, "⭐⭐ 2 Stars"),
        (RATING_3, "⭐⭐⭐ 3 Stars"),
        (RATING_4, "⭐⭐⭐⭐ 4 Stars"),
        (RATING_5, "⭐⭐⭐⭐⭐ 5 Stars"),
    ]

    reviewer_name = models.CharField(max_length=150)
    product_purchased = models.CharField(max_length=200)
    review = models.TextField()
    rating = models.PositiveSmallIntegerField(choices=RATING_CHOICES, default=RATING_5)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def star_display(self):
        return "★" * self.rating + "☆" * (5 - self.rating)

    def __str__(self):
        return f"{self.reviewer_name} — {self.rating}★"