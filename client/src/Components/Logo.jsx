"use client";

import { useRouter } from "next/navigation";

export default function OdonLogo({ size = 64, className = "" }) {
  const router = useRouter();
  const height = size;
  const fontSize = Math.round(size * 0.6);

  const handleClick = async () => {
    try {
      // ⚡ instant check first
      const cached = localStorage.getItem("isLoggedIn");

      if (cached === "true") {
        router.push("/dashboard");
        return;
      }

      // fallback → real check
      const res = await fetch("http://localhost:8000/user/check/", {
        credentials: "include",
      });

      const data = await res.json();

      if (data.loggedIn) {
        localStorage.setItem("isLoggedIn", "true");
        router.push("/dashboard");
      } else {
        localStorage.removeItem("isLoggedIn");
        router.push("/");
      }
    } catch {
      router.push("/");
    }
  };

  return (
    <div
      className={`inline-flex items-center ${className}`}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      <svg
        width={height}
        height={height}
        viewBox="0 0 100 100"
        style={{ flexShrink: 0 }}
      >
        <path d="M50,5 A45,45 0 0 0 5,50 A45,45 0 0 0 50,95" fill="#facc15" />
        <path d="M50,95 A45,45 0 0 0 95,50 A45,45 0 0 0 50,5" fill="#fb923c" />
      </svg>

      <span
        style={{
          fontWeight: 700, // Slightly lighter for a cleaner startup look
          fontSize: fontSize,
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          marginLeft: `${size * 0.05}px`, // Changed from negative to a small positive gap
          fontFamily: "'Inter', 'Plus Jakarta Sans', 'Lexend', sans-serif", // Modern geometric startup fonts
          letterSpacing: "-0.02em", // Subtle tightening
          textTransform: "lowercase",
        }}
      >
        d<span style={{ color: "#facc15" }}>o</span>n
      </span>
    </div>
  );
}
