"use client";
import { useEffect, useRef, useContext, useState } from "react";
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

  const shouldFocusRef = useRef(false);

  const lastClickTimeRef = useRef(0);

  const [isEditingState, setIsEditingState] = useState(
    () => editingLayerIdsRef?.current?.has(layer.id) ?? false,
  );

  const commitFinal = () => {
    const el = ref.current;
    if (!el) return;
    let text = el.innerText.trim();

    if (!text) {
      onCommit(layer.id, {
        value: "",
        __editing: false,
        isNew: false,
      });
      return;
    }

    didEditRef.current = false;

    onCommit(layer.id, {
      value: el.innerText,
      width: layer.width,
      height: layer.height,
      __editing: false,
    });
  };

  useEffect(() => {
    if (!ref.current) return;
    if (!layer.isNew) return;

    editingLayerIdsRef.current.add(layer.id);

    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;

      el.focus();
      placeCaretAtEnd(el);
    });

    onCommit(layer.id, {
      isNew: false,
      __editing: true,
      __local: true,
    });
  }, []);
  const isEditing =
    isEditingState || (editingLayerIdsRef?.current?.has(layer.id) ?? false);

  const enterEditMode = () => {
    editingLayerIdsRef.current.add(layer.id);

    onCommit(layer.id, {
      __editing: true,
      __local: true,
    });

    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;

      el.focus();
      placeCaretAtEnd(el);
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isEditing) {
      el.innerText = layer.value || "";
    }
  }, [layer.value, isEditing]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!isEditing) {
      setIsEditingState(false);
      return;
    }
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.focus();
      placeCaretAtEnd(ref.current);
    });
  }, [isEditing]);

  return (
    <>
      <div
        data-layer
        data-selection-safe
        data-id={layer.id}
        data-selected={layer.__selected ? "true" : "false"}
        data-base-font-size={layer.style.fontSize}
        ref={ref}
        contentEditable={isEditing}
        suppressContentEditableWarning
        data-placeholder="Type something"
        onInput={() => {
          if (isManualResizingRef.current) return;

          didEditRef.current = true;

          autoResize(ref.current, layer, onCommit);

          send({
            type: "TEXT_LIVE_UPDATE",
            id: layer.id,
            value: ref.current.innerText,
            width: layer.width,
            height: layer.height,
          });
        }}
        spellCheck={false}
        style={{
          position: "absolute",

          left: layer.x,
          top: layer.y,

          minWidth: layer.width,
          minHeight: layer.height,

          width: "auto",
          height: "auto",

          cursor: isEditing ? "text" : "move",

          userSelect: isEditing ? "text" : "none",
          WebkitUserSelect: isEditing ? "text" : "none",
          MozUserSelect: isEditing ? "text" : "none",

          whiteSpace: "pre-wrap",

          pointerEvents: "auto",

          display: "block",
          textAlign: "center",
          lineHeight: "1.25",

          boxSizing: "border-box",

          padding: layer.value ? "0.3em 0.5em" : "4px 6px",

          overflowWrap: "break-word",
          wordBreak: "break-word",

          background: "transparent",
          border: "none",
          outline: "none",
          boxShadow: "none",

          fontSize: layer.style.fontSize,
          fontWeight: 500,
          color: layer.style.textColor,
          caretColor: "#000000",
        }}
        onPointerDown={(e) => {
          const isSelected = layer.__selected === true;
          const isEditing = editingLayerIdsRef?.current?.has(layer.id);

          // ✅ already editing → allow typing
          if (isEditing) return;

          const now = Date.now();
          const last = lastClickTimeRef.current;

          // 🟢 FIRST CLICK → SELECT
          if (!isSelected) {
            lastClickTimeRef.current = now;
            e.stopPropagation();
            onCommit(layer.id, { __select: true });
            return;
          }

          // 🟡 SECOND CLICK → EDIT
          if (now - last < 350) {
            e.stopPropagation();
            e.preventDefault();

            shouldFocusRef.current = true;
            editingLayerIdsRef.current.add(layer.id);
            setIsEditingState(true);

            onCommit(layer.id, {
              __editing: true,
              __local: true,
            });

            return;
          }

          // 🔵 OTHERWISE → DRAG
          lastClickTimeRef.current = now;

          if (!isEditing) {
            window.getSelection()?.removeAllRanges();
          }

          onPointerDown?.(e);
        }}
      />
      <style jsx>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        /* 🔥 PROMINENT BLINKING CURSOR */
        [contenteditable="true"] {
          caret-color: #000;
          text-shadow: 0 0 0 #000;
        }
      `}</style>
    </>
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

function autoResize(el, layer, onCommit) {
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const zoom = window.__BOARD_CAMERA__?.current?.zoom ?? 1;

  const width = Math.ceil(rect.width / zoom) + 2;
  const height = Math.ceil(rect.height / zoom) + 2;

  onCommit(layer.id, {
    width,
    height,
    __local: true,
  });
}
