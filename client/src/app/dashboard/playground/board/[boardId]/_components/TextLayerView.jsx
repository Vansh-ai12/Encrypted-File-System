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

    ref.current.focus();
    placeCaretAtEnd(ref.current);

    // ✅ FORCE INITIAL FIT
    requestAnimationFrame(() => {
      fitTextToBox(ref.current, 8);
    });

    didEditRef.current = true;

    onCommit(layer.id, {
      isNew: false,
      __local: true,
      __editing: true,
    });
  }, []);

  const isEditing = editingLayerIdsRef?.current?.has(layer.id);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (!isEditing) {
      el.innerText = layer.value || "";
    }
  }, [layer.value, isEditing]);

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
    });
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    fitTextToBox(el, 8);
  }, [layer.width, layer.height, layer.style.fontSize, layer.value]);

  return (
    <>
      <div
        data-layer
        data-selection-safe
        data-base-font-size={layer.style.fontSize}
        ref={ref}
        contentEditable={isEditing || layer.isNew}
        suppressContentEditableWarning
        data-placeholder="Type something"
        spellCheck={false}
        style={{
          cursor: isEditing ? "text" : "move",

          userSelect: isEditing ? "text" : "none",
          WebkitUserSelect: isEditing ? "text" : "none",
          MozUserSelect: isEditing ? "text" : "none",

          left: layer.x,
          top: layer.y,

          width: layer.width,
          height: layer.height,

          position: "absolute",

          overflow: "hidden",

          whiteSpace: "pre-wrap",

          pointerEvents: isEditing ? "auto" : "auto",

          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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
          lineHeight: "1.25",
          color: layer.style.textColor,
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          enterEditMode();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();

          const isEditingNow = editingLayerIdsRef.current.has(layer.id);

          // 🧠 MIRO RULE #1:
          // If already editing → DO NOTHING (allow caret movement freely)
          if (isEditingNow) {
            return; // 🔥 THIS LINE FIXES YOUR CURSOR ISSUE
          }

          // Prevent text highlight when NOT editing (keeps drag smooth)
          e.preventDefault();

          // First click = selection (blue box)
          onCommit(layer.id, { __select: true });

          // New layer = instant edit (keep your feature)
          if (layer.isNew) {
            enterEditMode();
            return;
          }

          let moved = false;

          const onMove = () => {
            moved = true;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);

            // Drag instead of editing (preserves your drag system)
            onPointerDown?.(e);
          };

          const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);

            // 🎯 SECOND CLICK (no drag) = ENTER EDIT MODE (MIRO BEHAVIOR)
            if (!moved && !editingLayerIdsRef.current.has(layer.id)) {
              enterEditMode();
            }
          };

          window.addEventListener("pointermove", onMove);
          window.addEventListener("pointerup", onUp);
        }}
        onBlur={commitFinal}
        onKeyDown={(e) => {
          if (e.key === "Escape") ref.current.blur();
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") ref.current.blur();

          if (e.key === "Enter") {
            e.preventDefault();
            document.execCommand("insertLineBreak");
          }
        }}
      />
      <style jsx>{`
        [contenteditable][data-placeholder]:empty::before,
        [contenteditable][data-placeholder]:not(:focus):empty::before {
          content: attr(data-placeholder);
          color: #999;
          pointer-events: none;
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
