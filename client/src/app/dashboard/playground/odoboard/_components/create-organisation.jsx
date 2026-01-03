"use client";

import { useState } from "react";
import { Button } from "@/Components/ui/button";

export default function CreateOrganization() {
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("");

  const isOrgValid = orgName.trim() !== "" && slug.trim() !== "";
  const isInviteValid = emails.trim() !== "" && role.trim() !== "";

  const onNameChange = (value) => {
    setOrgName(value);
    setSlug(
      value.toLowerCase().trim().replace(/ /g, "-").replace(/[^a-z0-9\-]/g, "")
    );
  };

  const onImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const sendCreateRequest = async (emailValue) => {
    try {
      const formData = new FormData();
      formData.append("organisationName", orgName);
      formData.append("slug", slug);
      formData.append("emailM", emailValue || "");
      formData.append("role", role || "member");
      if (previewFile) formData.append("imgUrl", previewFile);

      const res = await fetch(
        "http://localhost:8000/boardOrganisation/addOrganisation/",
        { method: "POST", credentials: "include", body: formData }
      );

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Something went wrong ❌");
        return;
      }

      setShowInviteModal(false);
      setShowToast(true);

      setOrgName("");
      setSlug("");
      setEmails("");
      setRole("");
      setPreview(null);
      setPreviewFile(null);

      setTimeout(() => setShowToast(false), 2500);
      window.location.reload();
    } catch (error) {
      console.error("Server Error ❌", error);
    }
  };

  const handleCreate = () => isOrgValid && setShowInviteModal(true);
  const handleSkip = () => sendCreateRequest(null);
  const handleInviteSend = () => sendCreateRequest(emails.split(/[\s,]+/)[0]);

  return (
    <>
      {/* Main Create Form */}
      <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-200 max-w-[420px] mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 text-center">
          Create Organization
        </h2>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img src={preview} className="w-full h-full object-cover" />
            ) : (
              <span className="text-gray-400 text-xs">Logo</span>
            )}
          </div>

          <label className="text-xs text-blue-600 cursor-pointer hover:underline">
            Upload Image
            <input type="file" className="hidden" onChange={onImageChange} />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-700">Organisation Name</label>
            <input
              className="mt-1 w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-md text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              value={orgName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ex: Putka Enterprise"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Slug (URL)</label>
            <input
              className="mt-1 w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-md text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="putka-enterprise"
            />
          </div>
        </div>

        {/* Create Button */}
        <Button
          disabled={!isOrgValid}
          onClick={handleCreate}
          className={`w-full mt-6 rounded-lg text-sm font-medium shadow-md transition-all duration-200
            ${
              isOrgValid
                ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 text-white active:scale-95"
                : "bg-gradient-to-r from-fuchsia-600/40 to-purple-600/40 cursor-not-allowed text-white/50"
            }`}
        >
          Create Organization
        </Button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200]">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[420px] border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Invite Members</h2>

            <label className="text-sm font-medium text-gray-700">
              Email Address
            </label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter one email…"
              className="mt-1 w-full bg-white border border-gray-300 text-gray-900 h-20 rounded-md px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />

            <label className="text-sm font-medium text-gray-700 mt-4 block">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded-md text-sm"
            >
              <option value="">Select Role</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>

            <div className="flex justify-between mt-6">
              <Button variant="ghost" className="text-gray-700" onClick={handleSkip}>
                Skip
              </Button>

              <Button
                disabled={!isInviteValid}
                onClick={handleInviteSend}
                className={`rounded-lg text-sm font-medium shadow-md transition-all duration-200
                  ${
                    isInviteValid
                      ? "bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:opacity-90 text-white active:scale-95"
                      : "bg-gradient-to-r from-fuchsia-600/40 to-purple-600/40 cursor-not-allowed text-white/50"
                  }`}
              >
                Send Invite
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-slide-up z-[200]">
          Organisation created 🎉
        </div>
      )}
    </>
  );
}
