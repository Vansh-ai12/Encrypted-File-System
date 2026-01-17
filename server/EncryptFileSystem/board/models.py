from django.db import models
from django.conf import settings
from boardOrganisation.models import OrganisationModel
import random

import uuid

class Board(models.Model):
    title = models.CharField(max_length=255)
    organisation = models.ForeignKey(
        OrganisationModel,
        on_delete=models.CASCADE,
        related_name='boards',
        db_index=True
    )
    authorId = models.CharField(max_length=50)
    authorName = models.CharField(max_length=100)
    fav = models.BooleanField(default=False, null=True)
    imageUrl = models.CharField(max_length=255, blank=True, null=True)
    createdAt = models.DateTimeField(auto_now_add=True)
    boardId = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    def save(self, *args, **kwargs):
        if not self.imageUrl:  # Assign only if not already set
            image_files = [
                "boards/pl-1.svg",
                "boards/pl-2.svg",
                "boards/pl-3.svg",
                "boards/pl-4.svg",
                "boards/pl-5.svg",
                "boards/pl-6.svg",
                "boards/pl-7.svg",
                "boards/pl-8.svg",
                "boards/pl-9.svg",
                "boards/pl-10.svg",
            ]

            chosen_img = random.choice(image_files)
            self.imageUrl = settings.STATIC_URL + chosen_img

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    class Meta:
        indexes = [
            models.Index(fields=['title'], name='title_search_idx')
        ]



class BoardSnapshot(models.Model):
    board_id = models.CharField(max_length=64, db_index=True)
    layers = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    version = models.BigIntegerField()
    class Meta:
        indexes = [
            models.Index(fields=["board_id", "version"]),
        ]



class BoardOperation(models.Model):
    board_id = models.CharField(max_length=64, db_index=True)
    user_id = models.IntegerField()
    op_type = models.CharField(max_length=50)  # ADD, UPDATE, DELETE, MOVE, TEXT_EDIT, etc
    payload = models.JSONField()               # operation data
    version = models.BigIntegerField()         # monotonically increasing
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["board_id", "version"]),
        ]
