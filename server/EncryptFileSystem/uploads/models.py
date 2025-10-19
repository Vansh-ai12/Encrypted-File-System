from django.db import models
import uuid
# Create your models here.

def generate_uuid():
    return str(uuid.uuid4())


class File_Up(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField()
    file_id = models.CharField(max_length=36, default=generate_uuid,unique=True, editable=False)
    created_at = models.DateField(auto_now_add=True)



class Users(models.Model):
    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)