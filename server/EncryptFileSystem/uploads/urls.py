from django.urls import path
from . import views

urlpatterns = [
    path('', views.upload_file, name='upload_file'),
    path('view/', views.view_file, name='view_file'),
    path('list/', views.list_files, name='list_files'),   # ADD THIS LINE
    path('update/', views.update_file, name='update_file'),
    path('delete/', views.delete_file, name='delete_file'),
    path('download-cluster/', views.download_cluster, name='download_cluster'),
]