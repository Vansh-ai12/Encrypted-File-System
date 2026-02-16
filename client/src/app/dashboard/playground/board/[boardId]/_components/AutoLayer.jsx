"use client";
import { useLayoutEffect, useRef } from "react";

export function AutoTextLayerView({ layer, onPointerDown, onCommit }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const shouldAutoSize =
      !layer.__manualSize &&
      !window.__IS_RESIZING__ &&
      layer.__autoSizing !== false;

    if (!shouldAutoSize) return;

    const zoom = window.__BOARD_CAMERA__?.current?.zoom ?? 1;

    const prevWidth = el.style.width;
    const prevHeight = el.style.height;

    el.style.width = "fit-content";
    el.style.height = "fit-content";

    const scrollW = el.scrollWidth;
    const scrollH = el.scrollHeight;

    el.style.width = prevWidth;
    el.style.height = prevHeight;

    const contentW = scrollW / zoom;
    const contentH = scrollH / zoom;

    if (
      Math.abs(contentW - layer.width) < 0.5 &&
      Math.abs(contentH - layer.height) < 0.5
    ) {
      return;
    }

    onCommit(layer.id, {
      width: contentW,
      height: contentH,
      __local: true,
      __autoSizing: true,
      __autosizedOnce: true,
    });
  }, [layer.value, layer.style.fontSize]);

  return (
    <div
      data-layer
      ref={ref}
      style={{
        position: "absolute",
        left: layer.x,
        top: layer.y,

        width: layer.width > 0 ? layer.width : "fit-content",
        height: layer.height > 0 ? layer.height : "fit-content",
        boxSizing: "border-box",

        boxSizing: "border-box",
        padding: "6px 8px",
        border: "1px solid #ddd",
        background: "white",
        borderRadius: 6,

        fontSize: layer.style.fontSize,
        color: layer.style.textColor,
        lineHeight: "1.2",

        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "break-word",

        overflow: "hidden",

        cursor: "move",
        userSelect: "text",
      }}
      onPointerDown={onPointerDown}
    >
      {layer.value}
    </div>
  );
}
