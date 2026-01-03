"use client";
import React from "react";

export default function OdoBoardLogo({ size = 64, className = "" }) {
  const height = size;
  const fontSize = Math.round(size * 0.45);

  return (
    <div
      className={`inline-flex items-center ${className}`}
      aria-label="OdoBoard Logo"
      style={{ lineHeight: 1, cursor: "pointer" }}
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
          fill="#7c3aed"
        />
        <path
          d="M50,95 A45,45 0 0 0 95,50 A45,45 0 0 0 50,5"
          fill="#0f172a"
        />
        <circle cx="50" cy="50" r="26" fill="white" />
      </svg>

      <span
        style={{
          fontWeight: 800,
          fontSize,
          color: "#0f172a",
          letterSpacing: "-0.02em",
        }}
      >
        do
      </span>

      <span
        style={{
          fontWeight: 800,
          fontSize,
          color: "#7c3aed",
          letterSpacing: "-0.02em",
        }}
      >
        Board
      </span>
    </div>
  );
}
