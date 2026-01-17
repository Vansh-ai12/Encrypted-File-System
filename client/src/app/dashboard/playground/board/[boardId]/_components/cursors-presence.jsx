"use client";

import { useContext } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";
import { Cursor } from "./cursor";

export const CursorsPresence = () => {
  const { users, selfConnectionId } = useContext(BoardSocketContext);

  return (
    <>
      {users
        .filter((u) => u.connectionId !== selfConnectionId)
        .map((u) => (
          <Cursor key={u.connectionId} user={u} />
        ))}
    </>
  );
};
