"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function OdoBoardLogo({ size = 64, className = "" }) {
  const height = size;
  const fontSize = Math.round(size * 0.45);
  const router = useRouter(); 

  return (
    <div
      className={`inline-flex items-center ${className}`}
      aria-label="OdoBoard Logo"
      style={{ lineHeight: 1, cursor: "pointer" }}
      onClick = {()=> router.push("/dashboard/playground/odoboard")}
    >
      {/* Logo */}
      <svg
        width={height}
        height={height}
        viewBox="0 0 100 100"
        className="block"
      >
        <path
          d="M50,5 A45,45 0 0 0 5,50 A45,45 0 0 0 50,95"
          fill="#facc15"   // yellow
        />
        <path
          d="M50,95 A45,45 0 0 0 95,50 A45,45 0 0 0 50,5"
          fill="#000000"   // black
        />
        <circle cx="50" cy="50" r="26" fill="#050505" />
      </svg>

      <span
        style={{
          fontWeight: 800,
          fontSize,
          color: "#f97316",   // orange
          letterSpacing: "-0.02em",
        }}
      >
        do
      </span>

      <span
        style={{
          fontWeight: 800,
          fontSize,
          color: "#facc15",   // yellow
          letterSpacing: "-0.02em",
        }}
      >
        Board
      </span>
    </div>
  );
}
