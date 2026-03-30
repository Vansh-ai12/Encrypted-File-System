"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function PlaygroundButton({
  label = "Playground",
  icon = null,
  slug = "odoboard", // 🔹 default slug for now
  disabled = false,
  className = "",
}) {
  const router = useRouter();

  const handleClick = () => {
    if (!disabled) {
      router.push("/dashboard/playground/odoboard");
    }
  };

  // REPLACE the return in PlaygroundButton.jsx
// REPLACE the return statement with this:
return (
  <button
    type="button"
    onClick={handleClick}
    className={`
      inline-flex items-center gap-2 px-6 py-2 rounded-md 
      bg-[#facc15] text-black font-bold text-sm
      hover:bg-[#eab308] active:scale-95 transition-all
      ${className}
    `}
  >
    <span>{label}</span>
  </button>
);
}

export const PBIcons = {
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
      <rect x="3" y="3" width="18" height="18" />
      <rect x="7" y="7" width="10" height="10" />
      <path d="M7 7v4" />
      <path d="M17 17v-4" />
      <path d="M11 7v6H17" />
    </svg>
  ),
};
