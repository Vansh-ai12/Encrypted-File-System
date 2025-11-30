"use client";

import { useEffect, useState } from "react";
import { Users, Settings as SettingsIcon, Plus } from "lucide-react";

export default function ManageOrganisations({ orgId, onClose }) {
  const [activeSection, setActiveSection] = useState("members");
  const [activeSubTab, setActiveSubTab] = useState("members");

  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [invitations, setInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(true);

  const [orgInfo, setOrgInfo] = useState(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const loggedInEmail =
    typeof window !== "undefined" ? localStorage.getItem("email") : null;

  // Fetch organisation details
  const fetchOrgInfo = async () => {
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/boardOrganisation/getOrganisations/",
        { credentials: "include" }
      );
      const data = await res.json();
      const match = data.organisations?.find((o) => o.organisationId == orgId);
      if (match) setOrgInfo(match);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Members
  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const res = await fetch(
        `http://127.0.0.1:8000/boardOrganisation/getOrganisationMembers/${orgId}/`,
        { credentials: "include" }
      );
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Fetch Invitations
  const fetchInvitations = async () => {
    try {
      setLoadingInvites(true);
      const res = await fetch(
        `http://127.0.0.1:8000/boardOrganisation/getInvitations/${orgId}/`,
        { credentials: "include" }
      );
      const data = await res.json();
      setInvitations(data.invitations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInvites(false);
    }
  };

  useEffect(() => {
    if (!orgId) return;
    fetchOrgInfo();
    fetchMembers();
    fetchInvitations();
  }, [orgId]);

  // Update Role
  const updateRole = async (email, newRole) => {
    try {
      await fetch(
        "http://127.0.0.1:8000/boardOrganisation/updateMemberRole/",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, role: newRole, orgId }),
        }
      );
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  const removeUser = async (email) => {
    try {
      await fetch(
        "http://127.0.0.1:8000/boardOrganisation/removeMember/",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, orgId }),
        }
      );
      fetchMembers();
    } catch (err) {
      console.error(err);
    }
  };

  // Invite Submit
  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");

    if (!inviteEmail.trim()) {
      setInviteError("Enter email");
      return;
    }

    setInviteLoading(true);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/boardOrganisation/sendInvitation/",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail.trim(),
            orgId,
            role: inviteRole,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Error sending invite");
      } else {
        setInviteEmail("");
        fetchInvitations();
      }
    } catch (err) {
      setInviteError("Something went wrong");
    } finally {
      setInviteLoading(false);
    }
  };

  // Delete Org Handler
  const handleDeleteOrganisation = async () => {
    setDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/boardOrganisation/deleteOrganisation/",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orgId }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed deleting");
      } else {
        const active = localStorage.getItem("activeOrgId");
        if (active == orgId) {
          localStorage.removeItem("activeOrgId");
          window.dispatchEvent(new Event("org-changed"));
        }
        onClose();
      }
    } catch (err) {
      setDeleteError("Error deleting");
    } finally {
      setDeleting(false);
    }
  };

  const orgInitial = orgInfo?.organisationName?.[0]?.toUpperCase() || "?";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200]">
      <div className="relative bg-white w-[950px] h-[550px] rounded-2xl shadow-xl flex overflow-hidden">

        <button
          onClick={onClose}
          className="absolute top-3 right-3 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
        >
          ✕
        </button>

        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white font-semibold flex items-center justify-center shadow-sm">
              {orgInitial}
            </div>
            <div>
              <p className="text-sm font-medium truncate max-w-[120px]">{orgInfo?.organisationName}</p>
              <p className="text-[11px] text-gray-500">Organization</p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <button
              className={`w-full flex items-center gap-2 px-6 py-2 text-sm rounded-md ${
                activeSection === "members"
                  ? "bg-white font-medium shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setActiveSection("members")}
            >
              <Users className="w-4 h-4" /> Members
            </button>

            <button
              className={`w-full flex items-center gap-2 px-6 py-2 text-sm rounded-md ${
                activeSection === "settings"
                  ? "bg-white font-medium shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setActiveSection("settings")}
            >
              <SettingsIcon className="w-4 h-4" /> Settings
            </button>
          </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="flex-1 p-6 flex flex-col overflow-hidden">

          {/* SETTINGS */}
          {activeSection === "settings" && orgInfo && (
            <div className="space-y-6 mt-3 w-full max-w-xl">
              <h1 className="text-lg font-semibold">Danger Zone</h1>
              <p className="text-xs text-gray-500">
                This will permanently remove boards, members and invitations.
              </p>

              <div className="border border-red-300 bg-red-50 p-4 rounded-xl">
                <h2 className="text-sm font-semibold text-red-600">Delete Organization</h2>
                <p className="text-xs mt-2 text-gray-700">
                  Type <b>{orgInfo.organisationName}</b> to confirm.
                </p>

                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 text-xs mt-3"
                  placeholder="Enter name exactly"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                />

                {deleteError && (
                  <p className="text-xs text-red-500 mt-1">{deleteError}</p>
                )}

                <button
                  disabled={confirmName !== orgInfo.organisationName || deleting}
                  onClick={handleDeleteOrganisation}
                  className="mt-3 w-full text-xs px-4 py-2 rounded-lg bg-red-500 text-white disabled:opacity-50 hover:bg-red-600"
                >
                  {deleting ? "Deleting…" : "Delete Organization"}
                </button>
              </div>
            </div>
          )}

          {/* MEMBERS UI */}
          {activeSection === "members" && (
            <>
              <h1 className="text-xl font-semibold">Members</h1>
              <p className="text-xs text-gray-500">
                Manage organization members & invites
              </p>

              {/* Tabs */}
              <div className="mt-5 flex items-center justify-between">
                <div className="flex gap-8 text-sm">
                  {["members", "invitations"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveSubTab(tab)}
                      className={`pb-2 transition-all ${
                        activeSubTab === tab
                          ? "font-semibold border-b-2 border-black"
                          : "text-gray-500 hover:text-black"
                      }`}
                    >
                      {tab === "members" ? "Members" : "Invitations"}
                    </button>
                  ))}
                </div>

                {activeSubTab === "members" && (
                  <form onSubmit={handleInvite} className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="Enter email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="border rounded-lg px-3 py-1 text-xs w-52"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="border rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="bg-black text-white rounded-lg px-3 py-1 text-xs hover:bg-gray-800 disabled:opacity-50 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {inviteLoading ? "Sending…" : "Invite"}
                    </button>
                  </form>
                )}
              </div>

              {inviteError && (
                <p className="text-[11px] text-red-500 mt-1">{inviteError}</p>
              )}

              {/* Member list */}
              <div className="mt-4 flex-1 overflow-y-auto">
                {activeSubTab === "members" && (
                  <>
                    {loadingMembers ? (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    ) : members.length === 0 ? (
                      <p className="text-gray-500 text-sm">No members</p>
                    ) : (
                      <div className="rounded-lg overflow-hidden border border-gray-100 bg-white">
                        <div className="grid grid-cols-4 text-xs font-medium text-gray-500 bg-gray-50 border-b px-6 py-2">
                          <span>User</span>
                          <span>Joined</span>
                          <span>Role</span>
                          <span className="text-right">Action</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {members.map((m, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-4 items-center px-6 py-3 hover:bg-gray-50 transition"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white font-semibold flex items-center justify-center">
                                  {m.username?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                    {m.username}
                                    {loggedInEmail === m.email && (
                                      <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-[1px] rounded-md">
                                        You
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-xs text-gray-500">{m.email}</span>
                                </div>
                              </div>

                              <span className="text-xs text-gray-600">{m.joined}</span>

                              <select
                                className="text-xs border rounded-md px-2 py-1 bg-white"
                                value={m.role}
                                onChange={(e) => updateRole(m.email, e.target.value)}
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                              </select>

                              <button
                                onClick={() => removeUser(m.email)}
                                className="text-xs text-red-500 hover:text-red-700 ml-auto opacity-70 hover:opacity-100 transition"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Invitations */}
                {activeSubTab === "invitations" && (
                  <>
                    {loadingInvites ? (
                      <p className="text-gray-500 text-sm">Loading...</p>
                    ) : invitations.length === 0 ? (
                      <p className="text-gray-500 text-sm">No pending invites</p>
                    ) : (
                      <div className="rounded-lg overflow-hidden border border-gray-100 bg-white">
                        <div className="grid grid-cols-3 text-xs font-medium text-gray-500 bg-gray-50 border-b px-6 py-2">
                          <span>Email</span>
                          <span>Role</span>
                          <span className="text-right">Status</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {invitations.map((inv, i) => (
                            <div
                              key={i}
                              className="grid grid-cols-3 items-center px-6 py-3 hover:bg-gray-50 transition text-sm"
                            >
                              <span className="text-gray-900">{inv.email}</span>
                              <span className="text-xs text-gray-600">{inv.role}</span>
                              <span className="text-xs text-right text-blue-600">
                                {inv.status || "Pending"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
