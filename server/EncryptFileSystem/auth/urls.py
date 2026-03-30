from . import views
from django.urls import path,include

urlpatterns = [
    
    path("github/",views.addOrganisation,name="github"),
    path("google/",views.addOrganisation,name="google"),
    
]
