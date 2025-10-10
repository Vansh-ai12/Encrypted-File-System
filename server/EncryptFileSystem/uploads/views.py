
from django.http import JsonResponse
from django.core.files import File
from cryptography.fernet import Fernet
from django.core.files.base import ContentFile

from datetime import date


# Create your views here.
from django.views.decorators.csrf import csrf_exempt

from .models import File_Up

import os

KEY_FILE = "key.key"

@csrf_exempt
def upload_file(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    if 'file' not in request.FILES:
        return JsonResponse({"error": "No file uploaded"}, status=400)

    uploaded_file = request.FILES['file']
    
    # Optional: validate type, size, etc.
    handleUploadedFile(uploaded_file)

    return JsonResponse({"message": "File uploaded successfully"})



def write_key():
    if not os.path.exists(KEY_FILE):
        key = Fernet.generate_key()
        with open(KEY_FILE, "wb") as key_file:
            key_file.write(key)
        print("New Key Generated and Saved.")
    else:
        print("Key already exists.")


def load_key():
    return open("key.key","rb").read()


write_key()


def handleUploadedFile(f):
    key = load_key()

    
    data  = f.read()
    fernet = Fernet(key)
    encrypted = fernet.encrypt(data)
    encrypted_filename = f.name + "_encrypted"
    file_instance = File_Up()
    file_instance.title = f.name
    file_instance.file.save(encrypted_filename,ContentFile(encrypted), save=True)
    file_instance.created_at = date.today()






def decrypt_file(file):
    key = load_key()
    f=  Fernet(key)
    decrypted = f.decrypt(file)
    print(decrypted)
    






