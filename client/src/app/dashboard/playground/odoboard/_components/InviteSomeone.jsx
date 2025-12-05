"use client";

import { useEffect, useState } from "react";
import { Users, Settings as SettingsIcon, Plus } from "lucide-react";
import { DialogClose } from "@/Components/ui/dialog";

export default function ManageOrganisations({
  orgId,
  onClose,
  width = "1200px",
  height = "650px",
}) {
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

  // Normalize org ID: priority localStorage > prop
  const getCurrentOrgId = () =>
    localStorage.getItem("activeOrgId") || orgId;

  // Validate + refresh organisation info
  const validateOrg = async () => {
    const id = getCurrentOrgId();
    if (!id) {
      onClose?.();
      return;
    }

    const res = await fetch(
      "http://127.0.0.1:8000/boardOrganisation/getOrganisations/",
      { credentials: "include" }
    );
    const data = await res.json();
    const match = data.organisations?.find((o) => o.organisationId === id);

    if (!match) {
      onClose?.();
      return;
    }

    setOrgInfo(match);
  };

  const fetchMembers = async () => {
    const id = getCurrentOrgId();
    if (!id) return;

    setLoadingMembers(true);
    const res = await fetch(
      `http://127.0.0.1:8000/boardOrganisation/getOrganisationMembers/${id}/`,
      { credentials: "include" }
    );
    const data = await res.json();
    setMembers(data.members || []);
    setLoadingMembers(false);
  };

  const fetchInvitations = async () => {
    const id = getCurrentOrgId();
    if (!id) return;

    setLoadingInvites(true);
    const res = await fetch(
      `http://127.0.0.1:8000/boardOrganisation/getInvitations/${id}/`,
      { credentials: "include" }
    );
    const data = await res.json();
    setInvitations(data.invitations || []);
    setLoadingInvites(false);
  };

  // 🔁 Re-fetch anytime org changes
  useEffect(() => {
    const updateUI = () => {
      validateOrg();
      fetchMembers();
      fetchInvitations();
    };

    updateUI();
    window.addEventListener("org-changed", updateUI);

    return () => window.removeEventListener("org-changed", updateUI);
  }, [orgId]);

  // ---- Members actions ----
  const updateRole = async (email, newRole) => {
    const id = getCurrentOrgId();
    await fetch(`http://127.0.0.1:8000/boardOrganisation/updateMemberRole/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: newRole, orgId: id }),
    });
    fetchMembers();
  };

  const removeUser = async (email) => {
    const id = getCurrentOrgId();
    await fetch(`http://127.0.0.1:8000/boardOrganisation/removeMember/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orgId: id }),
    });
    fetchMembers();
  };

  // ---- Invite ----
  const handleInvite = async (e) => {
    e.preventDefault();
    const id = getCurrentOrgId();

    if (!inviteEmail.trim()) return setInviteError("Enter email");
    setInviteLoading(true);
    setInviteError("");

    const res = await fetch(
      "http://127.0.0.1:8000/boardOrganisation/sendInvitation/",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, orgId: id, role: inviteRole }),
      }
    );
    const data = await res.json();
    setInviteLoading(false);

    if (!res.ok) return setInviteError(data.error || "Failed");

    setInviteEmail("");
    fetchInvitations();
  };

  // ---- Delete Organisation ----
  const handleDeleteOrganisation = async () => {
    setDeleting(true);
    setDeleteError("");

    const id = getCurrentOrgId();
    const res = await fetch(
      "http://127.0.0.1:8000/boardOrganisation/deleteOrganisation/",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId: id }),
      }
    );

    const data = await res.json();
    setDeleting(false);
    if (!res.ok) return setDeleteError(data.error || "Error deleting");

    localStorage.removeItem("activeOrgId");
    window.dispatchEvent(new Event("org-changed"));
    onClose?.();
  };

  if (!orgInfo) {
    return (
      <div className="flex items-center justify-center w-full p-6">
        <span className="text-xs text-gray-500">Loading organisation…</span>
      </div>
    );
  }

  const orgInitial =
    orgInfo.organisationName?.[0]?.toUpperCase() || "?";

  return (
    <div
      className="bg-white rounded-2xl shadow-xl flex overflow-hidden relative"
      style={{ width, height, maxWidth: "95vw", maxHeight: "90vh" }}
    >
      {/* Close Popup */}
      <DialogClose className="absolute top-3 right-3 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center">
        ✕
      </DialogClose>

      {/* SIDEBAR */}
      <div className="w-64 bg-gray-50 border-r border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b">
          {orgInfo.imgUrl ? (
            <img
              src={orgInfo.imgUrl}
              className="w-10 h-10 rounded-lg object-cover shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white flex items-center justify-center shadow-sm">
              {orgInitial}
            </div>
          )}

          <div>
            <p className="text-sm font-medium truncate">{orgInfo.organisationName}</p>
            <p className="text-[11px] text-gray-500">Organization</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-3 space-y-1">
          <button
            className={`w-full text-sm flex items-center gap-2 px-6 py-2 rounded-md ${
              activeSection === "members" ? "bg-white font-medium" : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveSection("members")}
          >
            <Users className="w-4 h-4" /> Members
          </button>

          <button
            className={`w-full text-sm flex items-center gap-2 px-6 py-2 rounded-md ${
              activeSection === "settings" ? "bg-white font-medium" : "text-gray-600 hover:bg-gray-100"
            }`}
            onClick={() => setActiveSection("settings")}
          >
            <SettingsIcon className="w-4 h-4" /> Settings
          </button>
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        {activeSection === "settings" ? (
          <div className="space-y-6 max-w-xl mt-3">
            <h1 className="text-lg font-semibold text-red-600">Danger Zone</h1>
            <p className="text-xs text-gray-500">Deleting cannot be undone.</p>

            <div className="border border-red-200 bg-red-50 p-4 rounded-xl">
              <p className="text-sm font-semibold text-red-600">Delete Organization</p>

              <p className="text-xs mt-2 text-gray-700">
                Type <b>{orgInfo.organisationName}</b> to confirm.
              </p>

              <input
                placeholder="Enter organization name"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-xs mt-3"
              />

              {deleteError && <p className="text-xs text-red-600 mt-2">{deleteError}</p>}

              <button
                disabled={confirmName !== orgInfo.organisationName || deleting}
                onClick={handleDeleteOrganisation}
                className="mt-3 w-full bg-red-500 text-white px-4 py-2 rounded-lg text-xs hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete Organization"}
              </button>
            </div>
          </div>
        ) : (
          <>
            

            <h1 className="text-xl font-semibold">Members</h1>
            <p className="text-xs text-gray-500 mb-4">
              View and manage organization members and invitations
            </p>

            {/* Tabs */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-8 text-sm">
                {["members", "invitations"].map((tab) => (
                  <button
                    key={tab}
                    className={`pb-2 ${
                      activeSubTab === tab
                        ? "font-semibold border-b-2 border-black"
                        : "text-gray-500"
                    }`}
                    onClick={() => setActiveSubTab(tab)}
                  >
                    {tab === "members" ? "Members" : "Invitations"}
                  </button>
                ))}
              </div>

              {activeSubTab === "members" && (
                <form onSubmit={handleInvite} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Enter email to invite"
                    className="border px-3 py-1 text-xs rounded-lg w-52"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="border px-2 py-1 text-xs rounded-lg"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="bg-black text-white px-3 py-1 text-xs rounded-lg"
                  >
                    {inviteLoading ? "Sending…" : "Send invite"}
                  </button>
                </form>
              )}
            </div>

            {inviteError && (
              <p className="text-[11px] text-red-500 mb-2">{inviteError}</p>
            )}

            {/* Members / Invite list */}
            <div className="flex-1 overflow-y-auto">
              {activeSubTab === "members" ? (
                loadingMembers ? (
                  <p className="text-xs text-gray-500">Loading members…</p>
                ) : members.length === 0 ? (
                  <p className="text-xs text-gray-500">No members found</p>
                ) : (
                  <div className="rounded-lg border bg-white">
                    <div className="grid grid-cols-4 text-xs font-medium bg-gray-50 border-b px-6 py-2">
                      <span>User</span>
                      <span>Joined</span>
                      <span>Role</span>
                      <span className="text-right">Action</span>
                    </div>
                    {members.map((m, i) => (
                      <div
                        key={i}
                        className="grid grid-cols-4 px-6 py-3 items-center border-b text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500 text-white font-bold rounded-md">
                            {m.username[0]}
                          </div>
                          <div>
                            <p>{m.username}</p>
                            <p className="text-[10px] text-gray-500">
                              {m.email}
                            </p>
                          </div>
                        </div>

                        <span>{m.joined}</span>

                        <select
                          value={m.role}
                          onChange={(e) => updateRole(m.email, e.target.value)}
                          className="text-xs border rounded-md"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>

                        <button
                          onClick={() => removeUser(m.email)}
                          className="text-red-500 text-right"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : loadingInvites ? (
                <p className="text-xs text-gray-500">Loading invites…</p>
              ) : invitations.length === 0 ? (
                <p className="text-xs text-gray-500">
                  No pending invitations
                </p>
              ) : (
                <div className="border rounded-lg bg-white">
                  <div className="grid grid-cols-3 text-xs bg-gray-50 px-6 py-2 font-medium border-b">
                    <span>Email</span>
                    <span>Role</span>
                    <span className="text-right">Status</span>
                  </div>

                  {invitations.map((i, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-3 px-6 py-3 text-xs border-b"
                    >
                      <span>{i.email}</span>
                      <span>{i.role}</span>
                      <span className="text-right text-blue-600">Pending</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
