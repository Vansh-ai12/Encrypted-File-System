"use client";

import React from "react";

export default function OdoBoardLogo({ size = 64, className = "" }) {
  const height = size;
  const fontSize = Math.round(size * 0.45);

  return (
    <div
      className={`inline-flex items-center ${className}`}
      aria-label="OdoBoard Logo"
      style={{ lineHeight: 1 }}
    >
      {/* O logo */}
      <svg
        width={height}
        height={height}
        viewBox="0 0 100 100"
        className="block"
        style={{ display: "block", padding: 0, margin: 0 }}
      >
        {/* Left purple arc */}
        <path
          d="M50,5 A45,45 0 0 0 5,50 A45,45 0 0 0 50,95"
          fill="#7c3aed"
        />

        {/* Right navy arc */}
        <path
          d="M50,95 A45,45 0 0 0 95,50 A45,45 0 0 0 50,5"
          fill="#0f172a"
        />

        {/* Inner hole */}
        <circle cx="50" cy="50" r="26" fill="white" />
      </svg>

      {/* TEXT — no spacing whatsoever */}
      <span
        style={{
          marginLeft: 0,  // ❌ removed spacing
          fontWeight: 800,
          fontSize,
          color: "#0f172a",
          letterSpacing: "-0.02em",
          fontFamily:
            "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        }}
      >
        do
      </span>

      <span
        style={{
          marginLeft: 0, // ❌ removed spacing
          fontWeight: 800,
          fontSize,
          color: "#7c3aed",
          letterSpacing: "-0.02em",
          fontFamily:
            "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        }}
      >
        Board
      </span>
    </div>
  );
}
