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
      router.push("/dashboard/playground"); 
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg 
        bg-indigo-600 text-white 
        hover:bg-indigo-700 
        hover:scale-[1.03]
        active:scale-90 
        transition-transform duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      <span className="flex items-center text-lg">
        {icon ? icon : PBIcons.maze}
      </span>
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
