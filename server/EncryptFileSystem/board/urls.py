from django.urls import path,include
from . import views
urlpatterns = [
    path("createBoard/",views.create_board,name="createBoard"),
    path("getBoards/",views.get_boards,name="getBoards"),
    path("removeBoard/",views.remove_board,name="removeBoard"),
    path("renameBoard/",views.rename_board,name="renameBoard"),
    path('toggleFavorite/', views.toggle_favorite, name="toggle_favorite"),

]
