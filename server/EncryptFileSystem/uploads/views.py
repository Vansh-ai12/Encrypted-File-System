
import secrets
from urllib import request
from django.http import HttpResponse, JsonResponse
from django.core.files import File
from cryptography.fernet import Fernet
from django.core.files.base import ContentFile

from user.models import Users
from datetime import date
import json
from workspaces.models import Workspace

# Create your views here.
from django.views.decorators.csrf import csrf_exempt

from .models import FileUpload

import os

import zipfile
from io import BytesIO


#File Handling

@csrf_exempt
def upload_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        if request.content_type == "application/json":
            try:
                data = json.loads(request.body)
            except:
                return JsonResponse({"error": "Invalid JSON"}, status=400)
        else:
            data = request.POST

    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    token = request.COOKIES.get("session")

    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)


    workspace_id = data.get("workspace_id")
    # 🔥 SIZE LIMIT (20MB)
    MAX_FILE_SIZE = 20 * 1024 * 1024

    file_size = int(data.get("size", 0))

    if file_size > MAX_FILE_SIZE:
        return JsonResponse(
        {"error": "File too large. Max 20MB allowed."},
        status=400
    )

    workspace = None
    if workspace_id:
        workspace = Workspace.objects.filter(
        id=workspace_id,
        owner=user   # 🔥 IMPORTANT FIX
    ).first()

    if not workspace:
        return JsonResponse({"error": "Unauthorized workspace"}, status=403)

    File_Up = FileUpload(
    user=user,
    workspace=workspace,
    ciphertext=data.get("ciphertext"),
    iv=data.get("iv"),
    salt=data.get("salt"),
    original_name=data.get("originalName"),
    mime_type=data.get("mimeType"),
    size=data.get("size"),
)

    File_Up.save()


    return JsonResponse({
        "message": "Received full encrypted payload",
        "file_id": File_Up.file_id,
    }, status=200)


import hashlib
from datetime import datetime

@csrf_exempt
def update_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        file_id = data.get("id")
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not file_id:
        return JsonResponse({"error": "Missing file id"}, status=400)

    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    file_obj = FileUpload.objects.filter(file_id=file_id, user=user).first()

    if not file_obj:
        return JsonResponse({"error": "File not found"}, status=404)

    # 🔥 NEW ENCRYPTED DATA
    ciphertext = data.get("ciphertextBase64")

    file_obj.ciphertext = ciphertext
    file_obj.iv = data.get("ivBase64")
    file_obj.salt = data.get("saltBase64")

    # 🔥 UPDATE SIZE
    file_obj.size = len(ciphertext)

    # 🔥 UPDATE HASH (integrity)
    file_obj.file_hash = hashlib.sha256(ciphertext.encode()).hexdigest()

    # 🔥 BASIC RISK RE-CALCULATION
    ext = (file_obj.original_name or "").split(".")[-1].lower()

    risk_score = 0
    if ext in ["js", "exe", "sh", "bat"]:
        risk_score += 40

    if file_obj.size > 10_000_000:
        risk_score += 20

    file_obj.risk_score = risk_score
    file_obj.is_safe = risk_score < 50

    # 🔥 UPDATE ANALYSIS
    file_obj.analysis_report = f"""
Updated File Analysis:
- Extension: {ext}
- Size: {file_obj.size}
- Risk Score: {risk_score}
- Status: {"SAFE" if file_obj.is_safe else "SUSPICIOUS"}
"""

    file_obj.last_analyzed_at = datetime.now()

    file_obj.save()

    return JsonResponse({"message": "File updated"}, status=200)


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

    workspace_id = request.GET.get("workspace_id")

    files = FileUpload.objects.filter(
    user=user,
    workspace_id=workspace_id
).values(
    "file_id",
    "original_name",
    "size",
    "mime_type"
)

# 🔥 ensure size is not None
    files = [
    {
        **f,
        "size": f["size"] or 0
    }
    for f in files
]

    return JsonResponse(list(files), safe=False, status=200)



@csrf_exempt
def delete_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)
        file_id = data.get("id")
    except:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not file_id:
        return JsonResponse({"error": "Missing file id"}, status=400)

    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    file_obj = FileUpload.objects.filter(file_id=file_id, user=user).first()

    if not file_obj:
        return JsonResponse({"error": "File not found"}, status=404)

    file_obj.delete()

    return JsonResponse({"message": "File deleted"}, status=200)



@csrf_exempt
def download_cluster(request):
    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return JsonResponse({"error": "Unauthorized"}, status=401)

    workspace_id = request.GET.get("workspace_id")

    if not workspace_id:
        return JsonResponse({"error": "Missing workspace_id"}, status=400)

    files = FileUpload.objects.filter(
        user=user,
        workspace_id=workspace_id
    )

    if not files.exists():
        return JsonResponse({"error": "No files found"}, status=404)

    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for file in files:
            # 🔥 store encrypted content
            filename = file.original_name or f"{file.file_id}.enc"

            content = file.ciphertext.encode()  # already base64 string

            zip_file.writestr(filename + ".enc", content)
            zip_file.writestr("manifest.json", json.dumps([
    {
        "name": file.original_name,
        "size": file.size,
        "type": file.mime_type
    } for file in files
]))

    zip_buffer.seek(0)

    response = HttpResponse(zip_buffer, content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="cluster_{workspace_id}.zip"'

    return response