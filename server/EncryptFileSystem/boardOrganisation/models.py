import secrets
from django.db import models
import uuid
from user.models import Users

# Create your models here.


def generate_file_id():
    return secrets.token_hex(8)


class OrganisationModel(models.Model):
    organisationName = models.CharField(max_length=150)
    organisationId = models.CharField(max_length=100, unique=True, default=generate_file_id)
    slug = models.SlugField(unique=True)

    role = models.CharField(max_length=10,default="admin")
    createdAt = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(Users, on_delete=models.CASCADE)
    imgUrl = models.ImageField(upload_to='organisation_logos/', null=True, blank=True)





class memberDetailModel(models.Model):
    organisation = models.ForeignKey(OrganisationModel, on_delete=models.CASCADE)
    memberName = models.CharField(max_length = 40)
    role = models.CharField(max_length=10,default="member")
    memberInfo = models.ForeignKey(Users, on_delete=models.CASCADE,null=True)
    createdAt = models.DateTimeField(auto_now_add=True)


class Invitation(models.Model):
    email = models.EmailField()
    organisation = models.ForeignKey(OrganisationModel, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, default="member")
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.email} → {self.organisation.organisationName}"
