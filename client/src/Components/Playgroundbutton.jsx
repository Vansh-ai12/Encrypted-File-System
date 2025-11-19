"use client";
import React from "react";

/**
 * Simple Indigo Button (Tailwind only)
 * - Indigo theme
 * - Optional icon
 * - No variants/sizes for simplicity
 */

export default function PlaygroundButton({
  label = " Playground",
  icon = null,
  onClick = () => {},
  disabled = false,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
    inline-flex items-center gap-2 px-4 py-2 rounded-lg 
    bg-indigo-600 text-white 
    hover:bg-indigo-700 
    hover:scale-[1.03]
    active:scale-90 
    transition-transform duration-200 ease-out
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:cursor-pointer
    ${className}
  `}
    >
      {/* If icon is passed → show icon; otherwise default maze icon */}
      {icon ? (
        <span className="flex items-center text-lg">{icon}</span>
      ) : (
        <span className="flex items-center text-lg">{PBIcons.maze}</span>
      )}

      <span>{label}</span>
    </button>
  );
}

/* -----------------------------------------------------------
   ICON LIBRARY (SVG icons, crisp & scalable)
------------------------------------------------------------- */
export const PBIcons = {
  add: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),

  delete: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  ),

  /* -------------------------
     REAL SQUARE SPIRAL MAZE ICON
  -------------------------- */
  maze: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer square */}
      <rect x="3" y="3" width="18" height="18" />

      {/* Inner maze square */}
      <rect x="7" y="7" width="10" height="10" />

      {/* Openings */}
      <path d="M7 7v4" />
      <path d="M17 17v-4" />

      {/* Spiral path */}
      <path d="M11 7v6H17" />
    </svg>
  ),
};
