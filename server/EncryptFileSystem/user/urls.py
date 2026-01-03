
from django.urls import path,include

from . import views

urlpatterns = [
    path('signup/',views.signUp, name='Sign_Up'),
    path('login/',views.login, name='login'),
    path('logout/',views.logout, name='logout'),
    path("check/", views.check_session,name="check_session"),
    path("csrf/",views.csrf_bootstrap,name="csrf_bootstrap"),
]
