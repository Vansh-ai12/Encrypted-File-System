"use client";

import { createContext, useEffect, useRef, useState } from "react";

export const BoardSocketContext = createContext(null);

export function BoardSocketProvider({ children, boardId }) {
  const socketRef = useRef(null);
  const queueRef = useRef([]);

  const [initState, setInitState] = useState(null);
  const [users, setUsers] = useState([]);
  const [selfConnectionId, setSelfConnectionId] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);

  const send = (msg) => {
    const ws = socketRef.current;
    if (!ws) return;

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      queueRef.current.push(msg);
    }
  };

  useEffect(() => {
  const init = async () => {
    if (!boardId || socketRef.current) return;

    setUsers([]);

    const res = await fetch("https://encrypted-file-system-production.up.railway.app/user/check/", {
      credentials: "include",
    });

    const data = await res.json();
    const token = data.token;

    if (!token) return;

    const ws = new WebSocket(
      `ws://localhost:8000/ws/board/${boardId}/?token=${token}`
    );

    ws.onopen = () => {
      socketRef.current = ws;
      queueRef.current.forEach((m) => ws.send(JSON.stringify(m)));
      queueRef.current = [];
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "INIT_STATE") {
        setInitState(data);
      }

      setLastEvent(data);

      if (data.type === "CURSOR_MOVE") {
        setUsers((prev) => {
          const exists = prev.find((u) => u.connectionId === data.connectionId);

          if (exists) {
            return prev.map((u) =>
              u.connectionId === data.connectionId
                ? { ...u, x: data.x, y: data.y, visible: true }
                : u
            );
          }

          return [
            ...prev,
            {
              connectionId: data.connectionId,
              x: data.x,
              y: data.y,
              visible: true,
              name: "User",
            },
          ];
        });
      }

      if (data.type === "CURSOR_HIDE") {
        setUsers((prev) =>
          prev.map((u) =>
            u.connectionId === data.connectionId ? { ...u, visible: false } : u
          )
        );
      }

      if (data.type === "INIT_USERS") {
        setUsers(data.users);
        setSelfConnectionId(data.selfConnectionId);
      }

      if (data.type === "USER_JOIN") {
        setUsers((prev) => [...prev, data.user]);
      }

      if (data.type === "USER_LEAVE") {
        setUsers((prev) =>
          prev.filter((u) => u.connectionId !== data.connectionId)
        );
      }
    };

    socketRef.current = ws;
  };

  init();

  return () => {
    socketRef.current?.close();
    socketRef.current = null;
  };
}, [boardId]);

  return (
    <BoardSocketContext.Provider
      value={{ users, selfConnectionId, send, lastEvent, initState }}
    >
      {children}
    </BoardSocketContext.Provider>
  );
}
