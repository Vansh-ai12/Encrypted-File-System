"use client";

import { useEffect, useRef, useState } from "react";
import { CursorsPresence } from "./cursors-presence";
import { Info } from "./info";
import { Participants } from "./participants";
import { Toolbar } from "./toolbar";
import {
  CanvasMode,
  LayerType,
  RectangleLayer,
  EllipseLayer,
  TextLayer,
  NoteLayer,
} from "../../../../../../../types/canvas";
import { BoardSocketProvider } from "@/hooks/board-socket-context";
import { TextLayerView } from "./TextLayerView";
import { NoteLayerView } from "./NoteLayerView";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const MAX_LAYERS_PER_TYPE = 100;

export const Canvas = () => {
  const [canvasState, setCanvasState] = useState({
    mode: CanvasMode.None,
    layerType: null,
  });

  const editingTextIdRef = useRef(null);

  const zoomVelocityRef = useRef(0);

  const [layers, setLayers] = useState([]);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const contentRef = useRef(null);
  const zoomTargetRef = useRef(1);
  const rafRef = useRef(null);

  const canInsertLayer = (type) => {
    const count = layers.filter((l) => l.type === type).length;
    return count < MAX_LAYERS_PER_TYPE;
  };

  const updateLayerValue = (id, value) => {
    const next = layers.map((l) => (l.id === id ? { ...l, value } : l));
    commitLayers(next);
  };

  useEffect(() => {
    window.__BOARD_CAMERA__ = cameraRef;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMove = (e) => {
      lastPointerRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    };

    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const containerRef = useRef(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const move = (e) => {
      const cam = cameraRef.current;
      const rect = containerRef.current.getBoundingClientRect();

      const worldX = (e.clientX - rect.left - cam.x) / cam.zoom;
      const worldY = (e.clientY - rect.top - cam.y) / cam.zoom;

      window.dispatchEvent(
        new CustomEvent("board-ws-send", {
          detail: {
            type: "CURSOR_MOVE",
            x: worldX,
            y: worldY,
          },
        })
      );
    };

    const leave = () => {
      window.dispatchEvent(
        new CustomEvent("board-ws-send", {
          detail: { type: "CURSOR_LEAVE" },
        })
      );
    };

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);

    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, []);

  /* ================= WS RECEIVE ================= */

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail;

      if (d.type === "INIT_STATE") {
        setLayers(d.layers || []);
      }

      if (d.type === "LAYERS_REPLACE") {
        if (editingTextIdRef.current) {
          return;
        }
        setLayers(d.layers);
      }
      if (d.type === "TEXT_LIVE_UPDATE") {
        setLayers((prev) =>
          prev.map((l) =>
            l.id === d.id
              ? {
                  ...l,
                  value: d.value,
                  width: d.width,
                  height: d.height,
                }
              : l
          )
        );
      }
      if (d.type === "NOTE_LIVE_UPDATE") {
        setLayers((prev) =>
          prev.map((l) =>
            l.id === d.id
              ? {
                  ...l,
                  value: d.value,
                  width: d.width,
                  height: d.height,
                }
              : l
          )
        );
      }
    };

    window.addEventListener("board-ws-message", handler);
    return () => window.removeEventListener("board-ws-message", handler);
  }, []);

  /* ================= HISTORY ================= */

  const commitLayers = (next) => {
    setLayers(next);
    window.dispatchEvent(
      new CustomEvent("board-ws-send", {
        detail: {
          type: "LAYERS_COMMIT",
          layers: next,
        },
      })
    );
  };

  const undo = () => {
    window.dispatchEvent(
      new CustomEvent("board-ws-send", {
        detail: { type: "UNDO" },
      })
    );
  };

  const redo = () => {
    window.dispatchEvent(
      new CustomEvent("board-ws-send", {
        detail: { type: "REDO" },
      })
    );
  };

  /* ================= PAN + ZOOM ================= */

  const applyTransform = () => {
    if (!contentRef.current) return;
    const { x, y, zoom } = cameraRef.current;

    contentRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
  };

  const syncCameraState = () => {
    setCamera({ ...cameraRef.current });
  };

  const startZoomAnimation = () => {
    if (rafRef.current) return;

    const animate = () => {
      const cam = cameraRef.current;

      // Apply velocity
      if (Math.abs(zoomVelocityRef.current) < 0.00001) {
        zoomVelocityRef.current = 0;
        rafRef.current = null;
        return;
      }

      const zoomDelta = Math.max(
        -0.12,
        Math.min(0.12, zoomVelocityRef.current)
      );

      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, cam.zoom * Math.exp(zoomDelta))
      );

      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const wx = (cx - cam.x) / cam.zoom;
      const wy = (cy - cam.y) / cam.zoom;

      cam.zoom = nextZoom;
      cam.x = cx - wx * cam.zoom;
      cam.y = cy - wy * cam.zoom;

      // Friction (THIS is smoothness)
      zoomVelocityRef.current *= 0.72;

      applyTransform();
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();

      const cam = cameraRef.current;
      const rect = containerRef.current.getBoundingClientRect();

      if (e.ctrlKey || e.metaKey) {
        const zoomImpulse = -e.deltaY * 0.003; // 👈 important
        zoomVelocityRef.current += zoomImpulse;
        startZoomAnimation();
        return;
      } else {
        cam.x -= e.deltaX;
        cam.y -= e.deltaY;
        applyTransform();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  /* ================= INSERT ================= */

  const onCanvasPointerDown = (e) => {
    if (canvasState.mode !== CanvasMode.Inserting) return;

    const layerType = canvasState.layerType;

    if (!canInsertLayer(layerType)) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Layer limit reached" },
        })
      );

      setCanvasState({ mode: CanvasMode.None, layerType: null });
      return;
    }

    const cam = cameraRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    // screen → world (true infinite)
    const worldX = (e.clientX - rect.left - cam.x) / cam.zoom;
    const worldY = (e.clientY - rect.top - cam.y) / cam.zoom;

    let layer;
    switch (canvasState.layerType) {
      case LayerType.Rectangle:
        layer = { ...RectangleLayer };
        break;
      case LayerType.Ellipse:
        layer = { ...EllipseLayer };
        break;
      case LayerType.Text:
        layer = { ...TextLayer, isNew: true };
        break;
      case LayerType.Note:
        layer = { ...NoteLayer };
        break;
      default:
        return;
    }

    layer.id = crypto.randomUUID();
    layer.x = worldX - layer.width / 2;
    layer.y = worldY - layer.height / 2;

    commitLayers([...layers, layer]);
    setCanvasState({ mode: CanvasMode.None, layerType: null });
  };

  useEffect(() => {
    applyTransform();
  }, []);

  /* ================= RENDER ================= */

  return (
    <BoardSocketProvider>
      <main
        ref={containerRef}
        className="h-full w-full relative bg-neutral-100 overflow-hidden"
        onPointerDown={onCanvasPointerDown}
      >
        <Info />
        <Participants />

        <Toolbar
          canvasState={canvasState}
          setCanvasState={setCanvasState}
          undo={undo}
          redo={redo}
          canUndo={true}
          canRedo={true}
        />

        <div className="absolute inset-0 overflow-hidden">
          <div
            ref={contentRef}
            className="absolute top-0 left-0"
            style={{
              width: 100000,
              height: 100000,
              transformOrigin: "0 0",
              willChange: "transform",
            }}
          >
            <svg
              className="absolute top-0 left-0"
              width="100%"
              height="100%"
              style={{
                overflow: "visible",
                pointerEvents: "none",
              }}
            >
              {layers.map((l) =>
                l.type === LayerType.Rectangle ? (
                  <rect
                    key={l.id}
                    x={l.x}
                    y={l.y}
                    width={l.width}
                    height={l.height}
                    stroke="black"
                    strokeWidth={1 / camera.zoom}
                    vectorEffect="non-scaling-stroke"
                    shapeRendering="geometricPrecision"
                    fill={l.fill ?? "transparent"}
                    pointerEvents="auto"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : l.type === LayerType.Ellipse ? (
                  <ellipse
                    key={l.id}
                    cx={l.x + l.width / 2}
                    cy={l.y + l.height / 2}
                    rx={l.width / 2}
                    ry={l.height / 2}
                    stroke="black"
                    fill="transparent"
                    strokeWidth={1 / camera.zoom}
                    vectorEffect="non-scaling-stroke"
                    shapeRendering="geometricPrecision"
                    pointerEvents="auto"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null
              )}
            </svg>

            {layers.map((l) =>
              l.type === LayerType.Text ? (
                <TextLayerView
                  layer={l}
                  onCommit={(id, patch) => {
                    // 🔥 track editing state
                    if (patch.__editing) {
                      editingTextIdRef.current = id;
                    }

                    if (patch.__editing === false) {
                      editingTextIdRef.current = null;
                    }

                    const next = layers.map((layer) =>
                      layer.id === id ? { ...layer, ...patch } : layer
                    );

                    // ✅ Always update local React state
                    setLayers(next);

                    // ❌ Skip backend for live typing
                    if (patch.__local) return;

                    // ✅ Final commit only
                    commitLayers(next);
                  }}
                />
              ) : l.type === LayerType.Note ? (
                <NoteLayerView
                  layer={l}
                  onCommit={(id, patch) => {
                    const next = layers.map((layer) =>
                      layer.id === id ? { ...layer, ...patch } : layer
                    );
                    commitLayers(next);
                  }}
                />
              ) : null
            )}
          </div>
        </div>
        <CursorsPresence />
      </main>
    </BoardSocketProvider>
  );
};
