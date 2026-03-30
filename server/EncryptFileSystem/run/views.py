from django.shortcuts import render

from django.http import JsonResponse

from django.views.decorators.csrf import csrf_exempt
import json

# Create your views here.

@csrf_exempt
def run_code(request):
    data = json.loads(request.body)
    file_id = data.get("file_id")

    # 🔥 fetch file content from DB

    # 🔥 run inside docker
    import subprocess

    result = subprocess.run(
        ["docker", "run", "--rm", "runner-image"],
        capture_output=True,
        text=True
    )

    return JsonResponse({
        "output": result.stdout or result.stderr
    })