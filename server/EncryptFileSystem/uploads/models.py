from django.db import models
import uuid

from user.models import Users
# Create your models here.

def generate_uuid():
    return str(uuid.uuid4())


class File_Up(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField()
    file_id = models.CharField(max_length=36, default=generate_uuid,unique=True, editable=False)
    created_at = models.DateField(auto_now_add=True)
    owner = models.ForeignKey(Users, on_delete=models.CASCADE, related_name='files', null=True)


