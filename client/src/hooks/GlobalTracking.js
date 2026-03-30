"use client";
import { useEffect, useRef } from "react";

export default function useGlobalTracking() {
  const startRef = useRef(Date.now());
  const activeRef = useRef(true);

  useEffect(() => {
    // 🔥 Track tab visibility
    const handleVisibility = () => {
      activeRef.current = !document.hidden;
    };

    document.addEventListener("visibilitychange", handleVisibility);

    const interval = setInterval(() => {
      if (!activeRef.current) return;

      const duration = Math.floor((Date.now() - startRef.current) / 1000);

      fetch("http://localhost:8000/user/track-visit/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ duration }),
      });

      startRef.current = Date.now();
    }, 10000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
}