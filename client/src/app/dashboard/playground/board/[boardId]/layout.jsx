"use client";
import { BoardSocketProvider } from "@/hooks/board-socket-context";
import { use } from "react";

export default function BoardLayout({ children, params }) {
  const { boardId } = use(params); // 🔥 REQUIRED

  return (
    <BoardSocketProvider boardId={boardId}>
      {children}
    </BoardSocketProvider>
  );
}
