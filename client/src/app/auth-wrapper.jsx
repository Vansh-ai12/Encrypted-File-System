"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthWrapper({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const isInvitePage = path.startsWith("/invite/");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("http://localhost:8000/user/check/", {
          credentials: "include",
        });

        const data = await res.json();

        if (!data.loggedIn && !isInvitePage) {
          setLoading(false);
          router.replace("/");
          return;
        }

        if (data.activeOrgId) {
          localStorage.setItem("activeOrgId", data.activeOrgId);
          window.dispatchEvent(new Event("org-changed"));
        }

        if (path === "/" && data.loggedIn) {
          setLoading(false);
          router.replace("/dashboard");
          return;
        }

        setLoading(false);
      } catch {
        setLoading(false);
        if (!isInvitePage) router.replace("/");
      }
    };

    checkSession();
  }, [router, path, isInvitePage]);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#050505] flex items-center justify-center relative overflow-hidden">
        {/* subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(250,204,21,0.08),_transparent_60%)]" />

        {/* loader content */}
        <div className="relative z-10 flex flex-col items-center gap-4">
          {/* spinning ring */}
          <div className="w-10 h-10 border-2 border-white/10 border-t-[#facc15] rounded-full animate-spin" />

          {/* text */}
          <p className="text-sm text-gray-400 tracking-wide">
            Loading<span className="animate-pulse">...</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
