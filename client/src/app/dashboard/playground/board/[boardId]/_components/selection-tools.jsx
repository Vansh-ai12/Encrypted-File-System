"use client";

import { ColorButton } from "./color-button";
import { LayerType } from "../../../../../../../types/canvas";
import { useContext } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";

const COLORS = [
  "#EF4444",
  "#FACC15",
  "#22C55E",
  "#3B82F6",
  "#A855F7",
  "#FB923C",
  "#000000",
  "transparent", // canvas bg
  "#FEF08A", // bg-yellow-200
];

export const SelectionTools = ({
  camera,
  selectedLayer,
  selectionBounds,
  setLayers,
  commitLayers,
}) => {
  const { send } = useContext(BoardSocketContext);

  if (!selectedLayer) return null;

  const applyColor = (color) => {
    setLayers((prev) => {
      const next = prev.map((l) => {
        if (l.id !== selectedLayer.id) return l;

        // 🔥 style routing by layer type
        let style = { ...l.style };

        if (
          l.type === LayerType.Rectangle ||
          l.type === LayerType.Ellipse ||
          l.type === LayerType.Note
        ) {
          style.fill = color;
        }

        if (l.type === LayerType.Text) {
          style.textColor = color;
        }

        return { ...l, style };
      });

      commitLayers(next);
      return next;
    });
  };

  if (!selectionBounds) return null;

  const TOOL_OFFSET = 10;

  // world → screen
  const screenX =
    selectionBounds.x * camera.zoom +
    camera.x +
    (selectionBounds.width * camera.zoom) / 2;

  const screenY = selectionBounds.y * camera.zoom + camera.y - TOOL_OFFSET;

  return (
    <div
      data-ui
      className="absolute z-[10000] bg-white rounded-md shadow px-2 py-2 flex gap-2"

      style={{
        left: screenX,
        top: screenY,
        transform: "translate(-50%, -100%)",
      }}
    >
      {COLORS.map((c) => (
        <ColorButton
          key={c}
          color={c}
          active={
            selectedLayer.style?.fill === c ||
            selectedLayer.style?.textColor === c
          }
          onClick={applyColor}
        />
      ))}
    </div>
  );
};
