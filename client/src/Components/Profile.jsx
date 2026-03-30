"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef(null);

  const [userEmail, setUserEmail] = useState("");

  const handleLogoutConfirm = async () => {
    try {
      await fetch("http://localhost:8000/user/logout/", {
        method: "POST",
        credentials: "include",
      });

      setShowConfirm(false);
      localStorage.removeItem("isLoggedIn");
      router.push("/");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:8000/user/check/", {
          credentials: "include",
        });

        const data = await res.json();

        if (data.email) {
          setUserEmail(data.email);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };

    fetchUser();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <div
          className="w-10 h-10 rounded-md bg-[#1e1f26] border border-white/10 flex items-center justify-center text-[#facc15] font-black cursor-pointer hover:border-[#facc15] transition-all"
          onClick={() => setOpen(!open)}
        >
          {userEmail ? userEmail.charAt(0).toUpperCase() : "U"}
        </div>

        {open && (
          <div className="absolute right-0 mt-4 w-64 bg-[#1e1f26] border border-white/20 rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2 z-50">
            <div className="px-4 py-3 border-b border-white/10 bg-black/20">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                Account
              </p>
              <p className="text-sm font-bold text-white">
                {userEmail || "Loading..."}
              </p>
            </div>
            {/* Updated hover color here */}
            <div className="group px-4 py-3 text-sm text-gray-300 hover:bg-[#facc15] hover:text-black cursor-pointer transition-all">
              Profile Settings
            </div>
            <div
              className="px-4 py-3 text-sm text-red-500 hover:bg-red-500/10 cursor-pointer border-t border-white/5 font-bold"
              onClick={() => {
                setOpen(false); // ✅ close dropdown
                setShowConfirm(true);
              }}
            >
              Log Out
            </div>
          </div>
        )}
      </div>
      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/80  flex items-start justify-center pt-[120px]">
          ss
          {/* CARD */}
          <div className="relative w-[360px] bg-[#0b0f14] border border-white/10 rounded-2xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
            {/* subtle glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#facc15]/10 via-transparent to-transparent pointer-events-none" />

            {/* HEADER */}
            <div className="relative z-10">
              <h2 className="text-lg font-bold text-white">
                Are you sure you want to logout?
              </h2>
            </div>

            {/* ACTIONS */}
            <div className="relative z-10 flex justify-end gap-3 mt-6">
              {/* CANCEL */}
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-xs font-bold rounded-lg border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>

              {/* LOGOUT */}
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#facc15] text-black hover:scale-105 transition shadow-[0_0_15px_rgba(250,204,21,0.3)]"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
