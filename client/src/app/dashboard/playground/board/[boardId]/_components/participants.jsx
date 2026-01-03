"use client";
import { useEffect, useState } from "react";
import { UserAvatar } from "./user-avatar";

export const Participants = () => {
  const [participants, setParticipants] = useState({});

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;

      // ================= INIT =================
      if (data.type === "INIT_USERS") {
        const map = {};
        data.users.forEach((u) => {
          map[u.connectionId] = u; // ✅ FIX
        });
        setParticipants(map);
      }

      // ================= JOIN =================
      if (data.type === "USER_JOIN") {
        setParticipants((prev) => ({
          ...prev,
          [data.user.connectionId]: data.user,
        }));
      }

      // ================= LEAVE =================
      if (data.type === "USER_LEAVE") {
        setParticipants((prev) => {
          const copy = { ...prev };
          delete copy[data.connectionId]; // ✅ FIX
          return copy;
        });
      }
    };

    window.addEventListener("board-ws-message", handler);
    return () => window.removeEventListener("board-ws-message", handler);
  }, []);

  return (
    <div className="absolute top-2 right-2 flex gap-2 bg-white px-3 py-2 rounded shadow">
      {Object.values(participants).map((u) => (
        <UserAvatar
          key={u.connectionId}
          connectionId={u.connectionId}
          name={u.name}
          fallback={u.fallback}
        />
      ))}
    </div>
  );
};
