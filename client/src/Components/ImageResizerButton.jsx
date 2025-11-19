"use client";
import React from "react";

export default function ImageResizerButton({
  label = "Resize Image",
  onClick = () => {},
  disabled = false,
  className = "",
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        group
        inline-flex items-center gap-2 px-4 py-2
        rounded-xl bg-indigo-600/90 text-white
        shadow-md shadow-indigo-500/30
        backdrop-blur-sm

        hover:bg-indigo-700 hover:shadow-indigo-400/40
        hover:scale-[1.03]
        active:scale-90
        hover:cursor-pointer
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {/* Resize Icon */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-300 group-hover:rotate-12"
      >
        {/* Corner resize arrows */}
        <polyline points="16 3 21 3 21 8" />
        <line x1="21" y1="3" x2="14" y2="10" />

        <polyline points="3 16 3 21 8 21" />
        <line x1="3" y1="21" x2="10" y2="14" />
      </svg>

      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );
}
