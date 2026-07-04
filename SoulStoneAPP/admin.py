from django.contrib import admin
from unfold.admin import ModelAdmin, StackedInline, TabularInline

from .models import *


@admin.register(Contact)
class ContactAdmin(ModelAdmin):
    list_display = ("full_name", "email", "phone_number", "subject", "created_at")
    list_filter = ("subject", "created_at")
    search_fields = ("full_name", "email", "phone_number", "message")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ("name", "slug", "description")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}


class ProductImageInline(TabularInline):
    model = ProductImage
    extra = 1


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    prepopulated_fields = {"slug": ("name",)}
    list_display = (
        "name",
        "category",
        "new_price",
        "stock",
        "is_active",
        "is_featured",
        "created_at",
    )
    list_filter = ("category", "is_active", "is_featured", "is_certified")
    search_fields = ("name", "subtitle")
    ordering = ("-created_at",)
    inlines = [ProductImageInline]


@admin.register(UserProfile)
class UserProfileAdmin(ModelAdmin):
    list_display = ("user", "email", "mobile_number")
    search_fields = ("user__username", "user__email", "mobile_number")

    @admin.display(description="Email")
    def email(self, obj):
        return obj.user.email