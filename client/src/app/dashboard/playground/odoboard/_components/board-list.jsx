"use client";

import { useRef, useEffect, useState } from "react";
import { EmptyFavorites } from "./empty-favorties";
import { EmptySearch } from "./empty-search";
import { NoBoards } from "./empty-boards";
import { NewBoardButton } from "./new-board-button";
import { Action } from "./action";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import getCookie from "@/hooks/GetCookie";
const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const BoardList = ({ search, favorites }) => {
  const menuRef = useRef(null);
  const router = useRouter();

  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(null);
  const [activeOrgId, setActiveOrgId] = useState(
    localStorage.getItem("activeOrgId")
  );

 
  useEffect(() => {
    const updateOrg = () => {
      const id = localStorage.getItem("activeOrgId");
      setActiveOrgId(id);
    };
    window.addEventListener("org-changed", updateOrg);
    return () => window.removeEventListener("org-changed", updateOrg);
  }, []);


  const fetchBoards = async () => {
    if (!activeOrgId) {
      setBoards([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `https://encrypted-file-system-production.up.railway.app/board/getBoards/?orgId=${activeOrgId}`,
        { credentials: "include" }
      );
      const json = await res.json();

      setBoards(
        (json.boards || []).map((b) => ({
          ...b,
          isFavorite: b.fav ?? false,
        }))
      );
    } catch (err) {
      console.error("Error fetching boards:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load on mount + when org changes
  useEffect(() => {
    fetchBoards();
  }, [activeOrgId]);

  // Refresh when boards updated
  useEffect(() => {
    const listener = () => fetchBoards();
    window.addEventListener("boards-updated", listener);
    return () => window.removeEventListener("boards-updated", listener);
  }, [activeOrgId]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleFavorite = async (boardId, currentFav) => {
    const updated = boards.map((b) =>
      b.boardId === boardId ? { ...b, isFavorite: !currentFav } : b
    );
    setBoards(updated);

    try {

      await fetch("https://encrypted-file-system-production.up.railway.app/board/toggleFavorite/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
         },
        body: JSON.stringify({ boardId, isFavorite: !currentFav }),
      });
    } catch (err) {
      console.error("Fav update failed:", err);
    }
  };

  let filteredBoards = [...boards];

  if (search) {
    filteredBoards = filteredBoards.filter((b) =>
      b.title.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (favorites) {
    filteredBoards = filteredBoards.filter((b) => b.isFavorite);
  }

  // Empty states
  if (loading)
    return (
      <div className="text-center mt-10 text-gray-500">Loading boards…</div>
    );
  if (!filteredBoards.length && search) return <EmptySearch />;
  if (!filteredBoards.length && favorites) return <EmptyFavorites />;
  if (!filteredBoards.length) return <NoBoards />;

  return (
    <div className="flex flex-col w-full h-full">
      <h2 className="text-lg font-semibold px-2 mb-3 sticky top-0 z-20 bg-white">
        {favorites ? "Favorite boards" : "Team boards"}
      </h2>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-6
        overflow-y-auto px-2 pb-4 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300"
        style={{ maxHeight: "calc(100vh - 150px)" }}
      >
        {!favorites && <NewBoardButton cardHeight="245px" />}

        {filteredBoards.map((board) => (
          <div
            key={board.boardId}
            className="group relative bg-white border border-gray-200 
            shadow-md rounded-2xl cursor-pointer transition-all hover:shadow-lg hover:border-gray-300 
            h-[245px] flex flex-col "
            onClick={() => router.push(`/dashboard/playground/board/${board.boardId}`)}
          >
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(
                    openMenu === board.boardId ? null : board.boardId
                  );
                }}
                className="absolute top-2 right-2 z-30 p-1.5 rounded-full
                opacity-0 group-hover:opacity-100 bg-black/50 hover:bg-black/70 backdrop-blur-sm transition shadow-md"
              >
                <svg fill="white" viewBox="0 0 24 24" className="w-4 h-4">
                  <circle cx="6" cy="12" r="1.4" />
                  <circle cx="12" cy="12" r="1.4" />
                  <circle cx="18" cy="12" r="1.4" />
                </svg>
              </button>

              {openMenu === board.boardId && (
                <div ref={menuRef} className="absolute top-[42px] right-2 z-30">
                  <Action boardId={board.boardId} currentTitle={board.title} />
                </div>
              )}

              <div className="relative w-full h-[150px] rounded-t-xl overflow-hidden">
                <img
                  src={`https://encrypted-file-system-production.up.railway.app${board.imageUrl}`}
                  className="w-full h-full object-cover object-center transition duration-300
             group-hover:brightness-95 group-hover:scale-[1.01]"
                  alt={board.title}
                />
                <div
                  className="absolute inset-0 bg-[rgba(0,0,0,0.08)] opacity-0
             group-hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-between">
              <h3 className="px-3 pt-2 text-[13px] font-medium text-gray-900 truncate">
                {board.title}
              </h3>

              <div
                className="flex justify-between items-center px-3 pb-2 pt-1
                text-[11px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span>{formatDate(board.createdAt)}</span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(board.boardId, board.isFavorite);
                  }}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition flex items-center justify-center"
                >
                  <Star
                    size={16}
                    className={`transition-all duration-200 ${
                      board.isFavorite
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
