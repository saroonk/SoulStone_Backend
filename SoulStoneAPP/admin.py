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


class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product", "product_name", "product_price", "quantity", "line_total")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = (
        "order_number",
        "full_name",
        "total_amount",
        "payment_status",
        "order_status",
        "created_at",
    )
    list_filter = ("order_status", "payment_status", "created_at")
    search_fields = ("order_number", "full_name", "email", "mobile_number", "razorpay_order_id", "razorpay_payment_id")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_editable = ("order_status",)
    readonly_fields = (
        "order_number",
        "user",
        "session_key",
        "total_amount",
        "razorpay_order_id",
        "razorpay_payment_id",
        "razorpay_signature",
        "created_at",
        "updated_at",
    )
    inlines = [OrderItemInline]
    fieldsets = (
        ("Order", {"fields": ("order_number", "user", "session_key", "order_status", "payment_status", "total_amount")}),
        ("Customer", {"fields": ("full_name", "email", "mobile_number")}),
        ("Shipping Address", {"fields": ("address_line1", "address_line2", "city", "state", "country", "pincode")}),
        ("Razorpay", {"fields": ("razorpay_order_id", "razorpay_payment_id", "razorpay_signature")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    list_display = ("order", "product_name", "quantity", "product_price", "line_total")
    search_fields = ("order__order_number", "product_name")
    list_filter = ("order__order_status",)