"use client";

import { useState } from "react";

export default function SideBar() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState([]);

  return (
    <div className="relative z-50">
      {/* Hamburger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`group p-3 rounded-xl transition-all duration-300 cursor-pointer
          ${open ? "bg-indigo-600" : "bg-white/70 backdrop-blur-sm"}
          shadow-md hover:shadow-lg border border-gray-200 hover:scale-105 active:scale-95`}
      >
        <div className="relative w-6 h-5 flex flex-col justify-between items-center transition-all duration-500">
          <span
            className={`block h-0.5 w-full rounded-full bg-gray-800 transition-all duration-500 ${
              open
                ? "rotate-45 translate-y-[9px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                : "group-hover:w-5/6"
            }`}
          ></span>
          <span
            className={`block h-0.5 w-full rounded-full bg-gray-800 transition-all duration-500 ${
              open ? "opacity-0 translate-x-5" : "group-hover:w-4/5 delay-75"
            }`}
          ></span>
          <span
            className={`block h-0.5 w-full rounded-full bg-gray-800 transition-all duration-500 ${
              open
                ? "-rotate-45 -translate-y-[9px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                : "group-hover:w-5/6 delay-100"
            }`}
          ></span>
        </div>
      </button>

      {/* Sidebar (Floating, Not Fixed, Perfect Width + Height) */}
      <div
        className={`absolute top-0 left-0 w-72 mt-4
          bg-white/90 backdrop-blur-md border border-indigo-100 shadow-[0_0_25px_rgba(99,102,241,0.2)]
          rounded-xl transform transition-transform duration-500 ease-[cubic-bezier(0.77,0,0.175,1)]
          ${open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"}`}
        style={{ height: "80vh" }} // 👈 perfect tall height, not full screen
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-indigo-100">
          <h2 className="text-lg font-semibold text-indigo-700">My Files</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-indigo-600 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* File List */}
        <div className="p-4 space-y-2 overflow-y-auto h-[calc(80vh-64px)]">
          {files.length > 0 ? (
            files.map((file, i) => (
              <div
                key={i}
                className="p-3 bg-indigo-50 text-indigo-700 font-medium rounded-lg shadow-sm 
                  hover:bg-indigo-100 hover:shadow-md transition cursor-pointer"
              >
                {file}
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center mt-10 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 mb-3 text-indigo-400 opacity-70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0l-3 3m3-3l3 3"
                />
              </svg>
              <p className="text-sm text-center font-medium">
                No files uploaded yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
