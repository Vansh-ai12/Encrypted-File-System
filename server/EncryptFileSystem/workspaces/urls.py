from django.urls import path
from .views import workspace_list_create, workspace_detail

urlpatterns = [
    path("", workspace_list_create, name="workspace-list-create"),

    path("<int:id>/", workspace_detail, name="workspace-detail"),

]