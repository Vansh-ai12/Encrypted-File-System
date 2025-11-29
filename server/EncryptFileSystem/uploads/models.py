import secrets
from django.db import models
from user.models import Users


def generate_file_id():
    return secrets.token_hex(8)


class FileUpload(models.Model):

    file_id = models.CharField(max_length=100, unique=True, default=generate_file_id)
    user = models.ForeignKey(Users, on_delete=models.CASCADE, related_name="uploads")

    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100,null=True)
    size = models.BigIntegerField(null=True)


    ciphertext = models.TextField(null=True)  
    iv = models.CharField(max_length=255,null=True)
    salt = models.CharField(max_length=255,null=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.original_name} ({self.file_id})"
