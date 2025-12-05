from django.http import JsonResponse

def cors_json(data, status=200):
    res = JsonResponse(data, status=status)
    res["Access-Control-Allow-Origin"] = "http://localhost:3000"
    res["Access-Control-Allow-Credentials"] = "true"
    return res
