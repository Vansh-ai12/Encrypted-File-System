from rest_framework import serializers
from .models import Workspace
from uploads.models import FileUpload

# Create a small serializer for the files
class FileListSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileUpload
        fields = ['file_id', 'original_name', 'mime_type', 'size', 'uploaded_at']
class WorkspaceSerializer(serializers.ModelSerializer):
    files = FileListSerializer(many=True, read_only=True)

    class Meta:
        model = Workspace
        fields = ['id','name','logo','description','type','repo','created_at','files']
        read_only_fields = ['id','created_at']