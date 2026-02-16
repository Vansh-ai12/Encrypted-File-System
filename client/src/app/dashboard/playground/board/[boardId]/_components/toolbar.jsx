import {
  MousePointer2,
  StickyNote,
  Type,
  Square,
  Circle,
  Pencil,
  Undo2,
  Redo2,
} from "lucide-react";

import { useEffect } from "react";

import { CanvasMode, LayerType } from "../../../../../../../types/canvas";
import { ToolButton } from "./tool-button";

import React, { useCallback } from "react";

export const Toolbar = React.memo(function Toolbar({
  canvasState,
  setCanvasState,
  undo,
  redo,
  canUndo,
  canRedo,
  isInteractingRef,
}) {

  const setMode = useCallback(
    (mode) => {
      setCanvasState((prev) => ({
        ...prev,
        mode,
      }));
    },
    [setCanvasState],
  );

  const isInteracting = isInteractingRef.current;


  return (
    <div
      data-ui
      onWheelCapture={(e) => e.stopPropagation()}
      className="absolute top-1/2 z-20 -translate-y-1/2 left-2 flex flex-col gap-y-4"
    >
      <div className="bg-white rounded-md p-1.5 flex flex-col gap-y-1 items-center shadow-md">
        <ToolButton
          label="Select"
          icon={MousePointer2}
          isActive={
            canvasState.mode === CanvasMode.None ||
            canvasState.mode === CanvasMode.SelectionNet ||
            canvasState.mode === CanvasMode.Translating ||
            canvasState.mode === CanvasMode.Resizing ||
            canvasState.mode === CanvasMode.Pressing
          }
          onClick={() => setMode(CanvasMode.None)}
          isInteracting={isInteracting}
        />

        <ToolButton
          label="Text"
          icon={Type}
          isActive={
            canvasState.mode === CanvasMode.Inserting &&
            canvasState.layerType === LayerType.Text
          }
          onClick={() =>
            setCanvasState({
              ...canvasState,
              mode: CanvasMode.Inserting,
              layerType: LayerType.Text,
              origin: null,
              current: null,
            })
          }
          isInteracting={isInteracting}
        />

        <ToolButton
          label="Sticky note"
          icon={StickyNote}
          isActive={
            canvasState.mode === CanvasMode.Inserting &&
            canvasState.layerType === LayerType.Note
          }
          onClick={() =>
            setCanvasState({
              ...canvasState,
              mode: CanvasMode.Inserting,
              layerType: LayerType.Note,
              origin: null,
              current: null,
            })
          }
          isInteracting={isInteracting}
        />

        <ToolButton
          label="Rectangle"
          icon={Square}
          isActive={
            canvasState.mode === CanvasMode.Inserting &&
            canvasState.layerType === LayerType.Rectangle
          }
          onClick={() =>
            setCanvasState({
              ...canvasState,
              mode: CanvasMode.Inserting,
              layerType: LayerType.Rectangle,
              origin: null,
              current: null,
            })
          }
          isInteracting={isInteracting}
        />

        <ToolButton
          label="Ellipse"
          icon={Circle}
          isActive={
            canvasState.mode === CanvasMode.Inserting &&
            canvasState.layerType === LayerType.Ellipse
          }
          onClick={() =>
            setCanvasState({
              ...canvasState,
              mode: CanvasMode.Inserting,
              layerType: LayerType.Ellipse,
              origin: null,
              current: null,
            })
          }
          isInteracting={isInteracting}
        />

        <ToolButton
          label="Pen"
          icon={Pencil}
          isActive={canvasState.mode === CanvasMode.Pencil}
          onClick={() =>
            setCanvasState({
              ...canvasState,
              mode: CanvasMode.Pencil,
              layerType: null,
              origin: null,
              current: null,
            })
          }
          isInteracting={isInteracting}
        />
      </div>

      <div className="bg-white rounded-md p-1.5 flex flex-col items-center shadow-md">
        <ToolButton
          label="Undo"
          icon={Undo2}
          onClick={undo}
          isDisabled={!canUndo}
          isInteracting={isInteracting}
        />
        <ToolButton
          label="Redo"
          icon={Redo2}
          onClick={redo}
          isDisabled={!canRedo}
          isInteracting={isInteracting}
        />
      </div>
    </div>
  );
});
