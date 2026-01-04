"use client";
import { useEffect, useRef } from "react";

export function TextLayerView({ layer, onCommit }) {
  const ref = useRef(null);

  // 🔁 Sync React → DOM (ONLY when NOT typing)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 🔥 do not overwrite while user is typing
    if (document.activeElement === el) return;

    el.innerText = layer.value || "";
  }, [layer.value]);

  // 🎯 Auto-focus newly created text
  useEffect(() => {
    if (!ref.current) return;

    if (layer.isNew) {
      ref.current.focus();
      placeCaretAtEnd(ref.current);

      // mark as local-only change
      onCommit(layer.id, {
        isNew: false,
        __local: true,
        __editing: true,
      });
    }
  }, []);

  // 🧠 FINAL COMMIT → backend
  const commitFinal = () => {
    const el = ref.current;
    if (!el) return;

    onCommit(layer.id, {
      value: el.innerText,
      width: el.scrollWidth + 8,
      height: el.scrollHeight + 4,
      __editing: false, // 🔥 editing finished
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
        px-2 py-1
        outline-none
        whitespace-pre-wrap
        bg-neutral-100
        border border-transparent
        focus:border-blue-500
      "
      style={{
        left: layer.x,
        top: layer.y,
        fontSize: 20,
        minWidth: 20,
        minHeight: 28,
        cursor: "text",
        pointerEvents: "auto",
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onInput={(e) => {
        const el = e.currentTarget;

        // 🔥 LIVE LOCAL UPDATE (no backend)
        onCommit(layer.id, {
          value: el.innerText,
          width: el.scrollWidth + 8,
          height: el.scrollHeight + 4,
          __local: true,
          __editing: true,
        });

        window.dispatchEvent(
          new CustomEvent("board-ws-send", {
            detail: {
              type: "TEXT_LIVE_UPDATE",
              id: layer.id,
              value: el.innerText,
              width: el.scrollWidth + 8,
              height: el.scrollHeight + 4,
            },
          })
        );
      }}
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          ref.current.blur(); // final commit
        }
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
