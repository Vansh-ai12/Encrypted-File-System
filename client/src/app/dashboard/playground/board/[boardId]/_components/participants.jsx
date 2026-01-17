"use client";

import { useContext } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";
import { UserAvatar } from "./user-avatar";

export const Participants = () => {
  const { users } = useContext(BoardSocketContext);

  const uniqueUsers = Object.values(
    users.reduce((acc, u) => {
      acc[u.userId] = u;
      return acc;
    }, {})
  );

  return (
    <div className="absolute top-2 right-2 z-[1000] flex gap-2 bg-white px-3 py-2 rounded shadow">
      {uniqueUsers.map((u) => (
        <UserAvatar key={u.userId} name={u.name} fallback={u.fallback} connectionId={u.connectionId} />
      ))}
    </div>
  );
};
