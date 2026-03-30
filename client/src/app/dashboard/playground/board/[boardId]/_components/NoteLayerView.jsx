"use client";
import { useEffect, useRef, useContext } from "react";
import { BoardSocketContext } from "@/hooks/board-socket-context";

export function NoteLayerView({
  layer,
  onCommit,
  onPointerDown,
  isManualResizingRef,
  editingLayerIdsRef,
}) {
  const textRef = useRef(null);
  const rafRef = useRef(null);
  const didEditRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const { send } = useContext(BoardSocketContext);

  // Sync value (NOT while typing)
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.innerText = layer.value || "";
  }, [layer.value]);

  useEffect(() => {
    if (!textRef.current) return;
    if (!layer.isNew) return;

    // 🔥 STEP 1: mark editing FIRST
    editingLayerIdsRef.current.add(layer.id);

    onCommit(layer.id, {
      isNew: false,
      __local: true,
      __editing: true,
    });

    // 🔥 STEP 2: focus AFTER state reflects editing
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;

      el.focus();
      placeCaretAtEnd(el);
    });

    didEditRef.current = true;
  }, []);

  const commitLive = () => {
    if (!didEditRef.current || rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = textRef.current;
      if (!el) return;

      onCommit(layer.id, {
        value: el.innerText,
        __local: true,
        __editing: true,
      });

      send({
        type: "NOTE_LIVE_UPDATE",
        id: layer.id,
        value: el.innerText,
        width: layer.width,
        height: layer.height,
      });
    });
  };

  const commitFinal = () => {
    if (!didEditRef.current) return;
    didEditRef.current = false;

    onCommit(layer.id, {
      value: textRef.current.innerText,
      width: layer.width,
      height: layer.height,
      __editing: false,
    });
  };

  const isEditing = editingLayerIdsRef.current.has(layer.id);

  const enterEditMode = () => {
    editingLayerIdsRef.current.add(layer.id);

    onCommit(layer.id, {
      __editing: true,
      __local: true,
    });

    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;

      el.focus();

      // 🔥 CRITICAL: force caret to appear
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
  };

  return (
    <div
      className="absolute bg-yellow-200 shadow-md"
      data-layer
      data-selection-safe
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        backgroundColor: layer.style.fill,
        overflow: "hidden",
        zIndex: 1,
      }}
      onPointerDown={(e) => {
        const isSelected = layer.__selected === true;
        const isEditing = editingLayerIdsRef.current.has(layer.id);

        // already editing → allow typing
        if (isEditing) return;

        // FIRST CLICK → SELECT
        const now = Date.now();
        const last = lastClickTimeRef.current;

        // FIRST CLICK → SELECT
        if (!isSelected) {
          lastClickTimeRef.current = now;
          e.stopPropagation();
          onCommit(layer.id, { __select: true });
          return;
        }

        // SECOND CLICK → EDIT
        if (now - last < 350) {
          e.stopPropagation();
          enterEditMode();
          return;
        }

        // OTHERWISE DRAG
        lastClickTimeRef.current = now;
        if (onPointerDown) onPointerDown(e);
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",

          display: "flex", // 🔥 ADD
          alignItems: "center", // 🔥 VERTICAL CENTER
          justifyContent: "center", // 🔥 HORIZONTAL CENTER
        }}
      >
        {/* 🔒 STATIC CONTENT BLOCK */}
        <div
          ref={textRef}
          contentEditable={isEditing}
          data-placeholder="Type something"
          data-base-font-size={layer.style.fontSize}
          suppressContentEditableWarning
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              document.execCommand("insertLineBreak");
              e.preventDefault();
            }
          }}
          onInput={() => {
            if (isManualResizingRef.current) return;

            didEditRef.current = true;
            commitLive();
          }}
          onBlur={commitFinal}
          style={{
            width: "100%",
            height: "auto",

            boxSizing: "border-box",
            padding: layer.value ? "0.3em 0.5em" : "4px 6px",

            textAlign: "center",

            display: "block",

            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowWrap: "break-word",

            fontSize: layer.style.fontSize,
            fontWeight: 500,
            lineHeight: "1.25",

            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",

            outline: "none",
            pointerEvents: "auto",
            border: "none",
            background: "transparent",
            caretColor: "#000",
          }}
        />
      </div>
      <style jsx>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        [contenteditable="true"] {
          caret-color: #000;
        }
      `}</style>
    </div>
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
