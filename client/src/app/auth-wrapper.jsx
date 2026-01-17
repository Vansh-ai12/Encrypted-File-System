"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthWrapper({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const path =
    typeof window !== "undefined" ? window.location.pathname : "";
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
      <div className="flex items-center justify-center h-screen">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
