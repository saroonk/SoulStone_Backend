from datetime import timedelta

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