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
      value
        .toLowerCase()
        .trim()
        .replace(/ /g, "-")
        .replace(/[^a-z0-9\-]/g, "")
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

      if (previewFile) {
        formData.append("imgUrl", previewFile);
      }

      const res = await fetch(
        "http://127.0.0.1:8000/boardOrganisation/addOrganisation/",
        {
          method: "POST",
          credentials: "include",
          body: formData,
        }
      );

      const data = await res.json();
      console.log("Response:", data);

      if (!res.ok) {
        alert(data.error || "Something went wrong ❌");
        return;
      }

      setShowInviteModal(false);
      setShowToast(true);

      // Clear everything
      setOrgName("");
      setSlug("");
      setEmails("");
      setRole("");
      setPreview(null);
      setPreviewFile(null);

      setTimeout(() => setShowToast(false), 2500);

      // Refresh organisations list automatically
      window.location.reload();

    } catch (error) {
      console.error("Server Error ❌", error);
    }
  };

  const handleCreate = () => {
    if (isOrgValid) setShowInviteModal(true);
  };

  const handleSkip = () => {
    sendCreateRequest(null);
  };

  const handleInviteSend = () => {
    const firstEmail = emails.split(/[\s,]+/)[0];
    sendCreateRequest(firstEmail);
  };

  return (
    <>
      {/* Main Create Form */}
      <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 max-w-[420px] mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Create Organization
        </h2>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-md border border-gray-300 bg-gray-100 flex items-center justify-center overflow-hidden">
            {preview ? (
              <img src={preview} className="w-full h-full object-cover" />
            ) : (
              <img
                src="https://img.icons8.com/ios-filled/50/image.png"
                className="w-6 h-6 opacity-60"
              />
            )}
          </div>

          <label className="text-sm text-blue-600 cursor-pointer hover:underline">
            Upload image
            <input type="file" className="hidden" onChange={onImageChange} />
          </label>
        </div>

        <label className="text-sm font-medium text-gray-700">
          Organization name
        </label>
        <input
          value={orgName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter organization name"
          className="mt-1 mb-4 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />

        <label className="text-sm font-medium text-gray-700">
          Slug URL
        </label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="org-slug"
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />

        <Button
          className={`w-full mt-6 text-white text-sm transition ${
            isOrgValid
              ? "bg-[#7B3FF8] hover:bg-[#692BD1]"
              : "bg-[#7B3FF8]/40 cursor-not-allowed"
          }`}
          disabled={!isOrgValid}
          onClick={handleCreate}
        >
          CREATE ORGANIZATION
        </Button>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl shadow-lg w-[420px] animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Invite members</h2>

            <label className="text-sm font-medium">Email addresses</label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter or paste one email…"
              className="mt-1 w-full h-20 px-3 py-2 border border-gray-300 rounded-md text-sm"
            />

            <label className="text-sm font-medium mt-4 block">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Select</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </select>

            <div className="flex justify-between mt-6">
              <Button variant="ghost" className="text-gray-600" onClick={handleSkip}>
                Skip
              </Button>

              <Button
                className={`text-white transition ${
                  isInviteValid
                    ? "bg-[#7B3FF8] hover:bg-[#692BD1]"
                    : "bg-[#7B3FF8]/40 cursor-not-allowed"
                }`}
                disabled={!isInviteValid}
                onClick={handleInviteSend}
              >
                Send Invitation
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-[#7B3FF8] text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-slide-up">
          Organization created successfully 🎉
        </div>
      )}
    </>
  );
}

