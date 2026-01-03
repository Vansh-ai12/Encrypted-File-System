import uuid
from django.db import models
from django.conf import settings
from user.models import Users

# =========================================
# ORGANISATION MODEL
# =========================================
class OrganisationModel(models.Model):
    organisationId = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    organisationName = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)

    imgUrl = models.ImageField(
        upload_to="organisation_images/",
        null=True,
        blank=True
    )

    creator = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="created_organisations"
    )

    createdAt = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.organisationName


# =========================================
# ORGANISATION MEMBER MODEL
# =========================================
class memberDetailModel(models.Model):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("member", "Member"),
    )

    organisation = models.ForeignKey(
        OrganisationModel,
        on_delete=models.CASCADE,
        related_name="members"
    )

    memberInfo = models.ForeignKey(
        Users,
        on_delete=models.CASCADE,
        related_name="organisation_memberships"
    )

    memberName = models.CharField(max_length=150)

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default="member"
    )

    createdAt = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organisation", "memberInfo")

    def __str__(self):
        return f"{self.memberName} ({self.role})"


# =========================================
# INVITATION MODEL
# =========================================
class Invitation(models.Model):
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    email = models.EmailField()
    organisation = models.ForeignKey(
        OrganisationModel,
        on_delete=models.CASCADE,
        related_name="invitations"
    )

    role = models.CharField(
        max_length=10,
        choices=(("admin", "Admin"), ("member", "Member")),
        default="member"
    )

    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invite {self.email} → {self.organisation.organisationName}"
