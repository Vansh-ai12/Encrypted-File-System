"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link as LinkIcon, Pencil, Trash2 } from "lucide-react";
import getCookie from "@/hooks/GetCookie";
export const Action = ({ boardId, currentTitle }) => {
  const router = useRouter();

  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle);

  const [loadingRename, setLoadingRename] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [copied, setCopied] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  /* ================= TOAST ================= */
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type }), 2500);
  };

  /* ================= COPY ================= */
  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/dashboard/playground/board/${boardId}`
    );
    setCopied(true);
    showToast("Board link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  /* ================= RENAME ================= */
  const handleRename = async () => {
    if (!newTitle.trim()) return showToast("Title cannot be empty", "error");

    setLoadingRename(true);
    try {
      const res = await fetch("https://encrypted-file-system-production.up.railway.app/board/renameBoard/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),

         },
        body: JSON.stringify({ boardId, title: newTitle }),
      });

      const data = await res.json();
      setLoadingRename(false);

      if (!res.ok) return showToast(data.error || "Rename failed", "error");

      setShowRename(false);
      showToast("Board renamed");
      window.dispatchEvent(new Event("boards-updated"));
      router.refresh();
    } catch {
      setLoadingRename(false);
      showToast("Rename failed", "error");
    }
  };

  /* ================= DELETE ================= */
  const handleDelete = async () => {
    setLoadingDelete(true);
    try {
      const res = await fetch("https://encrypted-file-system-production.up.railway.app/board/removeBoard/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),

         },
        body: JSON.stringify({ boardId }),
      });

      const data = await res.json();
      setLoadingDelete(false);

      if (!res.ok) return showToast(data.error || "Delete failed", "error");

      setShowDelete(false);
      showToast("Board deleted");
      window.dispatchEvent(new Event("boards-updated"));
      router.refresh();
    } catch {
      setLoadingDelete(false);
      showToast("Delete failed", "error");
    }
  };

  return (
    <>
      {/* ================= DROPDOWN ================= */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="
          bg-white/95 backdrop-blur-sm
          border border-gray-200
          shadow-xl rounded-lg
          py-2 min-w-[170px]
          animate-dropdown
        "
      >
        {/* Copy */}
        <MenuItem
          icon={<LinkIcon size={16} />}
          label={copied ? "Copied!" : "Copy board link"}
          onClick={handleCopy}
        />

        {/* Rename */}
        <MenuItem
          icon={<Pencil size={16} />}
          label="Rename board"
          onClick={() => setShowRename(true)}
        />

        {/* Delete */}
        <MenuItem
          icon={<Trash2 size={16} />}
          label="Delete board"
          danger
          onClick={() => setShowDelete(true)}
        />
      </div>

      {/* ================= RENAME MODAL ================= */}
      {showRename && (
        <Modal onClose={() => setShowRename(false)}>
          <h3 className="text-lg font-semibold mb-3">Edit Board Title</h3>

          <input
            className="w-full px-3 py-2 border rounded-lg"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />

          <PrimaryButton
            loading={loadingRename}
            onClick={handleRename}
            text="Save"
          />
        </Modal>
      )}

      {/* ================= DELETE MODAL ================= */}
      {showDelete && (
        <Modal onClose={() => setShowDelete(false)}>
          <h3 className="text-lg font-semibold">Delete Board?</h3>
          <p className="text-xs text-gray-600 mt-2">
            This action is permanent.
          </p>

          <DangerButton
            loading={loadingDelete}
            onClick={handleDelete}
          />
        </Modal>
      )}

      {/* ================= TOAST ================= */}
      {toast.show && (
        <div
          className={`
            fixed bottom-4 right-4 px-4 py-2
            text-white rounded-lg text-sm shadow-lg
            ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}
          `}
        >
          {toast.message}
        </div>
      )}
    </>
  );
};

/* ================= UI HELPERS ================= */

const MenuItem = ({ icon, label, onClick, danger = false }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`
      w-full px-3 py-2 text-sm
      flex items-center gap-2
      rounded-md transition
      ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100"
      }
    `}
  >
    {icon}
    {label}
  </button>
);

const Modal = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-xl p-6 shadow-2xl w-[340px]"
      onClick={(e) => e.stopPropagation()}
    >
      {children}

      <button
        className="w-full mt-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg py-2"
        onClick={onClose}
      >
        Cancel
      </button>
    </div>
  </div>
);

const PrimaryButton = ({ onClick, loading, text }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="
      w-full py-2 mt-4
      bg-gray-900 text-white
      rounded-lg hover:bg-gray-800
      disabled:opacity-50
    "
  >
    {loading ? "Saving…" : text}
  </button>
);

const DangerButton = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="
      w-full py-2 mt-4
      bg-red-500 text-white
      rounded-lg hover:bg-red-600
      disabled:opacity-50
    "
  >
    {loading ? "Deleting…" : "Delete"}
  </button>
);
