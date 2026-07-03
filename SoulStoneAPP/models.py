from django.db import models

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