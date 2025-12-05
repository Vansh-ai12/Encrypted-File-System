"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Link as LinkIcon, Pencil, Trash2 } from "lucide-react";

export const Action = ({ boardId, currentTitle }) => {
  const router = useRouter();

  const [showConfirm, setShowConfirm] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [loadingRename, setLoadingRename] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [copied, setCopied] = useState(false);

  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 2500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/dashboard/board/${boardId}`
    );
    setCopied(true);
    showToast("Board link copied!", "success");
    setTimeout(() => setCopied(false), 1500);
  };

  const handleRename = async () => {
    if (!newTitle.trim()) return showToast("Title cannot be empty!", "error");
    setLoadingRename(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/board/renameBoard/", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, title: newTitle })
      });

      const data = await res.json();
      setLoadingRename(false);

      if (!res.ok) {
        showToast(data.error || "Failed to rename board", "error");
        return;
      }

      setShowRename(false);
      showToast("Board renamed successfully!", "success");
      window.dispatchEvent(new Event("boards-updated"));
      router.refresh();

    } catch (err) {
      console.error("Rename error", err);
      setLoadingRename(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDelete(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/board/removeBoard/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId })
      });

      const data = await res.json();
      setLoadingDelete(false);

      if (!res.ok) {
        showToast(data.error || "Failed to delete board", "error");
        return;
      }

      setShowConfirm(false);
      showToast("Board deleted!", "success");
      window.dispatchEvent(new Event("boards-updated"));
      router.refresh();

    } catch (err) {
      console.error("Delete error", err);
      setLoadingDelete(false);
    }
  };

  return (
    <>
      {/* Dropdown Menu */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-10 right-2 bg-white/95 backdrop-blur-sm 
        border border-gray-200 shadow-xl rounded-lg py-2 min-w-[170px] 
        z-50 animate-dropdown"
      >
        {/* Copy Board */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCopy();
          }}
          className="w-full px-3 py-2 text-sm text-gray-700 text-left
          hover:bg-gray-100 rounded-md transition flex items-center gap-2 hover:cursor-pointer"
        >
          <LinkIcon size={16} className="text-gray-600" />
          {copied ? "Copied!" : "Copy board link"}
        </button>

        {/* Rename */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowRename(true);
          }}
          className="w-full px-3 py-2 text-sm text-gray-700 text-left
          hover:bg-gray-100 rounded-md transition flex items-center gap-2 hover:cursor-pointer"
        >
          <Pencil size={16} className="text-gray-600" />
          Rename board
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowConfirm(true);
          }}
          className="w-full px-3 py-2 text-sm text-red-600 text-left
          hover:bg-red-50 rounded-md transition flex items-center gap-2 hover:cursor-pointer"
        >
          <Trash2 size={16} className="text-red-600" />
          Delete board
        </button>
      </div>

      {/* Rename Modal */}
      {showRename && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-xl p-6 shadow-2xl w-[340px] text-center animate-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Edit Board Title
            </h3>

            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />

            <button
              disabled={loadingRename}
              onClick={handleRename}
              className="w-full py-2 mt-4 text-sm text-white bg-gray-900 
              rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {loadingRename ? "Saving…" : "Save"}
            </button>

            <button
              className="w-full py-2 mt-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              onClick={() => setShowRename(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-xl p-6 shadow-2xl w-[300px] text-center animate-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900">Delete Board?</h3>
            <p className="text-xs text-gray-600 mt-2">This action is permanent.</p>

            <div className="flex justify-between gap-2 mt-5">
              <button
                className="flex-1 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button
                disabled={loadingDelete}
                onClick={handleDelete}
                className="flex-1 py-2 text-sm text-white bg-red-500 rounded-lg
                hover:bg-red-600 disabled:opacity-50"
              >
                {loadingDelete ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 text-white rounded-lg text-sm shadow-lg
          ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
};
