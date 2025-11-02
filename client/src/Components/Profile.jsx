"use client";

import { useState } from "react";

export default function Profile() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      
      <div
        className="w-10 h-10 rounded-full bg-indigo-300 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-indigo-500 transition"
        onClick={() => setOpen(!open)}
      >
        <span className="text-indigo-700 font-semibold">V</span>
      </div>

    
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 shadow-lg rounded-xl py-2 z-50">
          <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer rounded-md">
            Settings
          </div>
          <div className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer rounded-md">
            Profile
          </div>
          <div className="px-4 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer rounded-md">
            Logout
          </div>
        </div>
      )}
    </div>
  );
}
