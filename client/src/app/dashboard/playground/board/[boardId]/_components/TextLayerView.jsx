"use client";

export function TextLayerView({ layer, onChange }) {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      className="absolute border border-blue-400 px-2 py-1 bg-transparent"
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        minHeight: layer.height,
        fontSize: 16,
      }}
      onInput={(e) => onChange(layer.id, e.currentTarget.innerText)}
    >
      {layer.value || "Type"}
    </div>
  );
}
