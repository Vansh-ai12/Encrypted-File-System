"use client";

import { ColorButton } from "./color-button";
import { LayerType } from "../../../../../../../types/canvas";
import { useContext, useState } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";

import { Hint } from "@/Components/hints";

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
  const [showLinePanel, setShowLinePanel] = useState(false);

  // 🔥 SHOW TOOLBAR FOR SINGLE SELECTION (INCLUDING ARROWS)
  if (!selectionBounds) {
    return null;
  }

  // if nothing is selected at all
  const hasSingle = !!selectedLayer;
  const hasGroup = selectedLayerIds && selectedLayerIds.size > 1;

  if (!hasSingle && !hasGroup) {
    return null;
  }

  const applyColor = (color) => {
    setLayers((prev) => {
      const next = prev.map((l) => {
        const isSelected =
          selectedLayerIds?.size > 1
            ? selectedLayerIds.has(l.id)
            : l.id === selectedLayer?.id;

        if (!isSelected) return l;

        // 🔥 CRITICAL: handle arrows/lines (Path)
        if (l.type === LayerType.Path) {
          return {
            ...l,
            style: {
              ...l.style,
              stroke: color === "transparent" ? "#000000" : color,
            },
          };
        }

        // existing behavior (rect, text, note)
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

  const TOOL_OFFSET = 90;

  // world → screen
  const screenX =
    selectionBounds.x * camera.zoom +
    camera.x +
    (selectionBounds.width * camera.zoom) / 2;

  const screenY = selectionBounds.y * camera.zoom + camera.y - TOOL_OFFSET;

  const applyLineType = (type) => {
    setLayers((prev) => {
      const next = prev.map((l) => {
        const isSelected =
          selectedLayerIds?.size > 1
            ? selectedLayerIds.has(l.id)
            : l.id === selectedLayer?.id;

        if (!isSelected) return l;

        if (l.type === LayerType.Path) {
          return {
            ...l,
            style: {
              ...l.style,
              lineType: type,
            },
          };
        }

        return l;
      });

      commitLayers(next);
      return next;
    });
  };

  const showLineControls = selectedLayer?.type === LayerType.Path;

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

      {/* 🔥 LINE STYLE BUTTON */}
      {showLineControls && (
        <div className="relative">
          <Hint label="Line type" side="top" align="center" sideOffset={12}>
            <button
              onClick={() => setShowLinePanel((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-neutral-100 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  d="M4 14 C8 6, 16 18, 20 10"
                  stroke="black"
                  strokeWidth={
                    selectedLayer?.style?.strokeWidth
                      ? Math.min(selectedLayer.style.strokeWidth / 2, 3)
                      : 2
                  }
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </Hint>

          {showLinePanel && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-white shadow-2xl rounded-xl p-3 flex flex-col gap-4 z-[10001] w-48 border border-neutral-200">
              {/* THICKNESS */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-500">Thickness</span>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={selectedLayer?.style?.strokeWidth ?? 3}
                  onChange={(e) => {
                    const w = Number(e.target.value);

                    setLayers((prev) => {
                      const next = prev.map((l) => {
                        const isSelected =
                          selectedLayerIds?.size > 1
                            ? selectedLayerIds.has(l.id)
                            : l.id === selectedLayer?.id;

                        if (!isSelected) return l;

                        if (
                          l.type === LayerType.Path ||
                          l.type === LayerType.Rectangle ||
                          l.type === LayerType.Ellipse
                        ) {
                          return {
                            ...l,
                            style: {
                              ...l.style,
                              strokeWidth: w,
                            },
                          };
                        }

                        return l;
                      });

                      commitLayers(next);
                      return next;
                    });
                  }}
                  className="w-full appearance-none h-1 bg-neutral-200 rounded-lg cursor-pointer
  [&::-webkit-slider-thumb]:appearance-none
  [&::-webkit-slider-thumb]:w-4
  [&::-webkit-slider-thumb]:h-4
  [&::-webkit-slider-thumb]:bg-black
  [&::-webkit-slider-thumb]:rounded-full
  [&::-webkit-slider-thumb]:shadow"
                />
              </div>

              {/* LINE TYPES */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => applyLineType("solid")}
                  className="flex-1 h-6 flex items-center justify-center hover:bg-neutral-100 rounded"
                >
                  <div className="w-10 h-[2px] bg-black rounded" />
                </button>

                <button
                  onClick={() => applyLineType("dashed")}
                  className="flex-1 h-6 flex items-center justify-center hover:bg-neutral-100 rounded"
                >
                  <div className="w-10 h-[2px] border-t-2 border-dashed border-black" />
                </button>

                <button
                  onClick={() => applyLineType("dotted")}
                  className="flex-1 h-6 flex items-center justify-center hover:bg-neutral-100 rounded"
                >
                  <div className="w-10 h-[2px] border-t-2 border-dotted border-black" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
