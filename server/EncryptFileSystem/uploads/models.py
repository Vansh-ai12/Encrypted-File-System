import secrets
from django.db import models
from user.models import Users
from workspaces.models import Workspace

def generate_file_id():
    return secrets.token_hex(8)

class FileUpload(models.Model):

    file_id = models.CharField(max_length=100, unique=True, default=generate_file_id)

    user = models.ForeignKey(Users, on_delete=models.CASCADE, related_name="uploads")

    workspace = models.ForeignKey(
        Workspace, 
        on_delete=models.CASCADE, 
        related_name="files", 
        null=True, 
        blank=True
    )

    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=100, null=True)
    size = models.BigIntegerField(null=True)

    # 🔐 encryption
    ciphertext = models.TextField(null=True)  
    iv = models.CharField(max_length=255, null=True)
    salt = models.CharField(max_length=255, null=True)

    # 🔥 NEW — SECURITY
    file_hash = models.CharField(max_length=64, null=True, blank=True)
    file_extension = models.CharField(max_length=20, null=True, blank=True)

    is_safe = models.BooleanField(default=True)
    risk_score = models.IntegerField(default=0)
    analysis_report = models.TextField(null=True, blank=True)
    last_analyzed_at = models.DateTimeField(null=True, blank=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.original_name} ({self.file_id})"