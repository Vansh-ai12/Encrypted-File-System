"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";

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
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [removeSuccess, setRemoveSuccess] = useState("");

  // Logged user info
  const loggedInEmail =
    typeof window !== "undefined" ? localStorage.getItem("email") : "";

  const creatorEmail =
    typeof window !== "undefined" ? localStorage.getItem("creatorEmail") : "";

  const getCurrentOrgId = () =>
    (typeof window !== "undefined" && localStorage.getItem("activeOrgId")) ||
    orgId;

  // ---------------- FETCH WRAPPERS ----------------
  const refreshAll = () => {
    validateOrg();
    fetchMembers();
    fetchInvitations();
  };

  // Validate org + store creatorEmail
  const validateOrg = async () => {
    const id = getCurrentOrgId();

    const res = await fetch(
      "https://encrypted-file-system-production.up.railway.app/boardOrganisation/getOrganisations/",
      { credentials: "include" }
    );

    const data = await res.json();

    const match = data.organisations?.find((o) => o.organisationId === id);

    if (!match) return onClose?.();

    // ⭐ STORE CREATOR EMAIL HERE
    if (match.creatorEmail) {
      localStorage.setItem("creatorEmail", match.creatorEmail);
    }

    setOrgInfo(match);
  };

  const fetchMembers = async () => {
    const id = getCurrentOrgId();
    setLoadingMembers(true);

    const res = await fetch(
      `https://encrypted-file-system-production.up.railway.app/boardOrganisation/getOrganisationMembers/${id}/`,
      { credentials: "include" }
    );

    const data = await res.json();

    const updated = (data.members || []).map((m) => ({
      ...m,
      isCreator: m.email === creatorEmail,
    }));

    setMembers(updated);
    setLoadingMembers(false);
  };

  const fetchInvitations = async () => {
    const id = getCurrentOrgId();
    setLoadingInvites(true);

    const res = await fetch(
      `https://encrypted-file-system-production.up.railway.app/boardOrganisation/getInvitations/${id}/`,
      { credentials: "include" }
    );

    const data = await res.json();
    setInvitations(data.invitations || []);
    setLoadingInvites(false);
  };

  useEffect(() => {
    refreshAll();
    window.addEventListener("org-changed", refreshAll);
    return () => window.removeEventListener("org-changed", refreshAll);
  }, []);

  // ---------------- ROLE UPDATE (FRONTEND RESTRICTED) ----------------
  const updateRole = async (email, newRole) => {
    const target = members.find((m) => m.email === email);
    const adminCount = members.filter((m) => m.role === "admin").length;

    if (!target) return;

    if (target.isCreator) return alert("Creator role cannot be changed.");

    if (email === loggedInEmail && newRole !== "admin")
      return alert("You cannot demote yourself.");

    if (target.role === "admin" && newRole !== "admin")
      return alert("Admins cannot be demoted.");

    if (adminCount === 1 && newRole !== "admin" && target.role === "admin")
      return alert("There must be at least one admin.");

    const id = getCurrentOrgId();

    await fetch("https://encrypted-file-system-production.up.railway.app/boardOrganisation/updateMemberRole/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: newRole, orgId: id }),
    });

    fetchMembers();
  };

  // ---------------- REMOVE MEMBER (FRONTEND RESTRICTED) ----------------
  const removeUser = async (email) => {
    const target = members.find((m) => m.email === email);
    const adminCount = members.filter((m) => m.role === "admin").length;

    if (!target) return;

    if (email === loggedInEmail) return alert("You cannot remove yourself.");

    if (target.isCreator) return alert("Creator cannot be removed.");

    if (target.role === "admin") return alert("Admins cannot be removed.");

    if (target.role === "admin" && adminCount === 1)
      return alert("Cannot remove the last admin.");

    const id = getCurrentOrgId();

    const res = await fetch(
      "https://encrypted-file-system-production.up.railway.app/boardOrganisation/removeMember/",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, orgId: id }),
      }
    );

    if (res.ok) {
      setRemoveSuccess("Member removed ✔️");
      setTimeout(() => setRemoveSuccess(""), 2500);
    }

    fetchMembers();
  };

  // ---------------- SEND INVITE ----------------
  const handleInvite = async (e) => {
    e.preventDefault();

    if (!inviteEmail.trim()) return setInviteError("Enter a valid email");

    setInviteLoading(true);
    setInviteSuccess("");
    setInviteError("");

    const id = getCurrentOrgId();

    const res = await fetch(
      "https://encrypted-file-system-production.up.railway.app/boardOrganisation/sendInvitation/",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          orgId: id,
          role: inviteRole,
        }),
      }
    );

    const data = await res.json();
    setInviteLoading(false);

    if (!res.ok) return setInviteError(data.error || "Failed to send invite");

    setInviteEmail("");
    setInviteSuccess("Invitation sent ✔️");
    fetchInvitations();

    setTimeout(() => setInviteSuccess(""), 3000);
  };

  // ---------------- DELETE ORG ----------------
  const handleDeleteOrganisation = async () => {
    setDeleting(true);
    const id = getCurrentOrgId();

    await fetch("https://encrypted-file-system-production.up.railway.app/boardOrganisation/deleteOrganisation/", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: id }),
    });

    localStorage.removeItem("activeOrgId");
    window.dispatchEvent(new Event("org-changed"));
    onClose?.();
  };

  // ---------------- UI ----------------
  if (!orgInfo)
    return (
      <div className="flex items-center justify-center w-full h-72">
        <p className="text-gray-400 text-xs">Loading organisation...</p>
      </div>
    );

  const orgInitial = orgInfo.organisationName?.charAt(0).toUpperCase() || "?";

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200]">
      {removeSuccess && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-5 py-2 rounded-lg shadow">
          {removeSuccess}
        </div>
      )}

      {(inviteSuccess || inviteError) && (
        <div
          className={`absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-lg text-xs shadow flex items-center gap-2 ${
            inviteSuccess ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {inviteSuccess ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          {inviteSuccess || inviteError}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg w-[1250px] max-w-[96vw] h-[700px] overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-700"
        >
          ✕
        </button>

        <div className="flex h-full">
          {/* SIDEBAR */}
          <div className="w-64 bg-white p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-600 text-white font-semibold rounded-lg flex items-center justify-center">
                {orgInitial}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {orgInfo.organisationName}
                </p>
                <p className="text-[11px] text-gray-500">Organisation</p>
              </div>
            </div>

            {[
              { section: "members", icon: Users, label: "Members" },
              { section: "settings", icon: SettingsIcon, label: "Settings" },
            ].map(({ section, icon: Icon, label }) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition text-sm ${
                  activeSection === section
                    ? "bg-indigo-100 text-indigo-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 bg-gray-50 p-8 overflow-y-auto">
            {activeSection === "settings" ? (
              <>
                <h2 className="text-lg font-semibold text-gray-800">
                  Danger Zone
                </h2>

                <div className="bg-red-50 p-6 rounded-xl mt-4 space-y-3 shadow-sm">
                  <p className="text-sm font-semibold text-red-700">
                    Delete Organisation
                  </p>
                  <p className="text-[11px] text-red-600">
                    Type {orgInfo.organisationName} to confirm deletion.
                  </p>

                  <input
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    className="
                      px-4 py-2 text-xs rounded-lg bg-white border border-gray-300 shadow-sm
                      focus:ring-2 focus:ring-red-400 focus:border-red-400 transition w-full
                    "
                  />

                  <button
                    disabled={confirmName !== orgInfo.organisationName}
                    onClick={handleDeleteOrganisation}
                    className="w-full py-2 text-xs bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-40"
                  >
                    {deleting ? "Deleting…" : "Delete Organisation"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-gray-800">Members</h2>

                <div className="flex gap-6 mt-3 text-sm">
                  {["members", "invites"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveSubTab(tab)}
                      className={`pb-1 transition ${
                        activeSubTab === tab
                          ? "text-indigo-700 font-medium border-b-2 border-indigo-600"
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {tab === "members" ? "Members" : "Invitations"}
                    </button>
                  ))}
                </div>

                <div className="bg-white mt-4 rounded-xl shadow-sm overflow-y-auto overflow-x-hidden
 max-h-[360px]">
                  {activeSubTab === "members" &&
                    (loadingMembers ? (
                      <p className="p-4 text-xs text-gray-500">Loading...</p>
                    ) : members.length === 0 ? (
                      <p className="p-4 text-xs text-gray-500">
                        No members added
                      </p>
                    ) : (
                      members.map((m, i) => {
                        const isYou = m.email === loggedInEmail;

                        return (
                          <div
                            key={i}
                            className="grid grid-cols-4 px-4 py-3 text-xs hover:bg-gray-50 transition"
                          >
                            <div>
                              <p className="font-medium flex items-center gap-1">
                                {m.username}
                                {m.isCreator && (
                                  <span className="bg-purple-100 text-purple-700 text-[10px] px-1 rounded">
                                    Creator
                                  </span>
                                )}
                                {isYou && (
                                  <span className="bg-gray-200 text-gray-700 text-[10px] px-1 rounded">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {m.email}
                              </p>
                            </div>

                            <span>{m.joined}</span>

                            <div className="relative w-[120px]">
                              <select
                                value={m.role}
                                onChange={(e) =>
                                  updateRole(m.email, e.target.value)
                                }
                                disabled={m.isCreator}
                                className="
      w-full px-3 py-2 text-xs rounded-lg
      bg-gray-100 text-gray-800
      border border-transparent
      focus:outline-none focus:ring-2 focus:ring-indigo-400
      appearance-none
      disabled:opacity-60
      cursor-pointer
    "
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                              </select>

                              {/* Custom arrow */}
                              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">
                                ▾
                              </span>
                            </div>

                            {m.isCreator || isYou ? (
                              <span className="text-gray-400">—</span>
                            ) : m.role === "admin" ? (
                              <span className="text-gray-400">Admin</span>
                            ) : (
                              <button
                                onClick={() => removeUser(m.email)}
                                className="text-red-600 hover:underline font-medium"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        );
                      })
                    ))}

                  {activeSubTab === "invites" &&
                    (loadingInvites ? (
                      <p className="p-4 text-xs text-gray-500">Loading...</p>
                    ) : invitations.length === 0 ? (
                      <p className="p-4 text-xs text-gray-500">No invites</p>
                    ) : (
                      invitations.map((i, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-3 px-4 py-3 text-xs hover:bg-gray-50 transition"
                        >
                          <span>{i.email}</span>
                          <span>{i.role}</span>
                          <span className="text-indigo-600 text-right font-medium">
                            Pending
                          </span>
                        </div>
                      ))
                    ))}
                </div>

                {activeSubTab === "members" && (
                  <form
                    onSubmit={handleInvite}
                    className="flex gap-2 mt-4 text-xs"
                  >
                    <input
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Invite by email"
                      className="
                        px-4 py-2 rounded-lg bg-white border border-gray-300 shadow-sm
                        focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition w-60
                      "
                    />

                    <div className="relative w-[120px]">
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="
                          w-full px-3 py-2 rounded-lg bg-white border border-gray-300 shadow-sm
                          focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition appearance-none pr-8
                        "
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-[10px]">
                        ▾
                      </span>
                    </div>

                    <button
                      disabled={inviteLoading}
                      className="
                        bg-indigo-600 text-white px-4 py-2 rounded-lg shadow
                        hover:bg-indigo-700 disabled:opacity-40 transition
                      "
                    >
                      {inviteLoading ? "Sending…" : "Send Invite"}
                    </button>
                  </form>
                )}

                {inviteError && (
                  <p className="text-xs text-red-500 mt-2">{inviteError}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
