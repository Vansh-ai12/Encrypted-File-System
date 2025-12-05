"use client";

import { Info } from "./info";
import { Participants } from "./participants";
import { Toolbar } from "./toolbar";
import { useEffect } from "react";
import { useParams } from "next/navigation";

export const Canvas = () => {
  const params = useParams();
  const boardId = params.boardId;

  useEffect(() => {
  if (!boardId) return;

  const socket = new WebSocket(
  `ws://127.0.0.1:8000/ws/board/${boardId}/`
);

  socket.onopen = () => console.log("🟢 WebSocket Connected");
  socket.onmessage = (e) => console.log("WS Message:", e.data);
  socket.onerror = (e) => console.error("WS Error:", e);
  socket.onclose = () => console.log("🔴 WebSocket Closed");

  return () => socket.close();
}, [boardId]);


  return (
    <main className="h-full w-full relative bg-neutral-100">
      <Info />
      <Participants />
      <Toolbar />
    </main>
  );
};
