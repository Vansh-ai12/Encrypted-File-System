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
  const { send } = useContext(BoardSocketContext);

  // Sync value (NOT while typing)
  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    if (document.activeElement === el) return;
    el.innerText = layer.value || "";
  }, [layer.value]);

  // Autofocus new note
  useEffect(() => {
    if (!textRef.current) return;
    if (!layer.isNew) return;

    textRef.current.focus();
    placeCaretAtEnd(textRef.current);
    didEditRef.current = true;

    onCommit(layer.id, {
      isNew: false,
      __local: true,
      __editing: true,
    });
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
      textRef.current?.focus();
      placeCaretAtEnd(textRef.current);
    });
  };

  return (
    <div
      className="absolute bg-yellow-200 shadow-md"
      data-layer
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
        e.stopPropagation();
        onCommit(layer.id, { __select: true });

        if (!isEditing) {
          onPointerDown?.(e); // drag
        }
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        enterEditMode();
      }}
    >
      {/* 🔒 SCALE WHOLE CONTENT (TEXT + PADDING) */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 🔒 STATIC CONTENT BLOCK */}
        <div
          ref={textRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          spellCheck={false}
          onInput={() => {
            if (isManualResizingRef.current) return;
            didEditRef.current = true;
            commitLive();
          }}
          onBlur={commitFinal}
          style={{
            width: "100%",
            height: "100%",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",

            boxSizing: "border-box",

            padding: "6px 8px", // 🔒 CONSTANT
            boxSizing: "border-box",

            fontSize: getFontSize(layer), // 🔥 ONLY FONT CHANGES
            fontWeight: 500,
            lineHeight: "1.2",

            textAlign: "center",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",

            outline: "none",
            border: "none",
            background: "transparent",
            caretColor: "#000",
          }}
        />
      </div>
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

function getFontSize(layer) {
  const BASE = 120; // reference note size
  const BASE_FONT = 40;

  const scale = Math.min(layer.width / BASE, layer.height / BASE, 1);

  return Math.max(14, BASE_FONT * scale);
}

function getNoteScale(layer) {
  const BASE = 120; // reference Miro note size
  const scale = Math.min(layer.width / BASE, layer.height / BASE, 1);

  return Math.max(0.4, scale); // never disappears
}
