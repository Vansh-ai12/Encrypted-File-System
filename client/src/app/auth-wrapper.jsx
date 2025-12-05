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

        // ❌ If NOT logged in → redirect to login
        if (!data.loggedIn) {
          if (window.location.pathname !== "/") {
            router.replace("/");
          }
          setLoading(false);
          return;
        }

        // ⭐ Save activeOrgId if exists
        if (data.activeOrgId) {
          localStorage.setItem("activeOrgId", data.activeOrgId);
          window.dispatchEvent(new Event("org-changed"));
        }

        // 🔥 User logged in but on home → go dashboard
        if (window.location.pathname === "/") {
          router.replace("/dashboard");
        }

        // 🟡 Logged in but NO org → stay on dashboard, don't redirect elsewhere
        if (!data.activeOrgId && window.location.pathname !== "/dashboard") {
          router.replace("/dashboard");
        }

      } catch {
        router.replace("/");
      }

      setLoading(false);
    };

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-700">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}
