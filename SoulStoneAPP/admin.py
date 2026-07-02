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