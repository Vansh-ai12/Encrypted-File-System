from rest_framework import serializers
from .models import Invitation

class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invitation
        fields = ["email", "role", "accepted", "token", "organisation", "created_at"]
        read_only_fields = ["token", "created_at", "accepted"]
