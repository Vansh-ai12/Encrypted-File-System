
from django.urls import path,include

from . import views





urlpatterns = [
    path('signup/',views.signUp, name='Sign_Up'),
    path('login/',views.login, name='login'),
    path('logout/',views.logout, name='logout'),
    path("check/", views.check_session,name="check_session"),
    path("csrf/",views.csrf_bootstrap,name="csrf_bootstrap"),
    path("auth/github/", views.github_login),
    path("auth/github/callback/", views.github_callback),
    path("auth/google/", views.google_login),
    path("auth/google/callback/", views.google_callback),
    path("login-activity/", views.login_activity),
    path("track-visit/", views.track_visit),
    path("usage/", views.usage_stats),

]
