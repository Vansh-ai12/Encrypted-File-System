from django.shortcuts import render

# Create your views here.
import json
from django.http import JsonResponse

from rest_framework.response import Response
from rest_framework import status

from boardOrganisation.views import get_authenticated_user
from boardOrganisation.models import memberDetailModel,OrganisationModel
from .models import Board
from .serializers import BoardSerializer
from EncryptFileSystem.utils import cors_json


from django.views.decorators.csrf import csrf_protect

@csrf_protect
def create_board(request):
    user = get_authenticated_user(request)

    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    data = json.loads(request.body)
    title = data.get("title")
    org_id = data.get("organisationId") # ✅ FIXED

    if not title:
        return cors_json({"error": "Title is required"}, status=400)

    if not org_id:
        return cors_json({"error": "organisationId required"}, status=400)

    active_org = OrganisationModel.objects.filter(organisationId=org_id).first()
    if not active_org:
        return cors_json({"error": "Invalid organisation"}, status=400)

    membership = memberDetailModel.objects.filter(
        organisation=active_org,
        memberInfo=user
    ).first()

    if not membership:
        return cors_json({"error": "You are not a member of this organisation"}, status=403)

    board = Board.objects.create(
        title=title,
        organisation=active_org,
        authorId=user.id,
        authorName=user.username,
    )

    return cors_json({
        "message": "Board created successfully",
        "boardId": str(board.boardId)  # 🔥 SIMPLIFY JSON
    }, status=201)




@csrf_protect
def get_boards(request):
    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    org_id = request.GET.get("orgId")  # 👈 Read active organisation ID from query param

    if org_id:
        boards = Board.objects.filter(organisation__organisationId=org_id).order_by('-createdAt')
    else:
        boards = Board.objects.none()  # 👈 don't return all boards

    serializer = BoardSerializer(boards, many=True)
    return cors_json({
        "message": "Boards fetched successfully",
        "boards": serializer.data
    }, status=200)



@csrf_protect
def remove_board(request):
    user = get_authenticated_user(request)

    if not user:
        return cors_json({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    data = json.loads(request.body)
    board_id = data.get("boardId")

    if not board_id:
        return cors_json({"error": "Board ID is required"}, status=400)

    try:
        board = Board.objects.get(boardId=board_id)
    except Board.DoesNotExist:
        return cors_json({"error": "Board not found"}, status=404)

    # Check user's membership in board's organisation
    membership = memberDetailModel.objects.filter(
        organisation=board.organisation,
        memberInfo=user
    ).first()

    if not membership:
        return cors_json({"error": "You are not a member of this organization"}, status=403)

    # Authorization: Only Board Author or Admin can delete
    if membership.role != "admin" and board.authorId != user.id:
        return cors_json({"error": "You are not allowed to delete this board"}, status=403)

    board.delete()

    return cors_json({"message": "Board deleted successfully"}, status=200)

@csrf_protect
def rename_board(request):
    user = get_authenticated_user(request)
    if not user:
        return cors_json({"error": "Unauthorized"}, status=401)

    data = json.loads(request.body)
    board_id = data.get("boardId")
    new_title = data.get("title")

    if not board_id or not new_title:
        return cors_json({"error": "Board ID & new title required"}, status=400)

    try:
        board = Board.objects.get(boardId=board_id)
    except Board.DoesNotExist:
        return cors_json({"error": "Board not found"}, status=404)

    membership = memberDetailModel.objects.filter(
        organisation=board.organisation,
        memberInfo_id=user.id   # 🔥 FIX
    ).first()

    if not membership:
        return cors_json({"error": "Not a member"}, status=403)

    role = membership.role.strip().lower()

    if role != "admin" and board.authorId != user.id:
        return cors_json({"error": "Forbidden"}, status=403)

    board.title = new_title
    board.save()

    return cors_json({"message": "Board renamed successfully"}, status=200)


@csrf_protect
def toggle_favorite(request):
    user = get_authenticated_user(request)

    if not user:
        return cors_json({"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED)

    data = json.loads(request.body)
    board_id = data.get("boardId")
    is_favorite = data.get("isFavorite")

    if board_id is None or is_favorite is None:
        return cors_json({"error": "Missing boardId or isFavorite"}, status=400)

    try:
        board = Board.objects.get(boardId=board_id)
    except Board.DoesNotExist:
        return cors_json({"error": "Board not found"}, status=404)

    board.fav = is_favorite
    board.save()

    return cors_json({"message": "Favorite updated successfully"}, status=200)

@csrf_protect
def get_board_name(request, boardId):
    user = get_authenticated_user(request)

    if not user:
        return cors_json(
            {"error": "Unauthorized"},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        board = Board.objects.get(boardId=boardId)
    except Board.DoesNotExist:
        return cors_json(
            {"error": "Board not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    return cors_json(
        {
            "title": board.title
        },
        status=status.HTTP_200_OK
    )
