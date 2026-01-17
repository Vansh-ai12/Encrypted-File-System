"use client";

const HIT = 14;   // invisible hit area

   // spacing from layer (uniform)
const PAD = 4;      // constant spacing
const HANDLE = 6;   // constant handle radius


export const SelectionBox = ({ bounds, onResizeHandlePointerDown }) => {
  const { x, y, width, height } = bounds;
  
  const bx = x - PAD;
  const by = y - PAD;
  const bw = width + PAD * 2;
  const bh = height + PAD * 2;

  const corners = [
    ["nw", bx, by, "nwse-resize"],
    ["ne", bx + bw, by, "nesw-resize"],
    ["se", bx + bw, by + bh, "nwse-resize"],
    ["sw", bx, by + bh, "nesw-resize"],
  ];

  const edges = [
    ["n", bx + HIT, by - HIT, bw - HIT * 2, HIT * 2, "ns-resize"],
    ["s", bx + HIT, by + bh - HIT, bw - HIT * 2, HIT * 2, "ns-resize"],
    ["w", bx - HIT, by + HIT, HIT * 2, bh - HIT * 2, "ew-resize"],
    ["e", bx + bw - HIT, by + HIT, HIT * 2, bh - HIT * 2, "ew-resize"],
  ];

  return (
    <>
      {/* Outline */}
      <rect
        x={bx}
        y={by}
        width={bw}
        height={bh}
        fill="none"
        stroke="#4c84ff"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        shapeRendering="crispEdges"
      />

      {/* Edges (invisible hit zones) */}
      {edges.map(([key, ex, ey, ew, eh, cursor]) => (
        <rect
          key={key}
          x={ex}
          y={ey}
          width={ew}
          height={eh}
          fill="transparent"
          style={{ cursor }}
          pointerEvents="all"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeHandlePointerDown(e, key);
          }}
        />
      ))}

      {/* Corner handles */}
      {corners.map(([key, cx, cy, cursor]) => (
        <circle
          key={key}
          cx={cx}
          cy={cy}
          r={HANDLE}
          fill="#ffffff"
          stroke="#4c84ff"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          shapeRendering="crispEdges"
          pointerEvents="all"
          style={{ cursor }}
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeHandlePointerDown(e, key);
          }}
        />
      ))}
    </>
  );
};
