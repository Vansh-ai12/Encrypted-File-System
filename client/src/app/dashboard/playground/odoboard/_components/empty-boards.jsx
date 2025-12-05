"use client";

import { LayoutPanelLeft, Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const NoBoards = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateBoard = async () => {
    if (loading) return;
    setLoading(true);

    let activeOrgId = localStorage.getItem("activeOrgId");

    if (!activeOrgId) {
      alert("Please select/create an organisation first!");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        title: "Untitled Board",
        organisationId: activeOrgId.toString().trim(), // 🔥 ensure proper format
      };

      const response = await fetch("http://127.0.0.1:8000/board/createBoard/", {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setLoading(false);

      if (!response.ok) {
        alert(result.error || "Failed to create board");
        return;
      }

      // 🔥 Refresh the board list UI
      window.dispatchEvent(new Event("boards-updated"));

      // 🔥 Redirect to board page
      router.push(`/dashboard/playground/board/${result.boardId}`);

    } catch (error) {
      console.error(error);
      alert("Server error!");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 select-none">
      <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg">
        <LayoutPanelLeft className="w-12 h-12 text-white" />
      </div>

      <h2 className="mt-6 text-2xl font-semibold text-gray-900">No Boards Yet</h2>
      <p className="text-gray-500 text-sm mt-2 max-w-xs">
        Create your first board and start organizing.
      </p>

      <button
        disabled={loading}
        onClick={handleCreateBoard}
        className="mt-5 bg-gradient-to-r from-purple-600 to-fuchsia-600
        text-white font-medium text-sm px-5 py-2.5 rounded-lg
        shadow-md flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {loading ? "Creating..." : "Create Board"}
      </button>
    </div>
  );
};
