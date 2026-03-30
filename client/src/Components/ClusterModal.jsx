"use client";
import { useState } from "react";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_PDF_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "pdf",
  "docx",
  "ppt",
  "txt",
  "js",
  "ts",
  "java",
  "cpp",
  "c",
  "py",
  "html",
  "css",
  "json",
];

import { encryptFile } from "@/lib/crypto";

import getCookie from "@/hooks/GetCookie";

export default function ClusterModal({ isOpen, onClose, onCreated }) {
  const [clusterName, setClusterName] = useState("");

  const [loading, setLoading] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);

  const [fileError, setFileError] = useState("");

  const resetForm = () => {
    setClusterName("");
    setSelectedFile(null);
  };

  if (!isOpen) return null;

  const handleDeploy = async () => {
    setLoading(true);

    try {
      const workspaceRes = await fetch("http://localhost:8000/workspaces/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
          name: clusterName,
          description: "local-upload",
          type: "local",
        }),
      });

      if (!workspaceRes.ok) {
        const err = await workspaceRes.text();
        console.error("Workspace creation failed:", err);
        throw new Error("Workspace creation failed");
      }

      const workspaceData = await workspaceRes.json();

      if (!workspaceData?.id) {
        throw new Error("Workspace ID missing");
      }

      if (selectedFile && workspaceData.id) {
        const filePayload = await encryptFile(selectedFile, clusterName);

        localStorage.setItem(`cluster_key_${workspaceData.id}`, clusterName);

        await new Promise((resolve) => setTimeout(resolve, 300));

        console.log("Uploading encrypted file...");

        const detectedMime =
          selectedFile.type && selectedFile.type !== "application/octet-stream"
            ? selectedFile.type
            : `image/${selectedFile.name.split(".").pop()}`;

        const formData = new FormData();

        formData.append("ciphertext", filePayload.ciphertextBase64);
        formData.append("iv", filePayload.ivBase64);
        formData.append("salt", filePayload.saltBase64);
        formData.append("workspace_id", workspaceData.id);
        formData.append("originalName", selectedFile.name);
        formData.append("mimeType", detectedMime);
        formData.append("size", selectedFile.size);

        const uploadRes = await fetch("http://localhost:8000/uploads/", {
          method: "POST",
          credentials: "include",
          headers: {
            "X-CSRFToken": getCookie("csrftoken"),
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.text();
          console.error("Upload failed:", err);
          throw new Error("File upload failed");
        }

        console.log("Upload complete");
      }

      await onCreated(workspaceData);

      resetForm();
      onClose();
    } catch (err) {
      console.error("Deployment failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(250,204,21,0.1)] overflow-hidden relative">
        {/* Glow Decor */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#facc15]/10 blur-[100px] rounded-full" />

        <div className="p-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-2xl font-black tracking-tighter text-white uppercase ">
                Initialize <span className="text-[#facc15]">New Cluster</span>
              </h2>
              <p className="text-gray-500 text-[10px] tracking-[0.2em] mt-1 font-mono">
                SECURE PROTOCOL v.2.0.6
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                resetForm();
                onClose();
              }}
              className="text-gray-500 hover:text-white transition-colors text-3xl relative z-50 cursor-pointer p-2"
            >
              ×
            </button>
          </div>

          <div className="space-y-8">
            {/* Cluster Alias */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-[#facc15] uppercase tracking-[0.3em]">
                Cluster Alias
              </label>
              <input
                type="text"
                placeholder="e.g. ALPHA-CENTAURI-PROD"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 outline-none focus:border-[#facc15]/50 focus:ring-1 focus:ring-[#facc15]/20 transition-all font-mono text-sm text-white"
                value={clusterName}
                onChange={(e) => setClusterName(e.target.value)}
              />
            </div>

            {/* Data Pipeline Source */}
            <div className="space-y-4">
              <label className="text-[10px] font-bold text-[#facc15] uppercase tracking-[0.3em]">
                Data Pipeline Source
              </label>

              {/* Local Upload Logic */}

              <div
                className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 bg-white/[0.02] transition-all
${
  fileError
    ? "border-red-500 bg-red-500/5"
    : selectedFile
      ? "border-[#facc15] bg-[#facc15]/5"
      : "border-white/10 hover:border-white/20"
}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("border-[#facc15]");
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-[#facc15]");
                }}
                onDrop={(e) => {
                  e.preventDefault();

                  const file = e.dataTransfer.files[0];
                  if (!file) return;

                  const ext = file.name.split(".").pop().toLowerCase();

                  // 🔥 SIZE VALIDATION (dynamic)
                  if (
                    (ext === "pdf" && file.size > MAX_PDF_SIZE) ||
                    (ext !== "pdf" && file.size > MAX_FILE_SIZE)
                  ) {
                    setFileError(
                      ext === "pdf"
                        ? "PDF exceeds 50MB limit"
                        : "File exceeds 20MB limit",
                    );
                    return;
                  }

                  setFileError("");

                  const name = file.name.toLowerCase();

                  if (name === "readme" || name === "readme.md") {
                    setSelectedFile(file);
                    return;
                  }

                  if (!ALLOWED_EXTENSIONS.includes(ext)) {
                    alert(
                      "Invalid format. Allowed: pdf, images, code files, json, docx, ppt, readme.",
                    );
                    return;
                  }

                  setSelectedFile(file);
                  setFileError("");
                }}
              >
                <input
                  type="file"
                  id="fileUpload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    const name = file.name.toLowerCase();

                    if (name === "readme" || name === "readme.md") {
                      setSelectedFile(file);
                      return;
                    }

                    if (!file) return;

                    const ext = file.name.split(".").pop().toLowerCase();

                    if (
                      (ext === "pdf" && file.size > MAX_PDF_SIZE) ||
                      (ext !== "pdf" && file.size > MAX_FILE_SIZE)
                    ) {
                      setFileError(
                        ext === "pdf"
                          ? "PDF exceeds 50MB limit"
                          : "File exceeds 20MB limit",
                      );
                      return;
                    }

                    setFileError("");

                    if (!ALLOWED_EXTENSIONS.includes(ext)) {
                      alert(
                        "Invalid format. Allowed: pdf, images, code files, json, docx, ppt, readme.",
                      );
                      return;
                    }

                    setSelectedFile(file);
                    setFileError("");
                  }}
                />

                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={selectedFile ? "text-[#facc15]" : "text-gray-500"}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4m14-7-5-5-5 5m5-5v12" />
                </svg>

                <div className="text-center">
                  <p className="text-xs font-medium text-gray-500">
                    {selectedFile ? (
                      <span className="text-white font-mono">
                        {selectedFile.name}
                      </span>
                    ) : (
                      <>
                        Drag and drop repository files or{" "}
                        <label
                          htmlFor="fileUpload"
                          className="text-[#facc15] cursor-pointer hover:underline"
                        >
                          browse
                        </label>
                      </>
                    )}
                  </p>
                  {fileError && (
                    <p className="text-red-500 text-[10px] font-bold mt-2 tracking-wide">
                      {fileError}
                    </p>
                  )}
                  {selectedFile && (
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-[9px] text-red-500 uppercase mt-2 font-bold tracking-widest hover:text-red-400"
                    >
                      Remove File
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-end">
            <button
              disabled={!clusterName || !selectedFile || fileError}
              className="px-10 py-4 bg-[#facc15] text-black font-black rounded-xl hover:shadow-[0_0_30px_rgba(250,204,21,0.4)] transition-all flex items-center gap-3 group disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
              onClick={handleDeploy}
            >
              CREATE SECURE VAULT
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="group-hover:translate-x-1 transition-transform"
              >
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
