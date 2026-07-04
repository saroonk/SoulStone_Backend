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


class CartItemInline(TabularInline):
    model = CartItem
    extra = 0


@admin.register(Cart)
class CartAdmin(ModelAdmin):
    list_display = ("id", "user", "session_key", "total_items", "updated_at")
    list_filter = ("updated_at",)
    search_fields = ("user__username", "user__email", "session_key")
    inlines = [CartItemInline]

    @admin.display(description="Total Items")
    def total_items(self, obj):
        return obj.total_items


@admin.register(CartItem)
class CartItemAdmin(ModelAdmin):
    list_display = ("cart", "product", "quantity", "updated_at")
    list_filter = ("updated_at",)
    search_fields = ("product__name", "cart__user__username", "cart__session_key")