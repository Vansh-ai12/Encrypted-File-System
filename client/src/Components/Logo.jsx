"use client";

import { useRouter } from "next/navigation";

export default function OdonLogo({ size = 64, className = "" }) {
  const router = useRouter();
  const height = size;
  const fontSize = Math.round(size * 0.6);

  const handleClick = async () => {
    try {
      const res = await fetch("http://localhost:8000/user/check/", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (data.loggedIn) {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  };

  return (
    <div className={`inline-flex items-center ${className}`}
         onClick={handleClick}
         style={{ cursor: "pointer" }}>
      {/* SVG and text stay the same */}
      <svg width={height} height={height} viewBox="0 0 100 100">
        <path d="M50,5 A45,45 0 0 0 5,50 A45,45 0 0 0 50,95" fill="#7c3aed" />
        <path d="M50,95 A45,45 0 0 0 95,50 A45,45 0 0 0 50,5" fill="#0f172a" />
        <circle cx="50" cy="50" r="26" fill="white" />
      </svg>

      <span style={{
        fontWeight: 800,
        fontSize,
        color: "#0f172a",
        display: "flex",
        alignItems: "center",
      }}>
        d<span style={{ color: "#7c3aed" }}>o</span>n
      </span>
    </div>
  );
}
