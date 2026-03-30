"use client";

const HIT = 14; 

const PAD = 4; 
const HANDLE = 6; 

import { LayerType } from "../../../../../../../types/canvas";

export const SelectionBox = ({
  bounds,
  isAutoText,
  onResizeHandlePointerDown,
}) => {
  let { x, y, width, height } = bounds;

  if (isAutoText) {
    width = Math.max(width, 1);
    height = Math.max(height, 1);
  }

  const pad = PAD;

  const handleSize = isAutoText ? 12 : 10;
  const hit = isAutoText ? 20 : HIT;

  const bx = x - pad;
  const by = y - pad;
  const bw = width + pad * 2;
  const bh = height + pad * 2;

  const SHOW_MID_DOTS_TYPES = [
    LayerType.Path,
    LayerType.Rectangle,
    LayerType.Ellipse,
    LayerType.Note,
    LayerType.Text,
    LayerType.AutoText,
  ];

  const corners = [
    ["nw", bx, by, "nwse-resize"],
    ["ne", bx + bw, by, "nesw-resize"],
    ["se", bx + bw, by + bh, "nwse-resize"],
    ["sw", bx, by + bh, "nesw-resize"],
  ];

  // 🔥 MIRO-STYLE: screen-stable offset (not zoom scaled)
  const cameraZoom = window.__BOARD_CAMERA__?.current?.zoom ?? 1;
  const DOT_OFFSET = 36 / cameraZoom; // 🔥 Miro-like distance

  const midpoints = [
    ["top-mid", bx + bw / 2, by - DOT_OFFSET, "grab"],
    ["right-mid", bx + bw + DOT_OFFSET, by + bh / 2, "grab"],
    ["bottom-mid", bx + bw / 2, by + bh + DOT_OFFSET, "grab"],
    ["left-mid", bx - DOT_OFFSET, by + bh / 2, "grab"],
  ];

  const edges = [
    ["n", bx + hit, by - hit, bw - hit * 2, hit * 2, "ns-resize"],
    ["s", bx + hit, by + bh - hit, bw - hit * 2, hit * 2, "ns-resize"],
    ["w", bx - hit, by + hit, hit * 2, bh - hit * 2, "ew-resize"],
    ["e", bx + bw - hit, by + hit, hit * 2, bh - hit * 2, "ew-resize"],
  ];

  const STROKE = 2;
  const HALF = STROKE / 2;
  return (
    <>
      {/* 🔥 DRAG HIT AREA (INVISIBLE FILL) */}
      <rect
        data-selection
        data-selection-safe
        x={bx}
        y={by}
        width={bw}
        height={bh}
        fill="transparent"
        pointerEvents={isAutoText ? "none" : "all"} 
      />

      {/* Visible Outline */}
      <rect
        x={bx - HALF}
        y={by - HALF}
        width={bw + STROKE}
        height={bh + STROKE}
        fill="none"
        stroke="#4c84ff"
        strokeWidth={STROKE}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        shapeRendering="geometricPrecision"
      />

      {/* Edges (invisible hit zones) */}
      {edges.map(([key, ex, ey, ew, eh, cursor]) => (
        <rect
          key={key}
          data-selection-handle
          x={ex}
          y={ey}
          width={ew}
          height={eh}
          fill="transparent"
          style={{ cursor }}
          pointerEvents={isAutoText ? "none" : "all"}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeHandlePointerDown(e, key); // 🔥 THIS WAS MISSING
          }}
        />
      ))}

      {/* Corner handles */}
      {corners.map(([key, cx, cy, cursor]) => (
        <g key={key}>
          {/* Invisible fat hit area */}
          <circle
            data-selection-handle
            cx={cx}
            cy={cy}
            r={handleSize * 2} // BIG hit area
            fill="transparent"
            pointerEvents={isAutoText ? "none" : "all"}
            style={{ cursor }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onResizeHandlePointerDown(e, key);
            }}
          />

          {/* Visible handle */}
          <circle
            cx={cx}
            cy={cy}
            r={handleSize}
            fill="#ffffff"
            stroke="#4c84ff"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            shapeRendering="geometricPrecision"
            pointerEvents="none" // important
          />
        </g>
      ))}
    </>
  );
};
