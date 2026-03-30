"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link as LinkIcon, Menu, Pencil, Trash2 } from "lucide-react";

import OdoBoardLogo from "@/Components/OdoBoardLogo";
import { Hint } from "@/Components/hints";
import { Button } from "@/Components/ui/button";

import { memo } from "react";

import getCookie from "@/hooks/GetCookie";

/* ================= SEPARATOR ================= */
const TabSeparator = () => <div className="mx-2 h-4 w-px bg-neutral-400/80" />;

/* ================= CUSTOM HAMBURGER ================= */

export const Info = memo(() => {
  const { boardId } = useParams();
  const router = useRouter();
  const menuRef = useRef(null);

  const [boardName, setBoardName] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const [showMenu, setShowMenu] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const [loadingRename, setLoadingRename] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  /* ================= TOAST ================= */
  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type }), 2500);
  };

  /* ================= FETCH BOARD NAME ================= */
  useEffect(() => {
    if (!boardId) return;

    fetch(`https://encrypted-file-system-production.up.railway.app/board/getBoardName/${boardId}/`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        setBoardName(data.title);
        setNewTitle(data.title);
      })
      .catch(console.error);
  }, [boardId]);

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showMenu]);

  /* ================= ACTIONS ================= */
  const handleCopy = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/dashboard/playground/board/${boardId}`,
    );
    setShowMenu(false);
    showToast("Board link copied!");
  };

  const handleRename = async () => {
    if (!newTitle.trim()) return showToast("Title cannot be empty", "error");
    setLoadingRename(true);

    try {
      const res = await fetch("https://encrypted-file-system-production.up.railway.app/board/renameBoard/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ boardId, title: newTitle }),
      });

      const data = await res.json();
      setLoadingRename(false);

      if (!res.ok) return showToast(data.error || "Rename failed", "error");

      setBoardName(newTitle);
      setShowRename(false);
      window.dispatchEvent(new Event("boards-updated"));
      router.refresh();
      showToast("Board renamed successfully");
    } catch {
      setLoadingRename(false);
    }
  };

  const handleDelete = async () => {
    setLoadingDelete(true);

    try {
      const res = await fetch("https://encrypted-file-system-production.up.railway.app/board/removeBoard/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ boardId }),
      });

      const data = await res.json();
      setLoadingDelete(false);

      if (!res.ok) return showToast(data.error || "Delete failed", "error");

      window.dispatchEvent(new Event("boards-updated"));
      router.push("/dashboard/playground");
      showToast("Board deleted");
    } catch {
      setLoadingDelete(false);
    }
  };

  /* ================= UI ================= */
  return (
    <>
      {/* ================= TOOLBAR ================= */}
      <div
        data-ui
        className="absolute top-2 left-2 z-[1000] bg-white rounded-lg px-3 py-2 flex items-center shadow-md pointer-events-auto"
      >
        <Hint label="Go to boards" sideOffset={8} side="bottom">
          <div className="px-2 py-1.5 rounded-md hover:bg-sky-200/40 cursor-pointer">
            <OdoBoardLogo size={40} />
          </div>
        </Hint>

        <TabSeparator />

        <Hint label="Rename board" sideOffset={8} side="bottom">
          <Button
            asChild // ✅ IMPORTANT
            variant="board"
            className="bg-transparent p-0"
          >
            <span
              role="button"
              tabIndex={0}
              onClick={() => setShowRename(true)}
              className="px-4 py-2 rounded-md hover:bg-sky-200/40 hover:cursor-pointer"
            >
              <span className="text-[18px] tracking-tight">
                {boardName || "Loading…"}
              </span>
            </span>
          </Button>
        </Hint>

        <TabSeparator />

        {/* MENU */}
        <div className="relative" ref={menuRef}>
          <Hint label="Menu" sideOffset={8} side="bottom">
            <Button
              asChild // ✅ IMPORTANT
              variant="ghost"
              className="h-16 w-[72px] flex items-center justify-center"
            >
              <span
                role="button"
                tabIndex={0}
                onClick={() => setShowMenu((v) => !v)}
                className="cursor-pointer"
              >
                <Menu size={38} strokeWidth={2.8} className="scale-110" />
              </span>
            </Button>
          </Hint>

          {showMenu && (
            <div
              className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-sm
              border border-gray-200 shadow-xl rounded-lg py-2 min-w-[170px] z-50"
            >
              <MenuItem
                icon={<LinkIcon size={16} />}
                label="Copy board link"
                onClick={handleCopy}
              />
              <MenuItem
                icon={<Pencil size={16} />}
                label="Rename board"
                onClick={() => setShowRename(true)}
              />
              <MenuItem
                icon={<Trash2 size={16} />}
                label="Delete board"
                danger
                onClick={() => setShowDelete(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ================= RENAME MODAL ================= */}
      {showRename && (
        <Modal onClose={() => setShowRename(false)}>
          <h3 className="text-lg font-semibold mb-3">Edit Board Title</h3>
          <input
            className="w-full px-3 py-2 border rounded-lg"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <PrimaryBtn
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
          <DangerBtn loading={loadingDelete} onClick={handleDelete} />
        </Modal>
      )}

      {/* ================= TOAST ================= */}
      {toast.show && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 text-white rounded-lg shadow-lg
          ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
});

/* ================= SHARED UI ================= */
const MenuItem = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full px-3 py-2 text-sm flex items-center gap-2 rounded-md
    ${danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-100"}`}
  >
    {icon} {label}
  </button>
);

const Modal = ({ children, onClose }) => (
  <div
    className="fixed inset-0 bg-black/40 flex items-center justify-center z-[999]"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-xl p-6 w-[340px]"
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

const PrimaryBtn = ({ onClick, loading, text }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="w-full py-2 mt-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
  >
    {loading ? "Saving…" : text}
  </button>
);

const DangerBtn = ({ onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="w-full py-2 mt-4 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
  >
    {loading ? "Deleting…" : "Delete"}
  </button>
);
