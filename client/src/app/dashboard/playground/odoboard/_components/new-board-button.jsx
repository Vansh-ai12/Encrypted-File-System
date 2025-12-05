"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export const NewBoardButton = () => {
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const router = useRouter();

  const notify = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleCreateBoard = async () => {
    if (loading) return;
    setLoading(true);

    const activeOrgId = localStorage.getItem("activeOrgId");
    if (!activeOrgId) {
      alert("Select or create an organisation first!");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/board/createBoard/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Board",
          organisationId: activeOrgId,
        }),
      });

      const json = await res.json();
      setLoading(false);

      if (!res.ok) {
        alert(json.error || "Server error!");
        return;
      }

      notify();
      window.dispatchEvent(new Event("boards-updated"));

      // 🔥 Correct redirect
      router.push(`/dashboard/playground/board/${json.boardId}`);

    } catch (err) {
      console.error(err);
      alert("Server error!");
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCreateBoard}
        disabled={loading}
        className="bg-blue-600 text-white rounded-xl flex flex-col items-center justify-center gap-3 font-medium text-sm shadow-sm hover:bg-blue-700 active:scale-95 transition h-[245px] w-full"
      >
        <Plus className="w-7 h-7" />
        {loading ? "Creating..." : "New board"}
      </button>

      {showToast && (
        <div className="fixed bottom-8 right-8 bg-white text-black font-medium px-5 py-3 rounded-xl shadow-xl border border-gray-200 animate-toast pointer-events-none flex items-center gap-2">
          ✓ Board created
        </div>
      )}

      <style jsx>{`
        .animate-toast {
          animation: fadeMove 2s ease forwards;
        }
        @keyframes fadeMove {
          0% { opacity: 0; transform: translateY(10px); }
          20% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; }
          100% { opacity: 0; transform: translateY(10px); }
        }
      `}</style>
    </>
  );
};
