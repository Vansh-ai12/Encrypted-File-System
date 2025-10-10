from django.db import models

# Create your models here.

class File_Up(models.Model):
    title = models.CharField(max_length=255)
    file = models.FileField()
    file_id = models.AutoField(primary_key=True)  
    created_at = models.DateTimeField(auto_now_add=True)