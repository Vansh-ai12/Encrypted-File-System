"use client";

import { useContext, useMemo } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";
import { connectionIdToColor } from "@/hooks/utils";

export function usePresenceColors() {
  const { users, selfConnectionId } = useContext(BoardSocketContext);

  // 🟢 all users except me
  const otherUsers = useMemo(
    () => users.filter((u) => u.connectionId !== selfConnectionId),
    [users, selfConnectionId]
  );

  // 🎨 map: connectionId → color
  const userColors = useMemo(() => {
    const map = Object.create(null);
    for (const u of otherUsers) {
      map[u.connectionId] = connectionIdToColor(u.connectionId);
    }
    return map;
  }, [otherUsers]);

  // 🔁 safe accessor
  const getUserColor = (connectionId) =>
    connectionIdToColor(connectionId);

  return {
    otherUsers,     // [{ userId, connectionId, x, y, ... }]
    userColors,     // { connectionId: "#color" }
    getUserColor,   // fn(connectionId)
  };
}
