"use client";

import { memo, useEffect, useState } from "react";
import { Cursor } from "./cursor";

export const CursorsPresence = memo(() => {
  const [cursors, setCursors] = useState({});
  const [selfId, setSelfId] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;

      // INIT
      if (data.type === "INIT_USERS") {
        const map = {};
        data.users.forEach((u) => {
          map[u.connectionId] = u;
        });

        setCursors(map);
        setSelfId(data.selfConnectionId); // ✅ CORRECT
      }

      // JOIN
      if (data.type === "USER_JOIN") {
        setCursors((prev) => ({
          ...prev,
          [data.user.connectionId]: data.user,
        }));
      }

      // LEAVE
      if (data.type === "USER_LEAVE") {
        setCursors((prev) => {
          const copy = { ...prev };
          delete copy[data.connectionId];
          return copy;
        });
      }

      // CURSOR MOVE
      if (data.type === "CURSOR_MOVE") {
        setCursors((prev) => ({
          ...prev,
          [data.connectionId]: {
            ...prev[data.connectionId],
            x: data.x,
            y: data.y,
          },
        }));
      }
    };

    window.addEventListener("board-ws-message", handler);
    return () =>
      window.removeEventListener("board-ws-message", handler);
  }, []);

  return (
    <>
      {Object.entries(cursors)
        .filter(([id]) => id !== selfId) // ✅ hide self cursor
        .map(([id, info]) => (
          <Cursor key={id} info={info} />
        ))}
    </>
  );
});

CursorsPresence.displayName = "CursorsPresence";
