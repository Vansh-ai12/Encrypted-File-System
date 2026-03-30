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

import { HtmlPreviewModal } from "./HtmlPreviewModal";

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
  const drawingRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const panRef = useRef(null);

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
    // 🔥 FIX: prevent offset drift after history/refresh
    const rect =
      containerRef.current?.getBoundingClientRect() || rectRef.current;

    if (!rect) return { sx: 0, sy: 0 };

    rectRef.current = rect;

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
    const existingStyle = l.style || {};

    // 🔥 CRITICAL: PRESERVE CUSTOM RUNTIME FIELDS (ARROWS, META, ETC)
    const meta = {
      __edgeArrows: l.__edgeArrows,
      __manualSize: l.__manualSize,
      __autoSizing: l.__autoSizing,
      __domRect: l.__domRect,
    };

    if (l.type === LayerType.Path) {
      return {
        ...l,
        ...meta,
        points: l.points || [],
        style: {
          stroke: existingStyle.stroke ?? "#000000",
          strokeWidth: existingStyle.strokeWidth ?? 3,
          lineType: existingStyle.lineType ?? "solid",
          ...existingStyle,
        },
      };
    }
    if (l.type === LayerType.Note) {
      return {
        ...l,
        ...meta, // 🔥 PRESERVE ARROWS
        style: {
          fill: existingStyle.fill ?? "#FFF59D",
          textColor: existingStyle.textColor ?? "#000000",
          fontSize: existingStyle.fontSize ?? 28,
          opacity: existingStyle.opacity ?? 1,
          ...existingStyle,
        },
      };
    }

    if (l.type === LayerType.Text) {
      return {
        ...l,
        ...meta,
        style: {
          textColor: existingStyle.textColor ?? "#000000",
          fontSize: existingStyle.fontSize ?? 20,
          opacity: existingStyle.opacity ?? 1,
          ...existingStyle,
        },
      };
    }

    // Rectangle, Ellipse, Image etc.
    return {
      ...l,
      ...meta,
      style: {
        fill: existingStyle.fill ?? "transparent",
        stroke: existingStyle.stroke ?? "#000000",
        strokeWidth: existingStyle.strokeWidth ?? 2,
        opacity: existingStyle.opacity ?? 1,
        ...existingStyle,
      },
    };
  };

  const screenToWorld = (e) => {
    const rect =
      containerRef.current?.getBoundingClientRect() || rectRef.current;

    if (!rect) return { x: 0, y: 0 };

    rectRef.current = rect; // keep cache in sync

    const cam = cameraRef.current;

    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    return {
      x: (sx - cam.x) / cam.zoom,
      y: (sy - cam.y) / cam.zoom,
    };
  };

  useEffect(() => {
    const saved = localStorage.getItem("board_camera");
    if (saved) {
      try {
        const cam = JSON.parse(saved);
        cameraRef.current = cam;
        setCamera(cam);
        didInitCameraRef.current = true;
      } catch {}
    }
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

    if (
      normalizedLayers.length &&
      !didInitCameraRef.current &&
      !localStorage.getItem("board_camera")
    ) {
      const xs = normalizedLayers.map((l) => l.x);
      const ys = normalizedLayers.map((l) => l.y);

      const cam = {
        x: -(Math.min(...xs) - 200),
        y: -(Math.min(...ys) - 200),
        zoom: 1,
      };

      cameraRef.current = cam;
      setCamera(cam);
      didInitCameraRef.current = true;

      localStorage.setItem("board_camera", JSON.stringify(cam));
    }

    setIsLoading(false);
  }, [initState]);

  useEffect(() => {
    if (!lastEvent) return;

    const d = lastEvent;

    if (d.type === "LAYERS_REPLACE") {
      isApplyingHistoryRef.current = true;

      const normalized = d.layers.map(normalizeLayer);

      const unique = new Map();
      normalized.forEach((l) => {
        if (!unique.has(l.id)) unique.set(l.id, l);
      });

      const next = Array.from(unique.values());

      setLayers(() => next);

      dragLayerRef.current = null;
      resizeRef.current = null;

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
      // 🧠 CRITICAL: Clear previous selection for THIS user only
      if (d.connectionId === selfConnectionId) {
        // remove all layers previously selected by me
        for (const [layerId, cid] of selectedByRef.current.entries()) {
          if (cid === selfConnectionId) {
            selectedByRef.current.delete(layerId);
          }
        }

        setSelectedLayerId(d.layerId);
      }

      // track selection
      selectedByRef.current.set(d.layerId, d.connectionId);

      setVersion((v) => v + 1);
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

  // 🔥 DO NOT SHOW SELECTION FOR INCOMPLETE PATHS
  const singleBounds =
    selectedLayer &&
    !(
      selectedLayer.type === LayerType.Path &&
      (!selectedLayer.points || selectedLayer.points.length < 2)
    )
      ? (() => {
          // 🔥 SPECIAL: PATHS (SCRIBBLE / LINE / ARROW)
          if (
            selectedLayer.type === LayerType.Path &&
            selectedLayer.points?.length >= 2
          ) {
            const xs = selectedLayer.points.map((p) => selectedLayer.x + p.x);
            const ys = selectedLayer.points.map((p) => selectedLayer.y + p.y);

            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);

            return {
              x: minX,
              y: minY,
              width: Math.max(maxX - minX, 1),
              height: Math.max(maxY - minY, 1),
            };
          }

          // 🔥 NORMAL LAYERS
          return {
            x: selectedLayer.x,
            y: selectedLayer.y,
            width: Math.max(selectedLayer.width, 1),
            height: Math.max(selectedLayer.height, 1),
          };
        })()
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

  const activeBounds = groupBounds ?? singleBounds;

  const onResizeHandlePointerDown = (e, handle) => {
    if (e.nativeEvent?.__fromMidDot) return;
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

      bounds: activeBounds, // ⭐ CRITICAL

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
                points: l.points ? [...l.points] : null,
                offsetX: l.x - activeBounds.x,
                offsetY: l.y - activeBounds.y,
                fontSize: l.style?.fontSize ?? 20,
              }))
          : [
              {
                id: selectedLayer.id,
                x: selectedLayer.x,
                y: selectedLayer.y,
                w: selectedLayer.width,
                h: selectedLayer.height,
                offsetX: 0,
                offsetY: 0,
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
    if (!resizeRef.current) return;

    const { x: mx, y: my } = screenToWorld(e);
    const r = resizeRef.current;

    const dx = mx - r.mouseX;
    const dy = my - r.mouseY;

    const handle = r.handle;

    setLayers((prev) =>
      prev.map((l) => {
        const target = r.layers.find((x) => x.id === l.id);
        if (!target) return l;

        let newX = target.x;
        let newY = target.y;
        let newW = target.w;
        let newH = target.h;

        if (r.isGroup) {
          // 🔥 resize GROUP bounds first
          let groupX = r.bounds.x;
          let groupY = r.bounds.y;
          let groupW = r.bounds.width;
          let groupH = r.bounds.height;

          if (handle.includes("e")) {
            groupW = r.bounds.width + dx;
          }

          if (handle.includes("s")) {
            groupH = r.bounds.height + dy;
          }

          if (handle.includes("w")) {
            groupX = r.bounds.x + dx;
            groupW = r.bounds.width - dx;
          }

          if (handle.includes("n")) {
            groupY = r.bounds.y + dy;
            groupH = r.bounds.height - dy;
          }

          const scaleX = groupW / r.bounds.width;
          const scaleY = groupH / r.bounds.height;

          newX = groupX + target.offsetX * scaleX;
          newY = groupY + target.offsetY * scaleY;

          newW = target.w * scaleX;
          newH = target.h * scaleY;
        }

        if (!r.isGroup) {
          if (handle.includes("e")) newW = target.w + dx;
          if (handle.includes("s")) newH = target.h + dy;

          if (handle.includes("w")) {
            newW = target.w - dx;
            newX = target.x + dx;
          }

          if (handle.includes("n")) {
            newH = target.h - dy;
            newY = target.y + dy;
          }
        }
        if (newW < 0) {
          newX += newW;
          newW = Math.abs(newW);
        }

        if (newH < 0) {
          newY += newH;
          newH = Math.abs(newH);
        }

        if (l.type === LayerType.Path && l.points && l.points.length > 2) {
          // 🔥 use ORIGINAL points stored at resize start
          const original = target.points || l.points;

          const xs = original.map((p) => p.x);
          const ys = original.map((p) => p.y);

          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);

          const baseW = Math.max(maxX - minX, 1);
          const baseH = Math.max(maxY - minY, 1);

          const scaleX = newW / baseW;
          const scaleY = newH / baseH;

          const newPoints = original.map((p) => ({
            x: (p.x - minX) * scaleX,
            y: (p.y - minY) * scaleY,
          }));

          return {
            ...l,
            x: newX,
            y: newY,
            width: newW,
            height: newH,
            points: newPoints,
          };
        }

        if (l.type === LayerType.Text || l.type === LayerType.Note) {
          const scaleX = newW / target.w;
          const scaleY = newH / target.h;
          const scale = Math.min(scaleX, scaleY);

          return {
            ...l,
            x: newX,
            y: newY,
            width: newW,
            height: newH,
            style: {
              ...l.style,
              fontSize: Math.max(8, target.fontSize * scale),
            },
          };
        }

        return {
          ...l,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        };
      }),
    );
  };

  const startLayerDrag = (e, layer) => {
    resizeRef.current = null;

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

  const dragRafRef = useRef(null);

  const onLayerDragMove = (e) => {
    if (!dragLayerRef.current) return;

    const { x: mx, y: my } = screenToWorld(e);
    const r = dragLayerRef.current;

    const dx = mx - r.mouseX;
    const dy = my - r.mouseY;

    if (dragRafRef.current) return;

    dragRafRef.current = requestAnimationFrame(() => {
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

      dragRafRef.current = null;
    });
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

  const stripMeta = (layer) => {
    const { __editing, __local, ...rest } = layer;
    return rest;
  };
  const commitLayers = (next, { allowEmpty = false } = {}) => {
    if (isApplyingHistoryRef.current || isLoading) return;
    if (!next) return;

    const clean = next.map(stripMeta);

    send({
      type: "LAYERS_COMMIT",
      layers: clean,
    });
  };

  const undo = () => {
    if (!canUndo || isApplyingHistoryRef.current) return;
    send({
      type: "UNDO",
      layerId: selectedLayerId ?? null,
    });
  };

  const redo = () => {
    if (!canRedo || isApplyingHistoryRef.current) return;
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
    if (e.nativeEvent?.__fromMidDot) {
      return;
    }
    if (e.button !== 0) return;

    // 🖐 PAN MODE (TRUE CANVAS PAN)
    if (canvasState.mode === "PAN") {
      document.body.style.userSelect = "none";

      dragLayerRef.current = true; // used for grabbing cursor

      const startX = e.clientX;
      const startY = e.clientY;

      const startCam = { ...cameraRef.current };

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        cameraRef.current.x = startCam.x + dx;
        cameraRef.current.y = startCam.y + dy;

        setCamera({ ...cameraRef.current });
      };

      const onUp = () => {
        document.body.style.userSelect = "auto";

        dragLayerRef.current = null;

        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);

      return;
    }

    const isLayer =
      e.target.closest("[data-layer]") || e.target.closest("[data-path-layer]");
    const isHandle =
      e.target.closest("[data-bend-handle]") ||
      e.target.closest("[data-start-handle]") ||
      e.target.closest("[data-end-handle]");
    const isSelectionSafe = e.target.closest("[data-selection-safe]");
    const isSelectionUI =
      e.target.closest("[data-selection]") ||
      e.target.closest("[data-selection-handle]");

    const clickedLayer =
      e.target.closest("[data-layer]") || e.target.closest("[data-path-layer]");
    const clickedHandle =
      e.target.closest("[data-bend-handle]") ||
      e.target.closest("[data-start-handle]") ||
      e.target.closest("[data-end-handle]");
    const clickedSelectionUI =
      e.target.closest("[data-selection]") ||
      e.target.closest("[data-selection-handle]") ||
      e.target.closest("[data-selection-safe]");
    const isEditingDOM =
      e.target.isContentEditable ||
      e.target.closest("[contenteditable='true']");
    if (
      canvasState.mode === CanvasMode.None &&
      canvasState.layerType === null &&
      !isResizingRef.current &&
      !dragLayerRef.current
    ) {
      if (
        isEditingDOM ||
        e.target.closest("[data-layer]") ||
        e.target.closest("[data-selection-safe]")
      ) {
        return;
      }

      // 🔥 FIX: COMMIT ALL EDITING TEXT BEFORE CLEAR
      editingLayerIdsRef.current.forEach((id) => {
        const el = document.querySelector(`[data-layer][data-id="${id}"]`);
        if (el && el.innerText !== undefined) {
          const text = el.innerText.trim();

          setLayers((prev) =>
            prev.map((l) =>
              l.id === id
                ? {
                    ...l,
                    value: text,
                  }
                : l,
            ),
          );
        }
      });

      editingLayerIdsRef.current.clear();

      setSelectedLayerId(null);
      setSelectedLayerIds(new Set());
      selectedByRef.current.clear();

      send({ type: "LAYER_DESELECT" });
    }
    const rect =
      rectRef.current ?? containerRef.current?.getBoundingClientRect();

    if (!rect) return;

    const startWorld = screenToWorld(e);
    const startScreenX = e.clientX - rect.left;
    const startScreenY = e.clientY - rect.top;

    // ✏️ PENCIL MODE (FREEHAND DRAW)
    if (canvasState.mode === CanvasMode.Pencil) {
      e.preventDefault();
      e.stopPropagation();

      const { x, y } = screenToWorld(e);

      const newPath = {
        id: crypto.randomUUID(),
        type: LayerType.Path,
        x,
        y,
        width: 1,
        height: 1,
        points: [{ x: 0, y: 0 }], // relative points
        style: {
          stroke: "#000000",
          strokeWidth: 2,
        },
      };

      drawingRef.current = newPath;
      setIsDrawing(true);

      setLayers((prev) => {
        const next = [...prev, newPath];
        return next;
      });

      const onMove = (ev) => {
        if (!drawingRef.current) return;

        const { x: mx, y: my } = screenToWorld(ev);
        const dx = mx - drawingRef.current.x;
        const dy = my - drawingRef.current.y;

        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== drawingRef.current.id) return l;

            const newPoints = [...l.points, { x: dx, y: dy }];

            // 🔥 STABLE FREEHAND (DO NOT TOUCH BBOX DURING DRAW)
            return {
              ...l,
              points: newPoints,
              width: l.width,
              height: l.height,
            };
          }),
        );
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);

        setIsDrawing(false);

        const finishedPath = drawingRef.current;
        drawingRef.current = null;

        if (!finishedPath) return;

        setLayers((prev) =>
          prev.map((l) => {
            if (l.id !== finishedPath.id) return l;

            if (!l.points || l.points.length < 2) return l;

            // 🔥 COMPUTE REAL BOUNDING BOX
            const xs = l.points.map((p) => p.x);
            const ys = l.points.map((p) => p.y);

            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);

            const newWidth = Math.max(maxX - minX, 1);
            const newHeight = Math.max(maxY - minY, 1);

            return {
              ...l,
              x: l.x + minX,
              y: l.y + minY,
              width: newWidth,
              height: newHeight,
              points: l.points.map((p) => ({
                x: p.x - minX,
                y: p.y - minY,
              })),
            };
          }),
        );

        requestAnimationFrame(() => {
          setLayers((latest) => {
            commitLayers(latest.map(stripMeta), { allowEmpty: true });
            return latest;
          });
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      return;
    }

    if (
      canvasState.layerType === null &&
      canvasState.mode === CanvasMode.None &&
      selectedLayerIds.size === 0
    ) {
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
    const { x: worldX, y: worldY } = screenToWorld(e);

    // 🔥 CRITICAL FIX: DO NOT block pointer when inserting

    const layerType = canvasState.layerType;

    if (canvasState.mode !== CanvasMode.Inserting || !layerType) return;

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
    switch (layerType) {
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
        layer = {
          ...NoteLayer,
          isNew: true,
        };
        break;
      case "LINE":
        const startLine = screenToWorld(e);
        const lineId = crypto.randomUUID();

        const newLine = {
          id: lineId,
          type: LayerType.Path,
          x: startLine.x,
          y: startLine.y,
          width: 1,
          height: 1,
          __isArrow: false, // 🔥 IMPORTANT
          points: [{ x: 0, y: 0 }],
          style: {
            stroke: "#111111",
            strokeWidth: 3,
          },
        };

        drawingRef.current = newLine;
        setIsDrawing(true);
        setLayers((prev) => [...prev, newLine]);

        const onLineMove = (ev) => {
          if (!drawingRef.current) return;

          const { x: mx, y: my } = screenToWorld(ev);
          const dx = mx - drawingRef.current.x;
          const dy = my - drawingRef.current.y;

          setLayers((prev) =>
            prev.map((l) =>
              l.id === lineId
                ? {
                    ...l,
                    points: [
                      { x: 0, y: 0 },
                      { x: dx, y: dy },
                    ],
                  }
                : l,
            ),
          );
        };

        const onLineUp = () => {
          window.removeEventListener("pointermove", onLineMove);
          window.removeEventListener("pointerup", onLineUp);

          setIsDrawing(false);

          setLayers((latest) => {
            commitLayers(latest.map(stripMeta), { allowEmpty: true });
            return latest;
          });

          drawingRef.current = null;

          setCanvasState((prev) => ({
            ...prev,
            mode: CanvasMode.None,
            layerType: null,
          }));
        };

        window.addEventListener("pointermove", onLineMove);
        window.addEventListener("pointerup", onLineUp);
        return;

      // 🔥 MIRO-STYLE STRAIGHT ARROW (NEW - CLEAN)
      case "ARROW":
        const start = screenToWorld(e);

        // 🔥 SNAP TO NEAREST LAYER (MIRO STYLE)
        let snapX = start.x;
        let snapY = start.y;

        const SNAP_DISTANCE = 40;

        for (const layer of layers) {
          const cx = layer.x + layer.width / 2;
          const cy = layer.y + layer.height / 2;

          const dist = Math.hypot(cx - start.x, cy - start.y);

          if (dist < SNAP_DISTANCE) {
            snapX = cx;
            snapY = cy;
            break;
          }
        }

        const arrowId = crypto.randomUUID();

        const newArrow = {
          id: arrowId,
          type: LayerType.Path, // reuse your existing path system (SMART)
          x: start.x,
          y: start.y,
          width: 1,
          height: 1,
          __isArrow: true, // 🔥 YOU ALREADY SUPPORT THIS
          points: [{ x: 0, y: 0 }],
          style: {
            stroke: "#111111",
            strokeWidth: 3,
          },
        };

        drawingRef.current = newArrow;
        setIsDrawing(true);

        setLayers((prev) => [...prev, newArrow]);

        const onMove = (ev) => {
          if (!drawingRef.current) return;

          const { x: mx, y: my } = screenToWorld(ev);
          const dx = mx - drawingRef.current.x;
          const dy = my - drawingRef.current.y;

          setLayers((prev) =>
            prev.map((l) => {
              if (l.id !== arrowId) return l;

              return {
                ...l,
                points: [
                  { x: 0, y: 0 },
                  { x: dx, y: dy }, // 🔥 STRAIGHT ARROW (NOT SCRIBBLE)
                ],
                __arrowHead: { x: dx, y: dy }, // uses your existing arrow head renderer
              };
            }),
          );
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);

          setIsDrawing(false);

          setLayers((latest) => {
            commitLayers(latest.map(stripMeta), { allowEmpty: true });
            return latest;
          });

          drawingRef.current = null;

          setCanvasState((prev) => ({
            ...prev,
            mode: CanvasMode.None,
            layerType: null,
          }));
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        return;

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
      className="h-full w-full relative bg-neutral-100 overflow-hidden"
      style={{
        cursor:
          canvasState.mode === "PAN"
            ? dragLayerRef.current
              ? "grabbing"
              : "url('/cursors/miro-grab.png') 16 16, grab"
            : "default",
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-neutral-100">
          <div className="w-10 h-10 border-[3px] border-neutral-300 border-t-neutral-700 rounded-full animate-spin" />
        </div>
      )}

      <Info />
      <Participants />

      <Toolbar
        key="toolbar-stable"
        canvasState={canvasState}
        setCanvasState={setCanvasState}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        isInteractingRef={isInteractingRef}
      />

      {canvasState.mode !== "PAN" && (
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
      )}

      {!isLoading && (
        <div
          className="absolute top-0 left-0"
          style={{
            transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})`,
            transformOrigin: "0 0",

            width: "100%",
            height: "100%",
          }}
        >
          <div
            ref={contentRef}
            className="absolute top-0 left-0"
            style={{
              width: 100000,
              height: 100000,
            }}
            onPointerDown={onCanvasPointerDown}
            data-canvas-root
          >
            <svg
              className="absolute top-0 left-0"
              width="100%"
              height="100%"
              style={{ overflow: "visible" }}
              pointerEvents="auto"
            >
              <rect
                x={-50000}
                y={-50000}
                width={100000}
                height={100000}
                fill="transparent"
                pointerEvents="all"
              />

              {orderedLayers.map((l) => {
                const selectedBy = selectedByRef.current.get(l.id);
                const isOtherUser =
                  selectedBy && selectedBy !== selfConnectionId;

                return l.type === LayerType.Path ? (
                  <g key={l.id}>
                    {/* 🔥 INVISIBLE HIT AREA (DO NOT REMOVE) */}
                    {/* 🔥 INVISIBLE HIT AREA — DOT-RADIUS EQUIVALENT */}
                    <path
                      d={
                        l.points && l.points.length >= 2
                          ? (() => {
                              // 🔥 FREEHAND (MULTI-POINT PATH)
                              if (!l.__isArrow && l.points.length > 2) {
                                return l.points
                                  .map((p, i) =>
                                    i === 0
                                      ? `M ${l.x + p.x} ${l.y + p.y}`
                                      : `L ${l.x + p.x} ${l.y + p.y}`,
                                  )
                                  .join(" ");
                              }

                              // 🔥 LINE / ARROW (2 POINT LOGIC - KEEP ORIGINAL BEHAVIOR)
                              const p0 = l.points[0];
                              const p1 = l.points[1];
                              const bend = l.__bendPoint;

                              const x0 = l.x + p0.x;
                              const y0 = l.y + p0.y;
                              const x1 = l.x + p1.x;
                              const y1 = l.y + p1.y;

                              if (bend) {
                                const bx = l.x + bend.x;
                                const by = l.y + bend.y;
                                return `M ${x0} ${y0} Q ${bx} ${by} ${x1} ${y1}`;
                              }

                              return `M ${x0} ${y0} L ${x1} ${y1}`;
                            })()
                          : ""
                      }
                      fill="none"
                      stroke="transparent"
                      strokeWidth={Math.max(80 / camera.zoom, 32)}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="stroke"
                      onPointerDown={(e) => {
                        if (canvasState.mode === "PAN") return;
                        e.stopPropagation();
                        if (isResizingRef.current) return;

                        for (const [
                          layerId,
                          cid,
                        ] of selectedByRef.current.entries()) {
                          if (cid === selfConnectionId) {
                            selectedByRef.current.delete(layerId);
                          }
                        }

                        setSelectedLayerId(l.id);
                        selectedByRef.current.set(l.id, selfConnectionId);
                        setSelectedLayerIds(new Set());
                        send({ type: "LAYER_SELECT", layerId: l.id });

                        startLayerDrag(e, l);
                      }}
                    />

                    {/* 🔥 VISIBLE STROKE (NO POINTER EVENTS) */}
                    <path
                      d={
                        l.points && l.points.length >= 2
                          ? (() => {
                              // 🔥 FREEHAND
                              if (!l.__isArrow && l.points.length > 2) {
                                return l.points
                                  .map((p, i) =>
                                    i === 0
                                      ? `M ${l.x + p.x} ${l.y + p.y}`
                                      : `L ${l.x + p.x} ${l.y + p.y}`,
                                  )
                                  .join(" ");
                              }

                              // 🔥 LINE / ARROW
                              const p0 = l.points[0];
                              const p1 = l.points[1];
                              const bend = l.__bendPoint;

                              const x0 = l.x + p0.x;
                              const y0 = l.y + p0.y;
                              const x1 = l.x + p1.x;
                              const y1 = l.y + p1.y;

                              if (bend) {
                                const bx = l.x + bend.x;
                                const by = l.y + bend.y;
                                return `M ${x0} ${y0} Q ${bx} ${by} ${x1} ${y1}`;
                              }

                              return `M ${x0} ${y0} L ${x1} ${y1}`;
                            })()
                          : ""
                      }
                      fill="none"
                      stroke={l.style?.stroke || "#111111"}
                      strokeWidth={l.style?.strokeWidth || 3}
                      strokeDasharray={
                        l.style?.lineType === "dashed"
                          ? "10 8"
                          : l.style?.lineType === "dotted"
                            ? "2 8"
                            : "none"
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      markerEnd={
                        l.__isArrow ? `url(#arrowhead-${l.id})` : undefined
                      }
                      pointerEvents="none"
                    />

                    {/* 🔵 BEND HANDLE — MUST BE INSIDE MAP */}
                    {l.points?.length === 2 && l.id === selectedLayerId && (
                      <circle
                        data-bend-handle
                        cx={
                          l.x +
                          (l.__bendPoint
                            ? l.__bendPoint.x
                            : (l.points[0].x + l.points[1].x) / 2)
                        }
                        cy={
                          l.y +
                          (l.__bendPoint
                            ? l.__bendPoint.y
                            : (l.points[0].y + l.points[1].y) / 2)
                        }
                        r={Math.max(6 / camera.zoom, 4)}
                        fill="#ffffff"
                        stroke="#4c84ff"
                        pointerEvents="all"
                        strokeWidth={2}
                        style={{ cursor: "grab" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.nativeEvent.__fromMidDot = true; // 🔥 PREVENT CANVAS INTERFERENCE
                          document.body.style.userSelect = "none";

                          const onMove = (ev) => {
                            const { x: mx, y: my } = screenToWorld(ev);

                            setLayers((prev) =>
                              prev.map((layer) =>
                                layer.id === l.id
                                  ? {
                                      ...layer,
                                      __bendPoint: {
                                        x: mx - layer.x,
                                        y: my - layer.y,
                                      },
                                    }
                                  : layer,
                              ),
                            );
                          };

                          const onUp = () => {
                            document.body.style.userSelect = "auto";
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);

                            setLayers((latest) => {
                              commitLayers(latest);
                              return latest;
                            });
                          };

                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                      />
                    )}

                    {/* 🔥 END HANDLE (EXTENDABLE LIKE MIRO) */}
                    {l.points?.length === 2 && l.id === selectedLayerId && (
                      <circle
                        data-end-handle
                        pointerEvents="all"
                        cx={l.x + l.points[1].x}
                        cy={l.y + l.points[1].y}
                        r={Math.max(7 / camera.zoom, 5)}
                        fill="#4c84ff"
                        stroke="#ffffff"
                        strokeWidth={2}
                        style={{ cursor: "crosshair" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.nativeEvent.__fromMidDot = true; // 🔥 PREVENT CANVAS INTERFERENCE
                          document.body.style.userSelect = "none";

                          const onMove = (ev) => {
                            const { x: mx, y: my } = screenToWorld(ev);

                            setLayers((prev) =>
                              prev.map((layer) => {
                                if (layer.id !== l.id) return layer;

                                const start = layer.points[0];
                                const dx = mx - layer.x;
                                const dy = my - layer.y;

                                // 🔥 AUTO-BEND LOGIC (MIRO STYLE)
                                const midX = (start.x + dx) / 2;
                                const midY = (start.y + dy) / 2;

                                // create dynamic bend based on cursor offset
                                const bendStrength = 0.35; // smooth curve
                                const bendX =
                                  midX + (dy - start.y) * bendStrength;
                                const bendY =
                                  midY - (dx - start.x) * bendStrength;

                                return {
                                  ...layer,
                                  points: [start, { x: dx, y: dy }],
                                  __arrowHead: { x: dx, y: dy },
                                  __bendPoint: layer.__bendPoint,
                                };
                              }),
                            );
                          };

                          const onUp = () => {
                            document.body.style.userSelect = "auto";
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);

                            setLayers((latest) => {
                              commitLayers(latest);
                              return latest;
                            });
                          };

                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                      />
                    )}

                    {/* 🔥 START HANDLE (BIDIRECTIONAL LINE CONTROL) */}
                    {l.points?.length === 2 && l.id === selectedLayerId && (
                      <circle
                        data-start-handle
                        pointerEvents="all"
                        cx={l.x + l.points[0].x}
                        cy={l.y + l.points[0].y}
                        r={Math.max(6 / camera.zoom, 4)}
                        fill="#ffffff"
                        stroke="#4c84ff"
                        strokeWidth={2}
                        style={{ cursor: "crosshair" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.nativeEvent.__fromMidDot = true; // 🔥 PREVENT CANVAS INTERFERENCE
                          document.body.style.userSelect = "none";

                          const onMove = (ev) => {
                            const { x: mx, y: my } = screenToWorld(ev);

                            setLayers((prev) =>
                              prev.map((layer) => {
                                if (layer.id !== l.id) return layer;

                                const newStartX = mx - layer.x;
                                const newStartY = my - layer.y;

                                return {
                                  ...layer,
                                  points: [
                                    { x: newStartX, y: newStartY }, // 🔥 move start point ONLY
                                    layer.points[1], // keep end stable
                                  ],
                                };
                              }),
                            );
                          };

                          const onUp = () => {
                            document.body.style.userSelect = "auto";
                            window.removeEventListener("pointermove", onMove);
                            window.removeEventListener("pointerup", onUp);

                            setLayers((latest) => {
                              commitLayers(latest);
                              return latest;
                            });
                          };

                          window.addEventListener("pointermove", onMove);
                          window.addEventListener("pointerup", onUp);
                        }}
                      />
                    )}

                    {/* Arrowhead */}
                    {l.__isArrow && l.points?.length >= 2 && (
                      <defs>
                        <marker
                          id={`arrowhead-${l.id}`}
                          markerWidth="16"
                          markerHeight="16"
                          refX="12"
                          refY="8"
                          orient="auto"
                          markerUnits="strokeWidth"
                        >
                          <path
                            d="M 2 2 L 14 8 L 2 14 Z"
                            fill="none"
                            stroke={l.style?.stroke || "#111111"}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </marker>
                      </defs>
                    )}
                  </g>
                ) : l.type === LayerType.Rectangle ? (
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
                    strokeDasharray={
                      l.style?.lineType === "dashed"
                        ? "10 8"
                        : l.style?.lineType === "dotted"
                          ? "2 8"
                          : "none"
                    }
                    pointerEvents="auto"
                    onPointerDown={(e) => {
                      if (canvasState.mode === "PAN") return;
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
                    strokeDasharray={
                      l.style?.lineType === "dashed"
                        ? "10 8"
                        : l.style?.lineType === "dotted"
                          ? "2 8"
                          : "none"
                    }
                    pointerEvents="auto"
                    onPointerDown={(e) => {
                      if (canvasState.mode === "PAN") return;
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
                      if (canvasState.mode === "PAN") return;
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
                  key={l.id}
                  layer={{ ...l, __selected: selectedLayerId === l.id }}
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
                  onPointerDown={(e) => {
                    if (canvasState.mode === "PAN") return;

                    const isEditing = editingLayerIdsRef.current.has(l.id);
                    const isSelected = selectedLayerId === l.id;

                    if (isEditing) return;

                    if (!isSelected) return;

                    startLayerDrag(e, l);
                  }}
                />
              ) : l.type === LayerType.Note ? (
                <NoteLayerView
                  key={l.id} // ✅ REQUIRED
                  layer={{ ...l, __selected: selectedLayerId === l.id }}
                  onPointerDown={(e) => {
                    if (canvasState.mode === "PAN") return;
                    if (editingLayerIdsRef.current.has(l.id)) return;
                    startLayerDrag(e, l);
                  }}
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
                    if (canvasState.mode === "PAN") return;
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

            {canvasState.mode !== "PAN" &&
              activeBounds &&
              !(
                selectedLayer?.type === LayerType.Path &&
                selectedLayer?.points?.length === 2
              ) && (
                <svg
                  className="absolute top-0 left-0"
                  width={100000}
                  height={100000}
                  style={{
                    overflow: "visible",
                    zIndex: 9999,
                    pointerEvents: editingLayerIdsRef.current.size
                      ? "none"
                      : "auto",
                  }}
                >
                  <g
                    pointerEvents="all"
                    onPointerDown={(e) => {
                      if (
                        selectedLayer?.type === LayerType.Text &&
                        !editingLayerIdsRef.current.has(selectedLayerId)
                      ) {

                        return;
                      }

                      if (
                        e.nativeEvent?.__fromMidDot ||
                        e.target.closest("[data-bend-handle]")
                      ) {
                        e.stopPropagation();
                        return;
                      }
                      if (isResizingRef.current) return;

                      if (!selectedLayerId && selectedLayerIds.size === 0)
                        return;

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
                      bounds={{
                        ...activeBounds,
                        type: selectedLayer?.type,
                        __edgeArrows: selectedLayer?.__edgeArrows,
                      }}
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

      <HtmlPreviewModal
        open={canvasState.mode === "HTML_PREVIEW"}
        onClose={() =>
          setCanvasState((prev) => ({
            ...prev,
            mode: CanvasMode.None,
          }))
        }
      />

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
