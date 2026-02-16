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

  useEffect(() => {
    if (!textRef.current) return;
    if (!layer.isNew) return;

    textRef.current.focus();
    placeCaretAtEnd(textRef.current);
    didEditRef.current = true;

    // ✅ FORCE INITIAL FIT
    requestAnimationFrame(() => {
      fitTextToBox(textRef.current, 8);
    });

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
    });
  };

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      fitTextToBox(el, 8);
    });
  }, [layer.width, layer.height, layer.style.fontSize, layer.value]);

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
        e.stopPropagation();

        const isEditingNow = editingLayerIdsRef.current.has(layer.id);

        // 🔥 CRITICAL: allow caret clicks but block drag logic
        if (isEditingNow) {
          return;
        }

        // Prevent text highlight when not editing (keeps drag smooth)
        e.preventDefault();

        // First click = selection (Miro behavior)
        onCommit(layer.id, { __select: true });

        // New note = instant edit (keep feature)
        if (layer.isNew) {
          enterEditMode();
          return;
        }

        let moved = false;

        const onMove = () => {
          moved = true;
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);

          // Start drag instead of edit
          onPointerDown?.(e);
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);

          // 🎯 SECOND CLICK (no drag) = EDIT MODE (MIRO EXACT UX)
          if (!moved && !editingLayerIdsRef.current.has(layer.id)) {
            enterEditMode();
          }
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
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
          data-base-font-size={layer.style.fontSize}
          suppressContentEditableWarning
          spellCheck={false}
          onInput={() => {
            if (isManualResizingRef.current) return;

            // 🔥 auto shrink while typing (Miro behavior)
            fitTextToBox(textRef.current);

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

            fontSize: getNoteFontSize(layer),
            fontWeight: 500,
            lineHeight: "1.25",

            whiteSpace: "pre-wrap",
            overflowWrap: "break-word",

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

function getNoteFontSize(layer) {
  return layer.style.fontSize;
}

function getNoteScale(layer) {
  const BASE = 120; // reference Miro note size
  const scale = Math.min(layer.width / BASE, layer.height / BASE, 1);

  return Math.max(0.4, scale); // never disappears
}

function fitTextToBox(el, min = 8) {
  if (!el) return;

  const baseSize = parseFloat(el.dataset.baseFontSize);
  if (baseSize) el.style.fontSize = baseSize + "px";

  let fontSize = parseFloat(getComputedStyle(el).fontSize);

  const fits = () => {
    return (
      el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight
    );
  };

  while (!fits() && fontSize > min) {
    fontSize -= 1;
    el.style.fontSize = fontSize + "px";
  }
}
