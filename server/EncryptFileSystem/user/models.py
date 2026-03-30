from django.db import models

# Create your models here.

class Users(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    token = models.CharField(max_length=255, blank=True, null=True)
    provider = models.CharField(max_length=50, null=True, blank=True) 
    provider_id = models.CharField(max_length=255, null=True, blank=True) 
    github_username = models.CharField(max_length=255, null=True, blank=True)
    activeOrganisation = models.ForeignKey(
    'boardOrganisation.OrganisationModel',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="active_users")



class LoginActivity(models.Model):
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.CharField(max_length=100, null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)




class SiteVisit(models.Model):
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    date = models.DateField(auto_now_add=True)
    duration = models.IntegerField(default=0)  # seconds

