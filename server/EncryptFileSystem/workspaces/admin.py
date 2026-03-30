from django.contrib import admin

# Register your models here.
from .models import Workspace


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "created_at")