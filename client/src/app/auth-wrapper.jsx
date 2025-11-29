// src/app/auth-wrapper.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthWrapper({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/user/check/", {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json();
        console.log("Session Check:", data);

        if (data.loggedIn) {
          // 🔥 Already logged in → Redirect to dashboard
          if (window.location.pathname === "/") {
            router.replace("/dashboard");
          }
        } else {
          // ❌ Not logged in → Redirect to home/login
          if (window.location.pathname !== "/") {
            router.replace("/");
          }
        }
      } catch (err) {
        console.error("Session check failed:", err);
        router.replace("/");
      }

      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-700">
        ...
      </div>
    );
  }

  return <>{children}</>;
}

