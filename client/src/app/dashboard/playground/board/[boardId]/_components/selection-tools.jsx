"use client";

import { ColorButton } from "./color-button";
import { LayerType } from "../../../../../../../types/canvas";
import { useContext } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";

import { Copy, Trash2 } from "lucide-react";

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
  selectedLayerIds,
  setLayers,
  commitLayers,
  onDuplicate,
  onDelete,
}) => {
  const { send } = useContext(BoardSocketContext);

  if (!selectionBounds || (!selectedLayer && selectedLayerIds?.size <= 1)) {
    return null;
  }

  const applyColor = (color) => {
    setLayers((prev) => {
      const next = prev.map((l) => {
        if (selectedLayerIds?.size > 1 && selectedLayerIds.has(l.id)) {
          return {
            ...l,
            style: {
              ...l.style,
              fill: color,
              textColor: color,
            },
          };
        }

        if (l.id !== selectedLayer.id) return l;

        return {
          ...l,
          style: {
            ...l.style,
            fill: color,
            textColor: color,
          },
        };
      });

      commitLayers(next);
      return next;
    });
  };

  const applyStyleToGroup = (patch) => {
    setLayers((prev) => {
      const next = prev.map((l) =>
        selectedLayerIds.has(l.id)
          ? { ...l, style: { ...l.style, ...patch } }
          : l,
      );

      commitLayers(next);
      return next;
    });
  };

  const handleDuplicate = () => {
    onDuplicate?.();
  };

  const handleDelete = () => {
    onDelete?.();
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
      className="fixed z-[10000] bg-white rounded-md shadow px-2 py-2 flex gap-2 items-center"
      style={{
        left: screenX,
        top: screenY,
        transform: "translate(-50%, -100%)",
      }}
    >
      {COLORS.map((c) => {
        const isGroup = selectedLayerIds?.size > 1;

        let isActive = false;

        if (isGroup) {
          const first = [...selectedLayerIds][0];
          const layer = first
            ? selectionBounds && selectedLayer
              ? selectedLayer
              : null
            : null;

          isActive = layer?.style?.fill === c || layer?.style?.textColor === c;
        } else {
          isActive =
            selectedLayer?.style?.fill === c ||
            selectedLayer?.style?.textColor === c;
        }

        return (
          <ColorButton
            key={c}
            color={c}
            active={isActive}
            onClick={applyColor}
          />
        );
      })}

      <button
        onClick={handleDuplicate}
        className="p-1 rounded hover:bg-neutral-100"
        title="Duplicate"
      >
        <Copy size={16} />
      </button>

      <button
        onClick={handleDelete}
        className="p-1 rounded hover:bg-neutral-100"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};
