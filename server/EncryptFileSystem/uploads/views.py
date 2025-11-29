
import secrets
from django.http import HttpResponse, JsonResponse
from django.core.files import File
from cryptography.fernet import Fernet
from django.core.files.base import ContentFile
from user.models import Users
from datetime import date
import json

# Create your views here.
from django.views.decorators.csrf import csrf_exempt

from .models import FileUpload

import os


#File Handling

@csrf_exempt
def upload_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)

    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    token = request.COOKIES.get("session")

    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)


    File_Up = FileUpload()
    File_Up.user = user
    File_Up.ciphertext = data.get("ciphertextBase64")
    File_Up.iv = data.get("ivBase64")
    File_Up.salt = data.get("saltBase64")
    File_Up.original_name = data.get("originalName")
    File_Up.mime_type = data.get("mimeType")
    File_Up.size = data.get("size")
    File_Up.save()


    return JsonResponse({
        "message": "Received full encrypted payload",
        "file_id": File_Up.file_id,
    }, status=200)







@csrf_exempt
def view_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # Validate JSON
    try:
        data = json.loads(request.body)
        file_id = data.get("id")
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not file_id:
        return JsonResponse({"error": "Missing file id"}, status=400)

    # Validate user session
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    # Fetch file only if owned by user
    file_obj = FileUpload.objects.filter(file_id=file_id, user=user).first()
    if not file_obj:
        return JsonResponse({"error": "File not found"}, status=404)

    # Return encrypted data so frontend decrypts
    return JsonResponse({
        "ciphertextBase64": file_obj.ciphertext,
        "ivBase64": file_obj.iv,
        "saltBase64": file_obj.salt,
        "originalName": file_obj.original_name,
        "mimeType": file_obj.mime_type,
    }, status=200)



@csrf_exempt
def list_files(request):
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    files = FileUpload.objects.filter(user=user).values(
        "file_id", "original_name", "size", "mime_type"
    )

    return JsonResponse(list(files), safe=False, status=200)
