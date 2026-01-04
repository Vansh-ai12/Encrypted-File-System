"use client";
import { useEffect, useRef } from "react";

export function NoteLayerView({ layer, onCommit }) {
  const ref = useRef(null);
  const rafRef = useRef(null);

  // 🔁 Sync React → DOM (ONLY when NOT typing)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (document.activeElement === el) return;

    el.innerText = layer.value || "";
    resize();
  }, [layer.value]);

  // 🎯 Auto-focus newly created note
  useEffect(() => {
    if (!ref.current) return;

    if (layer.isNew) {
      ref.current.focus();
      placeCaretAtEnd(ref.current);

      onCommit(layer.id, {
        isNew: false,
        __local: true,
        __editing: true,
      });
    }
  }, []);

  const resize = () => {
    const el = ref.current;
    if (!el) return;

    el.style.width = "auto";
    el.style.height = "auto";

    el.style.width = el.scrollWidth + 32 + "px";
    el.style.height = el.scrollHeight + 16 + "px";
  };

  // 🔥 LIVE (local + websocket)
  const commitLive = () => {
    if (rafRef.current) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = ref.current;
      if (!el) return;

      const payload = {
        value: el.innerText,
        width: el.scrollWidth + 32,
        height: el.scrollHeight + 16,
        __local: true,
        __editing: true,
      };

      onCommit(layer.id, payload);

      window.dispatchEvent(
        new CustomEvent("board-ws-send", {
          detail: {
            type: "NOTE_LIVE_UPDATE",
            id: layer.id,
            value: payload.value,
            width: payload.width,
            height: payload.height,
          },
        })
      );
    });
  };

  // ✅ FINAL commit → backend
  const commitFinal = () => {
    const el = ref.current;
    if (!el) return;

    onCommit(layer.id, {
      value: el.innerText,
      width: el.scrollWidth + 32,
      height: el.scrollHeight + 16,
      __editing: false,
    });
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className="
        absolute
        shadow-md
        outline-none
        cursor-text
        bg-yellow-200
        focus:ring-2
        focus:ring-blue-400
        box-border
        px-4 py-2
        whitespace-pre-wrap
      "
      style={{
        left: layer.x,
        top: layer.y,
        fontSize: 20,
        lineHeight: "1.3",
        minWidth: 120,
        minHeight: 40,
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onInput={() => {
        resize();
        commitLive();
      }}
      onBlur={commitFinal}
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
