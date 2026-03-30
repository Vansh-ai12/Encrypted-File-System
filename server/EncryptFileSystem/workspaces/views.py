from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from user.models import Users
from .models import Workspace
from .serializers import WorkspaceSerializer
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny

@api_view(["GET", "POST"])
@authentication_classes([])   
@permission_classes([AllowAny])
def workspace_list_create(request):

    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return Response({"error": "Unauthorized"}, status=401)

    if request.method == "GET":
        workspaces = Workspace.objects.filter(owner=user)
        serializer = WorkspaceSerializer(workspaces, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = WorkspaceSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(owner=user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "DELETE", "PATCH"])
@authentication_classes([])
@permission_classes([AllowAny])
def workspace_detail(request, id):

    token = request.COOKIES.get("session")
    user = Users.objects.filter(token=token).first()

    if not user:
        return Response({"error": "Unauthorized"}, status=401)

    try:
        workspace = Workspace.objects.get(id=id, owner=user)
    except Workspace.DoesNotExist:
        return Response(
            {"error": "Workspace not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":
        serializer = WorkspaceSerializer(workspace)
        return Response(serializer.data)

    if request.method == "DELETE":
        workspace.delete()
        return Response(
            {"message": "Workspace deleted"},
            status=status.HTTP_204_NO_CONTENT
        )
    if request.method == "PATCH":
        workspace.type = request.data.get("type", workspace.type)
        workspace.repo = request.data.get("repo", workspace.repo)
        workspace.save()

        serializer = WorkspaceSerializer(workspace)
        return Response(serializer.data)