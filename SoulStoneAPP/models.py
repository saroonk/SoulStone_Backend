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
