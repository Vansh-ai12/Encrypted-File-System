"use client";

import { memo, useEffect, useState } from "react";
import { MousePointer2 } from "lucide-react";
import { connectionIdToColor } from "@/hooks/utils";

export const Cursor = memo(({ info }) => {
  const [cursor, setCursor] = useState(info);

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      if (!cursor || data.connectionId !== cursor.connectionId) return;

      if (data.type === "CURSOR_HIDE") {
        setCursor((prev) => prev && { ...prev, x: null, y: null });
      }

      if (data.type === "CURSOR_MOVE") {
        setCursor((prev) =>
          prev ? { ...prev, x: data.x, y: data.y } : prev
        );
      }
    };

    window.addEventListener("board-ws-message", handler);
    return () => window.removeEventListener("board-ws-message", handler);
  }, [cursor]);

  if (!cursor || cursor.x == null || cursor.y == null) return null;

  // ✅ GET CAMERA
  const camRef = window.__BOARD_CAMERA__;
  if (!camRef?.current) return null;

  const { x: camX, y: camY, zoom } = camRef.current;

  // ✅ WORLD → SCREEN
  const screenX = cursor.x * zoom + camX;
  const screenY = cursor.y * zoom + camY;

  const color = connectionIdToColor(cursor.connectionId);

  return (
    <div
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: screenX,
        top: screenY,
        transform: "translate(-4px, -4px)",
      }}
    >
      <MousePointer2 size={18} color={color} />
      <div
        className="mt-1 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {cursor.name}
      </div>
    </div>
  );
});

Cursor.displayName = "Cursor";
