"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect } from "react";

export default function AcceptInvite() {
  const router = useRouter();
  const { token } = useParams();

  useEffect(() => {
    if (!token) return;

    const accept = async () => {
      try {
        const res = await fetch(
          `https://encrypted-file-system-production.up.railway.app/boardOrganisation/acceptInvitation/${token}/`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        const data = await res.json();

        if (data.message === "Joined organisation") {
          router.replace("/dashboard");
        } else if (data.status === "new-user") {
          localStorage.setItem("inviteEmail", data.email);
          router.replace("/login");
        } else {
          router.replace("/");
        }
      } catch (err) {
        console.error("Invite accept failed", err);
        router.replace("/");
      }
    };

    accept();
  }, [token, router]);

  return (
    <div className="flex h-screen justify-center items-center">
      <p className="text-gray-500 text-sm">Joining organisation…</p>
    </div>
  );
}
