"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function Profile() {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef(null);

  const handleLogoutConfirm = async () => {
    try {
      await fetch("http://127.0.0.1:8000/user/logout/", {
        method: "POST",
        credentials: "include",
      });

      setShowConfirm(false);
      router.push("/"); 
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

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
      {/* Avatar & Dropdown Wrapper */}
      <div className="relative" ref={dropdownRef}>
        {/* Avatar Circle */}
        <div
          className="w-10 h-10 bg-[#4F46E5] text-white rounded-full 
          flex items-center justify-center font-semibold cursor-pointer 
          hover:bg-[#4338CA] transition"
          onClick={() => setOpen(!open)}
        >
          V
        </div>

        {/* Dropdown */}
        {open && (
          <div
            className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-lg 
            border border-gray-100 py-3 z-50"
          >
            <div
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Profile
            </div>
            <div
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
            >
              Settings
            </div>

            <div className="border-t border-gray-200 my-2"></div>

            <div
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 
              cursor-pointer font-medium"
            >
              Logout
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-[320px] p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800">Logout?</h2>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to logout from your account?
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-1.5 rounded-lg text-gray-700 
                bg-gray-100 hover:bg-gray-200 transition hover:cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-1.5 rounded-lg text-white 
                bg-red-600 hover:bg-red-500 transition hover:cursor-pointer"
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
