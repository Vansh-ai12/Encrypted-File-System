from . import views
from django.urls import path,include

urlpatterns = [
    
    path("addOrganisation/",views.addOrganisation,name="add_organisation"),
    path("addMember/",views.addMember , name="add_ member"),
    path("getOrganisations/",views.getUserOrganisations, name="get_Organisations"),
    path("getOrganisationMembers/<str:orgId>/",views.getOrganisationMembers,name="getMembers"),
    path("updateRole/",views.updateMemberRole, name="updateRole"),
    path("removeMember/",views.removeMember,name="removeMember"),
]


