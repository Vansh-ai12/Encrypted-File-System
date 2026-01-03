"use client";
import { createContext, useEffect, useRef } from "react";
import { useParams } from "next/navigation";

export const BoardSocketContext = createContext(true);

export const BoardSocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const { boardId } = useParams();

  useEffect(() => {
    if (!boardId || socketRef.current) return;

    const token = localStorage.getItem("wsToken");
    if (!token) return;

    const ws = new WebSocket(
      `ws://localhost:8000/ws/board/${boardId}/?token=${token}`
    );

    ws.onmessage = (e) => {
      window.dispatchEvent(
        new CustomEvent("board-ws-message", {
          detail: JSON.parse(e.data),
        })
      );
    };

    socketRef.current = ws;

    return () => {
      ws.close();
      socketRef.current = null;
    };
  }, [boardId]);

  useEffect(() => {
    const sendHandler = (e) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(e.detail));
      }
    };

    window.addEventListener("board-ws-send", sendHandler);
    return () =>
      window.removeEventListener("board-ws-send", sendHandler);
  }, []);

  return (
    <BoardSocketContext.Provider value={true}>
      {children}
    </BoardSocketContext.Provider>
  );
};
