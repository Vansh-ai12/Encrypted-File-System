"use client";

import { memo, useEffect, useRef } from "react";
import { MousePointer2 } from "lucide-react";
import { connectionIdToColor } from "@/hooks/utils";

const SMOOTHING = 0.22; // 0.18–0.28 sweet spot

export const Cursor = memo(({ user }) => {
  const ref = useRef(null);
  const rafRef = useRef(null);

  const current = useRef({ x: user.x ?? 0, y: user.y ?? 0 });
  const target = useRef({ x: user.x ?? 0, y: user.y ?? 0 });
  const visible = useRef(false);

  // 🎯 Update target on WS updates
  useEffect(() => {
    if (user.x == null || user.y == null) return;

    target.current.x = user.x;
    target.current.y = user.y;

    if (user.visible && !rafRef.current) start();
  }, [user.x, user.y, user.visible]);

  const start = () => {
    visible.current = true;

    const tick = () => {
      if (!ref.current) return stop();
      if (!visible.current) return stop();

      const cam = window.__BOARD_CAMERA__?.current;
      if (!cam) {
        stop();
        return;
      }

      // 🧠 Smooth follow (LERP)
      current.current.x += (target.current.x - current.current.x) * SMOOTHING;
      current.current.y += (target.current.y - current.current.y) * SMOOTHING;

      const screenX = current.current.x * cam.zoom + cam.x;
      const screenY = current.current.y * cam.zoom + cam.y;

      ref.current.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  // 👻 Handle visibility
  useEffect(() => {
    if (!user.visible) {
      visible.current = false;
      stop();
    } else {
      visible.current = true;
      if (!rafRef.current) start();
    }
  }, [user.visible]);

  useEffect(() => stop, []);

  useEffect(() => {
    if (user.visible && !rafRef.current) {
      start();
    }
  }, [user.visible]);

  if (!user.visible) return null;

  const color = connectionIdToColor(user.connectionId);

  return (
    <div
      ref={ref}
      className="absolute pointer-events-none z-[9999]"
      style={{ willChange: "transform" }}
    >
      <MousePointer2 size={18} stroke={color} fill={color} />
      <div
        className="mt-1 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {user.name}
      </div>
    </div>
  );
});
