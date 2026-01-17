"use client";
import { useEffect, useRef, useContext } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";

export function TextLayerView({
  layer,
  onCommit,
  onPointerDown,
  isManualResizingRef,
  editingLayerIdsRef,
}) {
  const { send } = useContext(BoardSocketContext);

  const ref = useRef(null);
  const rafRef = useRef(null);
  const didEditRef = useRef(false);

  // 🔁 Sync value (only when not typing)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.innerText = layer.value || "";
  }, [layer.value]);

  const commitFinal = () => {
    if (!didEditRef.current) return;
    didEditRef.current = false;

    const el = ref.current;
    if (!el) return;

    onCommit(layer.id, {
      value: el.innerText,
      width: layer.width,
      height: layer.height,

      __editing: false,
    });
  };

  // 🎯 Autofocus new text
  useEffect(() => {
    if (!ref.current) return;
    if (!layer.isNew) return;

    ref.current.focus();
    placeCaretAtEnd(ref.current);

    didEditRef.current = true;

    onCommit(layer.id, {
      isNew: false,
      __local: true,
      __editing: true,
    });
  }, []);

  const isEditing = editingLayerIdsRef?.current?.has(layer.id);

  const enterEditMode = () => {
    editingLayerIdsRef.current.add(layer.id);

    onCommit(layer.id, {
      __editing: true,
      __local: true,
    });

    requestAnimationFrame(() => {
      ref.current?.focus();
      placeCaretAtEnd(ref.current);
    });
  };

  return (
    <div
      data-layer
      ref={ref}
      contentEditable={isEditing}
      suppressContentEditableWarning
      spellCheck={false}
      style={{
        cursor: isEditing ? "text" : "move",
        userSelect: isEditing ? "text" : "none",

        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,

        position: "absolute",

        overflow: "hidden",

        /* 🔥 IMPORTANT FIX */
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",

        boxSizing: "border-box",
        padding: "6px 8px",

        textAlign: "left",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",

        fontSize: layer.style.fontSize,
        fontWeight: 500,
        lineHeight: "1.15",
        color: layer.style.textColor,

        overflow: "hidden",
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        enterEditMode();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();

        // always select
        onCommit(layer.id, { __select: true });

        // if already editing, allow normal text interaction
        if (isEditing) return;

        // otherwise allow drag
        onPointerDown?.(e);
      }}
      onInput={() => {
        if (isManualResizingRef.current) return;
        if (rafRef.current) return;

        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const el = ref.current;
          if (!el) return;

          didEditRef.current = true;
          onCommit(layer.id, {
            value: el.innerText,
            __local: true,
            __editing: true,
          });
        });
      }}
      onBlur={commitFinal}
      onKeyDown={(e) => {
        if (e.key === "Escape") ref.current.blur();
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") ref.current.blur();
      }}
    />
  );
}

function placeCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function measureText(el) {
  if (!el) return { w: 0, h: 0 };

  const rect = el.getBoundingClientRect();

  // 🔥 IMPORTANT: undo canvas zoom
  const zoom = window.__BOARD_CAMERA__?.current?.zoom ?? 1;

  return {
    w: Math.ceil(rect.width / zoom),
    h: Math.ceil(rect.height / zoom),
  };
}
