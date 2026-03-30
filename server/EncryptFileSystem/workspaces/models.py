from django.db import models
from user.models import Users


class Workspace(models.Model):

    name = models.CharField(max_length=255)

    logo = models.ImageField(
        upload_to="workspace_logos/",
        null=True,
        blank=True
    )

    description = models.TextField(
        blank=True,
        null=True
    )

    owner = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="owned_workspaces"
    )
    type = models.CharField(default="local")
    repo = models.CharField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)



    def __str__(self):
        return self.name