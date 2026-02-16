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

import { AutoTextLayerView } from "./AutoLayer";

import { SelectionTools } from "./selection-tools";
import {
  CanvasMode,
  LayerType,
  RectangleLayer,
  EllipseLayer,
  TextLayer,
  NoteLayer,
  AutoTextLayer,
} from "../../../../../../../types/canvas";

import { TextLayerView } from "./TextLayerView";
import { NoteLayerView } from "./NoteLayerView";
import { last } from "pdf-lib";

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const MAX_LAYERS_PER_TYPE = 100;

export const Canvas = () => {
  const isInteractingRef = useRef(false);

  const panDeltaRef = useRef({ x: 0, y: 0 });
  const panRafRef = useRef(null);

  const isApplyingHistoryRef = useRef(false);

  const clipboardRef = useRef(null);
  const lastMouseWorldRef = useRef({ x: 0, y: 0 });

  const didInitCameraRef = useRef(false);

  const isManualResizingRef = useRef(false);

  const selectedByRef = useRef(new Map());

  const isResizingRef = useRef(false);

  const rafRef = useRef(null);
  const zoomDeltaRef = useRef(0);

  const panVelocityRef = useRef({ x: 0, y: 0 });

  const dragLayerRef = useRef(null);

  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState(new Set());
  const marqueeRef = useRef(null);
  const [marquee, setMarquee] = useState(null);

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

        // ✅ stroke ONLY for shapes, NOT for text
        ...(l.type === LayerType.Text
          ? {}
          : { stroke: "#000000", strokeWidth: 2 }),

        // keep text style
        textColor: "#000000",
        fontSize: 20,
        opacity: 1,

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
    const unique = new Map();
    normalizedLayers.forEach((l) => {
      if (!unique.has(l.id)) unique.set(l.id, l);
    });
    setLayers(Array.from(unique.values()));

    setVersion(initState.version ?? 0);
    setMaxVersion(initState.maxVersion ?? 0);

    const v = initState.version ?? 0;
    const m = initState.maxVersion ?? 0;

    setCanUndo(v > 0);
    setCanRedo(v < m);

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
      const normalized = d.layers.map(normalizeLayer);

      const unique = new Map();
      normalized.forEach((l) => {
        if (!unique.has(l.id)) unique.set(l.id, l);
      });

      const next = Array.from(unique.values());

      isApplyingHistoryRef.current = true;
      setLayers(next);
      isApplyingHistoryRef.current = false;

      const v = d.version ?? 0;
      const m = d.maxVersion ?? 0;

      setVersion(v);
      setMaxVersion(m);

      setCanUndo(v > 0);
      setCanRedo(v < m);
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
            __domRect: l.type === LayerType.AutoText ? l.__domRect : undefined,
          };
        }),
      );
    }

    if (d.type === "NOTE_LIVE_UPDATE") {
      setLayers((prev) =>
        prev.map((l) =>
          l.id === d.id
            ? { ...l, value: d.value, width: d.width, height: d.height }
            : l,
        ),
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

  const singleBounds = selectedLayer
    ? {
        x: selectedLayer.x,
        y: selectedLayer.y,
        width: Math.max(selectedLayer.width, 1),
        height: Math.max(selectedLayer.height, 1),
      }
    : null;

  const groupBounds =
    selectedLayerIds.size > 1
      ? (() => {
          const selected = layers.filter((l) => selectedLayerIds.has(l.id));

          const xs = selected.map((l) => l.x);
          const ys = selected.map((l) => l.y);
          const xe = selected.map((l) => l.x + l.width);
          const ye = selected.map((l) => l.y + l.height);

          return {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xe) - Math.min(...xs),
            height: Math.max(...ye) - Math.min(...ys),
          };
        })()
      : null;

  // 🔥 SINGLE SOURCE OF TRUTH
  const activeBounds = groupBounds ?? singleBounds;

  const onResizeHandlePointerDown = (e, handle) => {
    document.body.style.userSelect = "none";

    window.__IS_RESIZING__ = true;

    if (!activeBounds) return;

    isManualResizingRef.current = true;
    e.preventDefault();
    e.stopPropagation();

    const { x: mx, y: my } = screenToWorld(e);

    resizeRef.current = {
      handle,
      mouseX: mx,
      mouseY: my,
      isGroup: selectedLayerIds.size > 1,

      layers:
        selectedLayerIds.size > 1
          ? layers
              .filter((l) => selectedLayerIds.has(l.id))
              .map((l) => ({
                id: l.id,
                x: l.x,
                y: l.y,
                w: l.width,
                h: l.height,
                fontSize: l.style?.fontSize ?? 20,
              }))
          : [
              {
                id: selectedLayer.id,
                x: selectedLayer.x,
                y: selectedLayer.y,
                w: selectedLayer.width,
                h: selectedLayer.height,
                fontSize: selectedLayer.style?.fontSize ?? 20,
              },
            ],
    };

    isResizingRef.current = true;

    window.addEventListener("pointermove", onResizeMove);
    window.addEventListener("pointerup", stopResize);
  };

  const stopResize = () => {
    document.body.style.userSelect = "auto";

    window.__IS_RESIZING__ = false;

    if (!isResizingRef.current) return;

    const shouldCommit = isManualResizingRef.current;

    isResizingRef.current = false;

    isManualResizingRef.current = false;

    if (!shouldCommit) return;

    setLayers((prev) => {
      const next = prev.map((l) =>
        l.id === resizeRef.current?.layerId && l.type === LayerType.AutoText
          ? l
          : // 🔥 KEEP MANUAL SIZE STATIC
            l,
      );

      if (next.length > 0) {
        commitLayers(next);
      }

      return next;
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

    const MIN = 20;

    setLayers((prev) => {
      const group = r.layers;

      const gx = Math.min(...group.map((g) => g.x));
      const gy = Math.min(...group.map((g) => g.y));
      const gxe = Math.max(...group.map((g) => g.x + g.w));
      const gye = Math.max(...group.map((g) => g.y + g.h));

      const gWidth = gxe - gx;
      const gHeight = gye - gy;

      const dx = mx - r.mouseX;
      const dy = my - r.mouseY;

      let scaleX = 1;
      let scaleY = 1;

      if (r.handle.includes("e")) scaleX = (gWidth + dx) / gWidth;
      if (r.handle.includes("s")) scaleY = (gHeight + dy) / gHeight;

      if (r.handle.includes("w")) scaleX = (gWidth - dx) / gWidth;
      if (r.handle.includes("n")) scaleY = (gHeight - dy) / gHeight;

      // prevent collapse
      scaleX = Math.max(0.05, scaleX);
      scaleY = Math.max(0.05, scaleY);

      return prev.map((l) => {
        const base = group.find((b) => b.id === l.id);
        if (!base) return l;

        // 🔥 SCALE RELATIVE TO GROUP ORIGIN (CRITICAL)
        const relX = base.x - gx;
        const relY = base.y - gy;

        const newW = base.w * scaleX;
        const newH = base.h * scaleY;

        const newX = r.handle.includes("w")
          ? gxe - (relX + base.w) * scaleX
          : gx + relX * scaleX;

        const newY = r.handle.includes("n")
          ? gye - (relY + base.h) * scaleY
          : gy + relY * scaleY;

        let style = l.style;
        const isTextLike =
          l.type === LayerType.Text ||
          l.type === LayerType.Note ||
          l.type === LayerType.AutoText;

        if (isTextLike) {
          const scale = Math.min(scaleX, scaleY);
          style = {
            ...l.style,
            fontSize: Math.max(8, base.fontSize * scale),
          };
        }

        return {
          ...l,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
          style,
          __manualSize: true,
          __autoSizing: false,
        };
      });
    });
  };

  const startLayerDrag = (e, layer) => {
    if (editingLayerIdsRef.current.has(layer.id)) {
      return;
    }

    document.body.style.userSelect = "none";

    if (isResizingRef.current) return;

    e.preventDefault();
    e.stopPropagation();

    const { x: mx, y: my } = screenToWorld(e);

    dragLayerRef.current = {
      id: layer.id,
      isGroup: selectedLayerIds.size > 1 && selectedLayerIds.has(layer.id),

      startPositions:
        selectedLayerIds.size > 1
          ? layers
              .filter((l) => selectedLayerIds.has(l.id))
              .map((l) => ({ id: l.id, x: l.x, y: l.y }))
          : null,
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
      prev.map((l) => {
        if (r.isGroup && r.startPositions) {
          const sp = r.startPositions.find((p) => p.id === l.id);
          if (!sp) return l;

          return {
            ...l,
            x: sp.x + dx,
            y: sp.y + dy,
          };
        }

        if (l.id === r.id) {
          return {
            ...l,
            x: r.startX + dx,
            y: r.startY + dy,
          };
        }

        return l;
      }),
    );
  };

  const stopLayerDrag = () => {
    document.body.style.userSelect = "auto"; 

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

      lastMouseWorldRef.current = { x, y };

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

  useEffect(() => {
    const onKeyDown = async (e) => {
      // DELETE
      // DELETE (only when NOT editing text)
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedLayerId &&
        editingLayerIdsRef.current.size === 0
      ) {
        e.preventDefault();

        setLayers((prev) => {
          const next = prev.filter((l) => l.id !== selectedLayerId);
          commitLayers(next, { allowEmpty: true });
          return next;
        });

        setSelectedLayerId(null);
        selectedByRef.current.clear();
        send({ type: "LAYER_DESELECT" });
        return;
      }

      // COPY
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedLayer) {
        e.preventDefault();

        clipboardRef.current = {
          type: "layer",
          data: JSON.parse(JSON.stringify(selectedLayer)),
        };
        return;
      }

      // PASTE
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();

        // 1️⃣ Internal layer paste
        if (clipboardRef.current?.type === "layer") {
          const src = clipboardRef.current.data;
          const { x, y } = lastMouseWorldRef.current;

          const layer = {
            ...src,
            id: crypto.randomUUID(),
            x: x ?? src.x + 40,
            y: y ?? src.y + 40,
          };

          setLayers((prev) => {
            const next = [...prev, layer];
            commitLayers(next, { allowEmpty: true });
            return next;
          });

          setSelectedLayerId(layer.id);
          send({ type: "LAYER_SELECT", layerId: layer.id });
          return;
        }

        const text = await navigator.clipboard.readText();

        if (text && text.trim()) {
          const { x, y } = lastMouseWorldRef.current;

          const layer = {
            ...AutoTextLayer,
            id: crypto.randomUUID(),
            x,
            y,
            value: text,

            width: 1,
            height: 1,
          };

          setLayers((prev) => {
            const next = [...prev, layer];
            commitLayers(next, { allowEmpty: true });
            return next;
          });

          // ✅ CRITICAL: select immediately
          setSelectedLayerId(layer.id);
          selectedByRef.current.set(layer.id, selfConnectionId);
          send({ type: "LAYER_SELECT", layerId: layer.id });

          return;
        }

        // 3️⃣ Fallback: image / rich clipboard
        const items = await navigator.clipboard.read();

        for (const item of items) {
          if (item.types.some((t) => t.startsWith("image/"))) {
            const blob = await item.getType(
              item.types.find((t) => t.startsWith("image/")),
            );
            const reader = new FileReader();

            reader.onload = () => {
              const { x, y } = lastMouseWorldRef.current;

              const layer = {
                id: crypto.randomUUID(),
                type: "IMAGE",
                x,
                y,
                width: 300,
                height: 200,
                src: reader.result,
              };

              setLayers((prev) => {
                const next = [...prev, layer];
                commitLayers(next, { allowEmpty: true });
                return next;
              });
            };

            reader.readAsDataURL(blob);
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedLayerId, selectedLayer]);

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
              Math.max(MIN_ZOOM, cam.zoom * Math.exp(-delta)),
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

      // 🔥 PAN — MIRO-GRADE (ACCUMULATED, STABLE)
      const z = cameraRef.current.zoom;

      const PAN_SPEED = 0.9;
      const MAX_DELTA = 80;

      // clamp raw wheel noise
      const dx = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, e.deltaX));
      const dy = Math.max(-MAX_DELTA, Math.min(MAX_DELTA, e.deltaY));

      // accumulate
      panDeltaRef.current.x += dx;
      panDeltaRef.current.y += dy;

      // apply once per frame
      if (!panRafRef.current) {
        panRafRef.current = requestAnimationFrame(() => {
          const pd = panDeltaRef.current;

          cameraRef.current.x -= pd.x * PAN_SPEED;
          cameraRef.current.y -= pd.y * PAN_SPEED;

          setCamera({
            x: cameraRef.current.x,
            y: cameraRef.current.y,
            zoom: cameraRef.current.zoom,
          });

          // reset
          panDeltaRef.current.x = 0;
          panDeltaRef.current.y = 0;
          panRafRef.current = null;
        });
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
    if (e.button !== 0) return;

    const isLayer = e.target.closest("[data-layer]");
    const isSelectionSafe = e.target.closest("[data-selection-safe]");
    const isSelectionUI =
      e.target.closest("[data-selection]") ||
      e.target.closest("[data-selection-handle]");

    if (isLayer || isSelectionSafe || isSelectionUI) {
      return;
    }

    const rect =
      rectRef.current ?? containerRef.current?.getBoundingClientRect();

    if (!rect) return;

    const startWorld = screenToWorld(e);
    const startScreenX = e.clientX - rect.left;
    const startScreenY = e.clientY - rect.top;
    if (canvasState.mode === CanvasMode.None) {
      document.body.style.userSelect = "none";

      marqueeRef.current = {
        startWorld,
        startScreen: { x: startScreenX, y: startScreenY },
      };

      const onMove = (ev) => {
        const world = screenToWorld(ev);

        const next = {
          x: Math.min(marqueeRef.current.startWorld.x, world.x),
          y: Math.min(marqueeRef.current.startWorld.y, world.y),
          w: Math.abs(world.x - marqueeRef.current.startWorld.x),
          h: Math.abs(world.y - marqueeRef.current.startWorld.y),
        };

        marqueeRef.current.box = next;
        setMarquee(next);

        // 🔥 LIVE GROUP SELECTION
        const liveSelected = new Set();

        layers.forEach((l) => {
          const intersects = !(
            l.x + l.width < next.x ||
            l.x > next.x + next.w ||
            l.y + l.height < next.y ||
            l.y > next.y + next.h
          );

          if (intersects) liveSelected.add(l.id);
        });

        setSelectedLayerIds(liveSelected);
      };

      const onUp = () => {
        document.body.style.userSelect = "auto";

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);

        const m = marqueeRef.current?.box;

        setMarquee(null);
        marqueeRef.current = null;

        if (!m || m.w < 2 || m.h < 2) {
          setSelectedLayerId(null);
          setSelectedLayerIds(new Set());
          selectedByRef.current.clear();
          send({ type: "LAYER_DESELECT" });
          return;
        }

        const selected = new Set();

        layers.forEach((l) => {
          const intersects = !(
            l.x + l.width < m.x ||
            l.x > m.x + m.w ||
            l.y + l.height < m.y ||
            l.y > m.y + m.h
          );

          if (intersects) selected.add(l.id);
        });

        setSelectedLayerIds(selected);

        selectedByRef.current.clear();

        for (const id of selected) {
          selectedByRef.current.set(id, selfConnectionId);
          send({ type: "LAYER_SELECT", layerId: id });
        }

        if (selected.size > 0) {
          const topMost = [...layers].reverse().find((l) => selected.has(l.id));

          setSelectedLayerId(topMost?.id ?? null);
        } else {
          setSelectedLayerId(null);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return;
    }

    if (isResizingRef.current) return;

    // Ignore clicks originating from toolbar only
    if (e.target.closest("[data-ui]")) {
      return;
    }

    if (!rect) return;

    const cam = cameraRef.current;

    if (!rect) return;

    // ✅ viewport → world
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const worldX = (sx - cam.x) / cam.zoom;
    const worldY = (sy - cam.y) / cam.zoom;

    if (canvasState.mode !== CanvasMode.Inserting) {
      const clickedLayer = e.target.closest("[data-layer]");

      // 🧠 MIRO RULE: DO NOT DESELECT if user is editing and click is inside any layer
      if (!clickedLayer) {
        // 🔥 ONLY exit edit mode when clicking TRUE empty canvas
        if (editingLayerIdsRef.current.size > 0) {
          editingLayerIdsRef.current.clear();

          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        }

        // Clear selection ONLY for real canvas clicks
        setSelectedLayerId(null);
        setSelectedLayerIds(new Set());
        selectedByRef.current.clear();
        send({ type: "LAYER_DESELECT" });
      }

      return;
    }

    if (canvasState.mode !== CanvasMode.Inserting) return;

    const layerType = canvasState.layerType;

    if (!canInsertLayer(layerType)) {
      window.dispatchEvent(
        new CustomEvent("toast", {
          detail: { message: "Layer limit reached" },
        }),
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
        layer = {
          ...TextLayer,
          isNew: true,

          width: 120,
          height: 24,
          value: "",
        };
        break;

      case LayerType.Note:
        layer = { ...NoteLayer };
        break;
      default:
        return;
    }

    layer.id = crypto.randomUUID();
    layer.x = worldX;
    layer.y = worldY;

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

  const orderedLayers = layers.slice().sort((a, b) => {
    if (a.type === LayerType.Text && b.type !== LayerType.Text) return 1;
    if (a.type !== LayerType.Text && b.type === LayerType.Text) return -1;
    return 0;
  });

  /* ================= RENDER ================= */

  return (
    <main
      ref={containerRef}
      className="h-full w-full relative bg-neutral-100 overflow-hidden "
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
        isInteractingRef={isInteractingRef}
      />

      <SelectionTools
        camera={camera}
        selectedLayer={selectedLayer}
        selectedLayerIds={selectedLayerIds}
        selectionBounds={activeBounds}
        setLayers={setLayers}
        commitLayers={commitLayers}
        onDuplicate={() => {
          if (!selectedLayer) return;

          const { x, y } = lastMouseWorldRef.current;

          const copy = {
            ...JSON.parse(JSON.stringify(selectedLayer)),
            id: crypto.randomUUID(),
            x: x ?? selectedLayer.x + 40,
            y: y ?? selectedLayer.y + 40,
          };

          setLayers((prev) => {
            const next = [...prev, copy];
            commitLayers(next, { allowEmpty: true });
            return next;
          });

          setSelectedLayerId(copy.id);
          selectedByRef.current.set(copy.id, selfConnectionId);
          send({ type: "LAYER_SELECT", layerId: copy.id });
        }}
        onDelete={() => {
          if (!selectedLayer) return;

          setLayers((prev) => {
            const next = prev.filter((l) => l.id !== selectedLayer.id);
            commitLayers(next, { allowEmpty: true });
            return next;
          });

          setSelectedLayerId(null);
          selectedByRef.current.clear();
          send({ type: "LAYER_DESELECT" });
        }}
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
                  if (marqueeRef.current) return;
                  if (canvasState.mode === CanvasMode.Inserting) return;
                  if (isResizingRef.current) return;

                  const isLayer = e.target.closest("[data-layer]");
                  const isSafe = e.target.closest("[data-selection-safe]");
                  const isSelection =
                    e.target.closest("[data-selection]") ||
                    e.target.closest("[data-selection-handle]");

                  // 🔥 MASTER FIX: NEVER DESELECT when interacting with editable layers
                  if (isLayer || isSafe || isSelection) {
                    return;
                  }

                  // ONLY true empty canvas click should deselect
                  if (editingLayerIdsRef.current.size > 0) {
                    editingLayerIdsRef.current.clear();

                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }

                  setSelectedLayerId(null);
                  setSelectedLayerIds(new Set());
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
                ) : l.type === "IMAGE" ? (
                  <image
                    data-layer
                    key={l.id}
                    href={l.src}
                    x={l.x}
                    y={l.y}
                    width={l.width}
                    height={l.height}
                    pointerEvents="auto"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (isResizingRef.current) return;

                      // ✅ SELECT IMAGE (THIS WAS MISSING)
                      setSelectedLayerId(l.id);
                      selectedByRef.current.set(l.id, selfConnectionId);
                      send({ type: "LAYER_SELECT", layerId: l.id });

                      startLayerDrag(e, l);
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
                    // 🔥 DELETE EMPTY TEXT LAYER (ERASER RULE)
                    if (patch.__delete) {
                      setLayers((prev) => {
                        const next = prev.filter((l) => l.id !== id);
                        commitLayers(next, { allowEmpty: true });
                        return next;
                      });

                      editingLayerIdsRef.current.delete(id);
                      if (selectedLayerId === id) {
                        setSelectedLayerId(null);
                        selectedByRef.current.clear();
                        send({ type: "LAYER_DESELECT" });
                      }

                      return;
                    }

                    if (patch.__editing === true) {
                      editingLayerIdsRef.current.add(id);
                    }

                    if (patch.__editing === false) {
                      editingLayerIdsRef.current.delete(id);
                    }

                    const next = layers.map((layer) =>
                      layer.id === id ? { ...layer, ...patch } : layer,
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
                      layer.id === id ? { ...layer, ...patch } : layer,
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
              ) : l.type === LayerType.AutoText ? (
                <AutoTextLayerView
                  key={l.id}
                  layer={l}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (isResizingRef.current) return;

                    // ✅ SELECT AUTOTEXT (THIS WAS MISSING)
                    setSelectedLayerId(l.id);
                    selectedByRef.current.set(l.id, selfConnectionId);
                    send({ type: "LAYER_SELECT", layerId: l.id });

                    startLayerDrag(e, l);
                  }}
                  onCommit={(id, patch) => {
                    if (patch.value !== undefined) {
                      patch.__manualSize = false;
                    }

                    setLayers((prev) => {
                      const before = prev.find((l) => l.id === id);
                      if (!before) return prev;

                      const after = { ...before, ...patch };

                      // 🛑 HARD STOP — NOTHING CHANGED
                      if (
                        before.width === after.width &&
                        before.height === after.height &&
                        before.value === after.value &&
                        JSON.stringify(before.style) ===
                          JSON.stringify(after.style)
                      ) {
                        return prev;
                      }

                      const next = prev.map((l) => (l.id === id ? after : l));

                      if (!patch.__local) commitLayers(next);
                      return next;
                    });
                  }}
                />
              ) : null,
            )}

            {activeBounds && (
              <svg
                className="absolute top-0 left-0"
                width={100000}
                height={100000}
                style={{
                  overflow: "visible",
                  zIndex: 9999,
                  pointerEvents: "none",
                }}
              >
                <g
                  pointerEvents="all"
                  onPointerDown={(e) => {
                    // 🔥 START GROUP DRAG FROM SELECTION NET (MIRO BEHAVIOUR)
                    if (isResizingRef.current) return;
                    if (selectedLayerIds.size === 0) return;

                    e.stopPropagation();
                    e.preventDefault();

                    const { x: mx, y: my } = screenToWorld(e);

                    dragLayerRef.current = {
                      id: selectedLayerId,
                      isGroup: selectedLayerIds.size > 1,

                      startPositions:
                        selectedLayerIds.size > 1
                          ? layers
                              .filter((l) => selectedLayerIds.has(l.id))
                              .map((l) => ({ id: l.id, x: l.x, y: l.y }))
                          : selectedLayer
                            ? [
                                {
                                  id: selectedLayer.id,
                                  x: selectedLayer.x,
                                  y: selectedLayer.y,
                                },
                              ]
                            : null,

                      startX: activeBounds.x,
                      startY: activeBounds.y,
                      mouseX: mx,
                      mouseY: my,
                    };

                    window.addEventListener("pointermove", onLayerDragMove);
                    window.addEventListener("pointerup", stopLayerDrag);
                  }}
                >
                  <SelectionBox
                    bounds={activeBounds}
                    onResizeHandlePointerDown={onResizeHandlePointerDown}
                    isAutoText={selectedLayer?.type === LayerType.AutoText}
                  />
                </g>
              </svg>
            )}

            {marquee && (
              <div
                className="absolute pointer-events-none z-[9999]"
                style={{
                  left: marquee.x,
                  top: marquee.y,
                  width: marquee.w,
                  height: marquee.h,
                  border: "1px dashed #4c84ff",
                  background: "rgba(76,132,255,0.1)",
                }}
              />
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
