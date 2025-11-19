
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
        "received": "Success",
    }, status=200)



def handleUploadedFile(f,user):
    key = "JU3Y0V88NR_jenIboqX_CGoneO-S3Aib2rFd4PnlNpk="

    
    data  = f.read()

    fernet = Fernet(key)
    encrypted = fernet.encrypt(data)
    encrypted_filename = f.name + "_encrypted"
    file_instance = FileUpload()
    file_instance.title = encrypted_filename
    file_instance.user = user
    file_instance.file.save(encrypted_filename,ContentFile(encrypted), save=False)
    file_instance.file_id = secrets.token_hex(8)
    file_instance.save()
    return {"id": file_instance.file_id, "date": file_instance.created_at, "name":f.name , "User"  :user.username}






def decrypt_file(file):
    key = "JU3Y0V88NR_jenIboqX_CGoneO-S3Aib2rFd4PnlNpk="
    f=  Fernet(key)
    decrypted = f.decrypt(file)
    return decrypted

@csrf_exempt
def view_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)  
        file_id = data.get("id")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    if not file_id:
        return JsonResponse({"error": "Missing parameters"}, status=400)

    file_obj = FileUpload.objects.filter( file_id=file_id).first()
    if not file_obj:
        return JsonResponse({"error": "File not found in DB"}, status=404)

    file_obj.file.open('rb')
    encrypted_data = file_obj.file.read()
    file_obj.file.close()


    decrypted_data = decrypt_file(encrypted_data)

    original_name = os.path.basename(file_obj.title).replace("_encrypted", "")
    ext = os.path.splitext(original_name)[1].lower()
    mime_types = {
    ".ipynb": "application/json",  
    ".pdf": "application/pdf",      
    ".doc": "application/msword",   
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
    ".xls": "application/vnd.ms-excel",  
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  
    ".ppt": "application/vnd.ms-powerpoint", 
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", 
    ".txt": "text/plain",           
    ".csv": "text/csv",             
    ".json": "application/json",   
    ".html": "text/html",           
    ".htm": "text/html",
    ".png": "image/png",            
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".mp3": "audio/mpeg",           
    ".wav": "audio/wav",
    ".mp4": "video/mp4",            
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".zip": "application/zip",      
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed"
}

    content_type = mime_types.get(ext, "application/octet-stream") 


    response = HttpResponse(decrypted_data, content_type=content_type)

    response['Content-Disposition'] = f'inline; filename="{original_name}"'

    return response
