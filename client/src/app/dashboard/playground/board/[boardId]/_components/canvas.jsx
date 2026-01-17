"use client";

import { useEffect, useRef, useState } from "react";
import { CursorsPresence } from "./cursors-presence";
import { Info } from "./info";
import { Participants } from "./participants";
import { usePresenceColors } from "@/hooks/use-presence-color";
import { useContext } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";
import { SelectionBox } from "./selection-box";
import { Toolbar } from "./toolbar";

import { SelectionTools } from "./selection-tools";
import {
  CanvasMode,
  LayerType,
  RectangleLayer,
  EllipseLayer,
  TextLayer,
  NoteLayer,
} from "../../../../../../../types/canvas";

import { TextLayerView } from "./TextLayerView";
import { NoteLayerView } from "./NoteLayerView";
import { last } from "pdf-lib";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const MAX_LAYERS_PER_TYPE = 100;

export const Canvas = () => {
  const isApplyingHistoryRef = useRef(false);

  const didInitCameraRef = useRef(false);

  const isManualResizingRef = useRef(false);

  const selectedByRef = useRef(new Map());

  const isResizingRef = useRef(false);

  const rafRef = useRef(null);
  const zoomDeltaRef = useRef(0);

  const panVelocityRef = useRef({ x: 0, y: 0 });

  const dragLayerRef = useRef(null);

  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const resizeRef = useRef(null);

  const { otherUsers, userColors, getUserColor } = usePresenceColors();

  const [version, setVersion] = useState(0);
  const [maxVersion, setMaxVersion] = useState(0);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const { send, lastEvent, initState, selfConnectionId } =
    useContext(BoardSocketContext);

  const [canvasState, setCanvasState] = useState({
    mode: CanvasMode.None,
    layerType: null,
  });

  const editingLayerIdsRef = useRef(new Set());

  const [layers, setLayers] = useState([]);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const contentRef = useRef(null);

  const rectRef = useRef(null);

  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        rectRef.current = containerRef.current.getBoundingClientRect();
      }
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, []);

  const getScreenPoint = (e) => {
    const rect = rectRef.current;

    return {
      sx: e.clientX - rect.left,
      sy: e.clientY - rect.top,
    };
  };

  const canInsertLayer = (type) => {
    const count = layers.filter((l) => l.type === type).length;
    return count < MAX_LAYERS_PER_TYPE;
  };

  const updateLayerValue = (id, value) => {
    const next = layers.map((l) => (l.id === id ? { ...l, value } : l));
    commitLayers(next);
  };

  const normalizeLayer = (l) => {
    const baseStyle = {
      stroke: "#000000",
      strokeWidth: 2,
      textColor: "#000000",
      fontSize: 20,
      opacity: 1,
    };

    if (l.type === LayerType.Note) {
      return {
        ...l,
        style: {
          fill: "#FFF59D",
          ...baseStyle,
          fontSize: l.style?.fontSize ?? 28, // 🔥 BIGGER DEFAULT
          ...(l.style || {}),
        },
      };
    }

    return {
      ...l,
      style: {
        fill: "transparent",
        ...baseStyle,
        ...(l.style || {}),
      },
    };
  };

  const screenToWorld = (e) => {
    const rect = rectRef.current;
    const cam = cameraRef.current;

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    return {
      x: (sx - cam.x) / cam.zoom,
      y: (sy - cam.y) / cam.zoom,
    };
  };

  useEffect(() => {
    localStorage.removeItem("board_camera");

    didInitCameraRef.current = true;
  }, []);

  useEffect(() => {
    const rect = rectRef.current;

    if (!rect) return;

    // Set initial zoom anchor to screen center
  }, []);

  useEffect(() => {
    if (!initState) return;

    const normalizedLayers = (initState.layers || []).map(normalizeLayer);
    setLayers(normalizedLayers);

    setVersion(initState.version ?? 0);
    setMaxVersion(initState.maxVersion ?? 0);

    setCanUndo((initState.version ?? 0) > 0);
    setCanRedo((initState.version ?? 0) < (initState.maxVersion ?? 0));

    // ✅ ADD THIS BLOCK — EXACTLY HERE
    if (
      normalizedLayers.length &&
      !didInitCameraRef.current &&
      !localStorage.getItem("board_camera")
    ) {
      didInitCameraRef.current = true;

      const xs = normalizedLayers.map((l) => l.x);
      const ys = normalizedLayers.map((l) => l.y);

      const cam = {
        x: -(Math.min(...xs) - 200),
        y: -(Math.min(...ys) - 200),
        zoom: 1,
      };

      cameraRef.current = cam;
      setCamera(cam);
    }

    setIsLoading(false);
  }, [initState]);

  useEffect(() => {
    if (!lastEvent) return;

    const d = lastEvent;

    if (d.type === "LAYERS_REPLACE") {
      const next = d.layers.map(normalizeLayer);

      isApplyingHistoryRef.current = true;
      setLayers(next);
      isApplyingHistoryRef.current = false;

      if (typeof d.version === "number") {
        setVersion(d.version);
      }

      if (typeof d.maxVersion === "number") {
        setMaxVersion(d.maxVersion);
      }

      setCanUndo(d.version > 0);
      setCanRedo(d.version < d.maxVersion);
    }

    if (d.type === "TEXT_LIVE_UPDATE") {
      setLayers((prev) =>
        prev.map((l) => {
          if (l.id !== d.id) return l;

          // block only if *I* am editing
          if (
            editingLayerIdsRef.current.has(l.id) &&
            d.connectionId === selfConnectionId
          ) {
            return l;
          }

          return {
            ...l,
            value: d.value,
            width: d.width,
            height: d.height,
          };
        })
      );
    }

    if (d.type === "NOTE_LIVE_UPDATE") {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === d.id
            ? { ...l, value: d.value, width: d.width, height: d.height }
            : l
        )
      );
    }

    if (d.type === "LAYER_SELECTED") {
      // 🔥 track EVERYONE
      selectedByRef.current.set(d.layerId, d.connectionId);

      // only update my own selectedLayerId
      if (d.connectionId === selfConnectionId) {
        setSelectedLayerId(d.layerId);
      }

      setVersion((v) => v + 1); // force re-render
    }

    if (d.type === "LAYER_DESELECTED") {
      for (const [layerId, cid] of selectedByRef.current.entries()) {
        if (cid === d.connectionId) {
          selectedByRef.current.delete(layerId);
        }
      }

      if (d.connectionId === selfConnectionId) {
        setSelectedLayerId(null);
      }

      setVersion((v) => v + 1);
    }
  }, [lastEvent]);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);

  const selectionBounds = selectedLayer && {
    x: selectedLayer.x,
    y: selectedLayer.y,
    width: selectedLayer.width,
    height: selectedLayer.height,
  };

  const onResizeHandlePointerDown = (e, handle) => {
    if (!selectedLayer) return;

    isManualResizingRef.current = true;
    e.preventDefault();
    e.stopPropagation();

    const { x: mx, y: my } = screenToWorld(e);

    resizeRef.current = {
      handle,
      startX: selectedLayer.x,
      startY: selectedLayer.y,
      startW: selectedLayer.width,
      startH: selectedLayer.height,
      startFontSize: selectedLayer.style?.fontSize ?? 20,
      mouseX: mx,
      mouseY: my,
      layerId: selectedLayer.id,
    };

    isResizingRef.current = true;

    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", stopResize);
  };

  const stopResize = () => {
    if (!isResizingRef.current) return;

    const shouldCommit = isManualResizingRef.current;

    isResizingRef.current = false;
    isManualResizingRef.current = false;

    if (!shouldCommit) return;

    setLayers((prev) => {
      commitLayers(prev);
      return prev;
    });

    resizeRef.current = null;

    window.removeEventListener("pointermove", onResizeMove);
    window.removeEventListener("pointerup", stopResize);
  };

  const onResizeMove = (e) => {
    if (!isResizingRef.current) return;

    const { x: mx, y: my } = screenToWorld(e);

    const r = resizeRef.current;
    const dx = mx - r.mouseX;
    const dy = my - r.mouseY;

    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== r.layerId) return l;

        let x = r.startX;
        let y = r.startY;
        let w = r.startW;
        let h = r.startH;

        // 🔁 FREE FLIP RESIZE (unchanged)
        if (r.handle.includes("e")) w = r.startW + dx;
        if (r.handle.includes("w")) {
          w = r.startW - dx;
          x = r.startX + dx;
        }
        if (r.handle.includes("s")) h = r.startH + dy;
        if (r.handle.includes("n")) {
          h = r.startH - dy;
          y = r.startY + dy;
        }

        if (w < 0) {
          x += w;
          w = Math.abs(w);
        }
        if (h < 0) {
          y += h;
          h = Math.abs(h);
        }

        w = Math.max(6, w);
        h = Math.max(6, h);

        let style = l.style;

        // 🔥 CORRECT FONT SCALING (NO DRIFT)
        if (
          (l.type === LayerType.Text || l.type === LayerType.Note) &&
          isResizingRef.current
        ) {
          const scaleX = w / r.startW;
          const scaleY = h / r.startH;
          const scale = Math.min(scaleX, scaleY);

          style = {
            ...l.style,
            fontSize: Math.max(14, r.startFontSize * scale),
          };
        }

        return { ...l, x, y, width: w, height: h, style };
      })
    );
  };

  const startLayerDrag = (e, layer) => {
    // 🚫 don’t drag while resizing
    if (isResizingRef.current) return;

    // 🚫 don’t drag while typing
    if (editingLayerIdsRef.current.has(layer.id)) return;

    e.preventDefault();
    e.stopPropagation();

    const { x: mx, y: my } = screenToWorld(e);

    dragLayerRef.current = {
      id: layer.id,
      startX: layer.x,
      startY: layer.y,
      mouseX: mx,
      mouseY: my,
    };

    window.addEventListener("pointermove", onLayerDragMove);
    window.addEventListener("pointerup", stopLayerDrag);
  };

  const onLayerDragMove = (e) => {
    if (!dragLayerRef.current) return;

    const { x: mx, y: my } = screenToWorld(e);
    const r = dragLayerRef.current;

    const dx = mx - r.mouseX;
    const dy = my - r.mouseY;

    setLayers((prev) =>
      prev.map((l) =>
        l.id === r.id ? { ...l, x: r.startX + dx, y: r.startY + dy } : l
      )
    );
  };

  const stopLayerDrag = () => {
    if (!dragLayerRef.current) return;

    setLayers((prev) => {
      commitLayers(prev);
      return prev;
    });

    dragLayerRef.current = null;

    window.removeEventListener("pointermove", onLayerDragMove);
    window.removeEventListener("pointerup", stopLayerDrag);
  };

  useEffect(() => {
    window.__BOARD_CAMERA__ = cameraRef;
  }, []);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastSent = 0;

    const move = (e) => {
      const now = performance.now();
      if (now - lastSent < 80) return;
      lastSent = now;

      const rect = rectRef.current;

      const cam = cameraRef.current;

      const x = (e.clientX - rect.left - cam.x) / cam.zoom;
      const y = (e.clientY - rect.top - cam.y) / cam.zoom;

      send({ type: "CURSOR_MOVE", x, y });
    };

    const leave = () => {
      send({ type: "CURSOR_LEAVE" });
    };

    el.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);

    el.addEventListener("mousemove", move);

    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
    };
  }, []);

  /* ================= WS RECEIVE ================= */

  /* ================= HISTORY ================= */

  const stripMeta = (layer) => {
    const { __editing, __local, ...rest } = layer;
    return rest;
  };

  const commitLayers = (next, { allowEmpty = false } = {}) => {
    if (!next) return;
    if (next.length === 0 && !allowEmpty) return;

    const clean = next.map(stripMeta);

    send({
      type: "LAYERS_COMMIT",
      layers: clean,
    });
  };

  const undo = () => {
    if (!canUndo) return;
    send({ type: "UNDO" });
  };

  const redo = () => {
    if (!canRedo) return;
    send({ type: "REDO" });
  };

  /* ================= PAN + ZOOM ================= */

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      if (isResizingRef.current) return;
      e.preventDefault();

      const rect = rectRef.current;
      if (!rect) return;

      const cam = cameraRef.current;

      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;

      // 🔥 ZOOM
      if (e.ctrlKey || e.metaKey) {
        zoomDeltaRef.current += e.deltaY;

        if (!rafRef.current) {
          const animate = () => {
            const cam = cameraRef.current;

            const delta = zoomDeltaRef.current * 0.0012;

            zoomDeltaRef.current *= 0.7; // 👈 single decay (key)

            if (Math.abs(zoomDeltaRef.current) < 0.01) {
              zoomDeltaRef.current = 0;
              rafRef.current = null;
              return;
            }

            const nextZoom = Math.min(
              MAX_ZOOM,
              Math.max(MIN_ZOOM, cam.zoom * Math.exp(-delta))
            );

            const wx = (sx - cam.x) / cam.zoom;
            const wy = (sy - cam.y) / cam.zoom;

            cam.zoom = nextZoom;
            cam.x = sx - wx * cam.zoom;
            cam.y = sy - wy * cam.zoom;

            setCamera({ ...cam });
            rafRef.current = requestAnimationFrame(animate);
          };

          rafRef.current = requestAnimationFrame(animate);
        }

        return;
      }

      // 🔥 PAN (INERTIAL)
      // 🔥 PAN (INERTIAL) — SLOWED
      panVelocityRef.current.x += e.deltaX * 0.35;
      panVelocityRef.current.y += e.deltaY * 0.35;

      if (!rafRef.current) {
        const animatePan = () => {
          const cam = cameraRef.current;
          const v = panVelocityRef.current;

          cam.x -= v.x;
          cam.y -= v.y;

          v.x *= 0.7; // 👈 single decay
          v.y *= 0.7;

          // ✅ DIRECT COMMIT — NO EXTRA RAF
          setCamera({ ...cam });

          if (Math.abs(v.x) < 0.15 && Math.abs(v.y) < 0.15) {
            panVelocityRef.current.x = 0;
            panVelocityRef.current.y = 0;
            rafRef.current = null;
            return;
          }

          rafRef.current = requestAnimationFrame(animatePan);
        };

        rafRef.current = requestAnimationFrame(animatePan);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    localStorage.setItem("board_camera", JSON.stringify(cameraRef.current));
  }, [camera]);

  /* ================= INSERT ================= */

  const onCanvasPointerDown = (e) => {
    if (isResizingRef.current) return;

    // Ignore clicks originating from toolbar only
    if (e.target.closest("[data-ui]")) {
      return;
    }

    const rect =
      rectRef.current ?? containerRef.current?.getBoundingClientRect();
    const cam = cameraRef.current;

    if (!rect) return;

    // ✅ viewport → world
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const worldX = (sx - cam.x) / cam.zoom;
    const worldY = (sy - cam.y) / cam.zoom;

    // 🧹 Deselect if clicking on background (not a layer)
    const clickedLayer = e.target.closest("[data-layer]");

    if (!clickedLayer && canvasState.mode === CanvasMode.None) {
      // 🔥 HARD EXIT TEXT / NOTE EDIT MODE (MIRO BEHAVIOR)
      editingLayerIdsRef.current.clear();

      // force blur if something was focused
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      setSelectedLayerId(null);
      selectedByRef.current.clear();
      send({ type: "LAYER_DESELECT" });
    }

    if (canvasState.mode !== CanvasMode.Inserting) return;

    const layerType = canvasState.layerType;

    if (!canInsertLayer(layerType)) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Layer limit reached" },
        })
      );

      setCanvasState({
        mode: CanvasMode.None,
        layerType: null,
      });

      return;
    }

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

    // 1️⃣ instant local insert
    setLayers((prev) => {
      const next = [...prev, layer];
      commitLayers(next, { allowEmpty: true });
      return next;
    });

    setSelectedLayerId(layer.id);
    selectedByRef.current.set(layer.id, selfConnectionId);

    send({ type: "LAYER_SELECT", layerId: layer.id });

    setCanvasState((prev) => ({
      ...prev,
      mode: CanvasMode.None,
      layerType: null,
    }));
  };

  const orderedLayers = [
    ...layers.filter(
      (l) =>
        l.type === LayerType.Rectangle ||
        l.type === LayerType.Ellipse ||
        l.type === LayerType.Note
    ),
    ...layers.filter((l) => l.type === LayerType.Text),
  ];

  /* ================= RENDER ================= */

  return (
    <main
      ref={containerRef}
      className="h-full w-full relative bg-neutral-100 overflow-hidden"
    >
      {isLoading && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-neutral-100">
          <div className="w-10 h-10 border-[3px] border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />
        </div>
      )}

      <Info />
      <Participants />

      <Toolbar
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />

      <SelectionTools
        camera={camera}
        selectedLayer={selectedLayer}
        selectionBounds={selectionBounds}
        setLayers={setLayers}
        commitLayers={commitLayers}
      />

      {!isLoading && (
        <div className="absolute inset-0 overflow-hidden">
          <div
            ref={contentRef}
            className="absolute top-0 left-0"
            style={{
              width: 100000,
              height: 100000,
              transform: `
  translate3d(${camera.x}px, ${camera.y}px, 0)
  scale(${camera.zoom})
`,

              transformOrigin: "0 0",
              willChange: "transform",
            }}
            onPointerDown={onCanvasPointerDown}
          >
            <svg
              className="absolute top-0 left-0"
              width="100%"
              height="100%"
              style={{ overflow: "visible" }}
            >
              <rect
                x={-50000}
                y={-50000}
                width={100000}
                height={100000}
                fill="transparent"
                pointerEvents="all"
                onPointerDown={(e) => {
                  // 🚫 DO NOT DESELECT WHILE INSERTING
                  if (canvasState.mode === CanvasMode.Inserting) return;
                  if (isResizingRef.current) return;

                  setSelectedLayerId(null);
                  selectedByRef.current.clear();
                  send({ type: "LAYER_DESELECT" });
                }}
              />

              {orderedLayers.map((l) => {
                const selectedBy = selectedByRef.current.get(l.id);
                const isOtherUser =
                  selectedBy && selectedBy !== selfConnectionId;

                return l.type === LayerType.Rectangle ? (
                  <rect
                    data-layer
                    key={l.id}
                    x={l.x}
                    y={l.y}
                    width={l.width}
                    height={l.height}
                    fill={l.style.fill}
                    stroke={l.style.stroke}
                    strokeWidth={l.style.strokeWidth}
                    pointerEvents="auto"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (isResizingRef.current) return;

                      setSelectedLayerId(l.id);
                      selectedByRef.current.set(l.id, selfConnectionId);
                      send({ type: "LAYER_SELECT", layerId: l.id });

                      startLayerDrag(e, l); // 👈 ADD THIS
                    }}
                  />
                ) : l.type === LayerType.Ellipse ? (
                  <ellipse
                    data-layer
                    key={l.id}
                    cx={l.x + l.width / 2}
                    cy={l.y + l.height / 2}
                    rx={l.width / 2}
                    ry={l.height / 2}
                    fill={l.style.fill}
                    stroke={l.style.stroke}
                    strokeWidth={l.style.strokeWidth}
                    pointerEvents="auto"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (isResizingRef.current) return;

                      setSelectedLayerId(l.id);
                      selectedByRef.current.set(l.id, selfConnectionId);
                      send({ type: "LAYER_SELECT", layerId: l.id });

                      startLayerDrag(e, l); // 👈 ADD THIS
                    }}
                  />
                ) : null;
              })}

              {orderedLayers.map((l) => {
                const selectedBy = selectedByRef.current.get(l.id);

                // only show OTHER users’ selections
                if (!selectedBy || selectedBy === selfConnectionId) return null;

                const color = getUserColor(selectedBy);
                const pad = 2;

                if (l.type === LayerType.Rectangle) {
                  return (
                    <rect
                      key={`outline-${l.id}`}
                      x={l.x - pad}
                      y={l.y - pad}
                      width={l.width + pad * 2}
                      height={l.height + pad * 2}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      rx={6}
                      pointerEvents="none"
                    />
                  );
                }

                if (l.type === LayerType.Ellipse) {
                  return (
                    <ellipse
                      key={`outline-${l.id}`}
                      cx={l.x + l.width / 2}
                      cy={l.y + l.height / 2}
                      rx={l.width / 2 + pad}
                      ry={l.height / 2 + pad}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      pointerEvents="none"
                    />
                  );
                }

                return null;
              })}
            </svg>
            {/* 🔵 SELECTION OUTLINE OVERLAY */}

            {orderedLayers.map((l) =>
              l.type === LayerType.Text ? (
                <TextLayerView
                  key={l.id} // ✅ REQUIRED
                  layer={l}
                  editingLayerIdsRef={editingLayerIdsRef}
                  onCommit={(id, patch) => {
                    if (patch.__editing === true) {
                      editingLayerIdsRef.current.add(id);
                    }

                    if (patch.__editing === false) {
                      editingLayerIdsRef.current.delete(id);
                    }

                    const next = layers.map((layer) =>
                      layer.id === id ? { ...layer, ...patch } : layer
                    );

                    if (patch.__select) {
                      setSelectedLayerId(id);
                      selectedByRef.current.set(id, selfConnectionId);
                      send({ type: "LAYER_DESELECT" });
                      send({ type: "LAYER_SELECT", layerId: id });
                      return;
                    }

                    setLayers(next);

                    if (patch.__local) return;
                    commitLayers(next);
                  }}
                  isManualResizingRef={isManualResizingRef}
                  onPointerDown={(e) => startLayerDrag(e, l)}
                />
              ) : l.type === LayerType.Note ? (
                <NoteLayerView
                  key={l.id} // ✅ REQUIRED
                  layer={l}
                  onPointerDown={(e) => startLayerDrag(e, l)}
                  editingLayerIdsRef={editingLayerIdsRef}
                  onCommit={(id, patch) => {
                    if (patch.__editing === true) {
                      editingLayerIdsRef.current.add(id);
                    }

                    if (patch.__editing === false) {
                      editingLayerIdsRef.current.delete(id);
                    }

                    const next = layers.map((layer) =>
                      layer.id === id ? { ...layer, ...patch } : layer
                    );

                    if (patch.__select) {
                      setSelectedLayerId(id);
                      selectedByRef.current.set(id, selfConnectionId);
                      send({ type: "LAYER_DESELECT" });
                      send({ type: "LAYER_SELECT", layerId: id });
                      return;
                    }

                    setLayers(next);

                    if (patch.__local) return;
                    commitLayers(next);
                  }}
                  isManualResizingRef={isManualResizingRef}
                />
              ) : null
            )}

            {selectionBounds && (
              <svg
                className="absolute top-0 left-0 pointer-events-none"
                width={100000}
                height={100000}
                style={{
                  overflow: "visible",
                  zIndex: 9999,
                }}
              >
                <SelectionBox
                  bounds={selectionBounds}
                  onResizeHandlePointerDown={onResizeHandlePointerDown}
                />
              </svg>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 9999,
        }}
      >
        <CursorsPresence />
      </div>
    </main>
  );
};
