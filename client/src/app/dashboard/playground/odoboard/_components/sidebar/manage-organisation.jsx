"use client";

import { useEffect, useState } from "react";
import { Users, Settings as SettingsIcon, Plus } from "lucide-react";

export default function ManageOrganisations({ orgId, onClose }) {
  const [activeSection, setActiveSection] = useState("members");
  const [activeSubTab, setActiveSubTab] = useState("members");

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orgInfo, setOrgInfo] = useState(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const loggedInEmail =
    typeof window !== "undefined" ? localStorage.getItem("email") : null;

  const fetchOrgInfo = async () => {
    const res = await fetch(
      "http://127.0.0.1:8000/boardOrganisation/getOrganisations/",
      { credentials: "include" }
    );
    const data = await res.json();
    const match = data.organisations?.find((o) => o.organisationId === orgId);
    if (match) setOrgInfo(match);
  };

  const fetchMembers = async () => {
    setLoading(true);
    const res = await fetch(
      `http://127.0.0.1:8000/boardOrganisation/getOrganisationMembers/${orgId}/`,
      { credentials: "include" }
    );
    const data = await res.json();
    setMembers(data.members || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!orgId) return;
    fetchOrgInfo();
    fetchMembers();
  }, [orgId]);

  const updateRole = async (email, newRole) => {
    await fetch("http://127.0.0.1:8000/boardOrganisation/updateMemberRole/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: newRole, orgId }),
    });

    fetchMembers();
  };

  const removeUser = async (email) => {
    await fetch("http://127.0.0.1:8000/boardOrganisation/removeMember/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, orgId }),
    });

    fetchMembers();
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteError("");

    if (!inviteEmail.trim()) {
      setInviteError("Enter email to invite");
      return;
    }

    setInviteLoading(true);

    const res = await fetch("http://127.0.0.1:8000/boardOrganisation/addMember/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail.trim(),
        orgId,
        role: inviteRole,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setInviteError(data.error || "Failed to add member");
    } else {
      setInviteEmail("");
      fetchMembers();
    }

    setInviteLoading(false);
  };

  const orgInitial = orgInfo?.organisationName?.[0]?.toUpperCase() || "?";

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200]">
      <div className="relative bg-white w-[950px] h-[550px] rounded-2xl shadow-xl flex overflow-hidden">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-lg hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center"
        >
          ✕
        </button>

        {/* LEFT SIDEBAR */}
        <div className="w-64 bg-gray-50 border-r border-gray-200">
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-gray-200">

            {/* Avatar — image or gradient fallback */}
            {orgInfo?.imgUrl ? (
              <img
                src={orgInfo.imgUrl}
                alt="Org Logo"
                className="w-10 h-10 rounded-lg object-cover shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 text-white font-semibold flex items-center justify-center shadow-sm">
                {orgInitial}
              </div>
            )}

            <div>
              <p className="text-sm font-medium truncate max-w-[120px]">
                {orgInfo?.organisationName || "Organisation"}
              </p>
              <p className="text-[11px] text-gray-500">Organization</p>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <button
              className={`w-full flex items-center gap-2 px-6 py-2 text-sm rounded-md transition ${
                activeSection === "members"
                  ? "bg-white font-medium shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => setActiveSection("members")}
            >
              <Users className="w-4 h-4" /> Members
            </button>

            <button
              className={`w-full flex items-center gap-2 px-6 py-2 text-sm rounded-md transition ${
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

          {activeSection === "members" && (
            <>
              <h1 className="text-xl font-semibold">Members</h1>
              <p className="text-xs text-gray-500">View and manage organization members</p>

              {/* Tabs + Invite */}
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

                {/* Invite form */}
                {activeSubTab === "members" && (
                  <form onSubmit={handleInvite} className="flex items-center gap-2">
                    <input
                      type="email"
                      placeholder="Enter email to add"
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
                      {inviteLoading ? "Adding…" : "Add"}
                    </button>
                  </form>
                )}
              </div>

              {inviteError && (
                <p className="text-[11px] text-red-500 mt-1">{inviteError}</p>
              )}

              {/* Members List */}
              <div className="mt-4 flex-1 overflow-y-auto">
                {loading ? (
                  <p className="text-gray-500 text-sm">Loading…</p>
                ) : activeSubTab === "invitations" ? (
                  <p className="text-gray-600 text-sm">Coming soon…</p>
                ) : members.length === 0 ? (
                  <p className="text-gray-500 text-sm">No members found</p>
                ) : (
                  <div className="rounded-lg overflow-hidden border border-gray-100 bg-white">

                    {/* Header */}
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
                          {/* Avatar + Info */}
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
                              <span className="text-xs text-gray-500">
                                {m.email}
                              </span>
                            </div>
                          </div>

                          {/* Joined */}
                          <span className="text-xs text-gray-600">
                            {m.joined}
                          </span>

                          {/* Role */}
                          <select
                            className="text-xs border rounded-md px-2 py-1 bg-white"
                            value={m.role}
                            onChange={(e) => updateRole(m.email, e.target.value)}
                          >
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>

                          {/* Remove */}
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
              </div>
            </>
          )}

          {activeSection === "settings" && (
            <div className="mt-6">
              <h1 className="text-lg font-semibold">Settings</h1>
              <p className="text-xs text-gray-500">Coming soon…</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
