"use client";

export function NoteLayerView({ layer, onChange }) {
  return (
    <div
      contentEditable
      suppressContentEditableWarning
      className="absolute p-4 shadow-md"
      style={{
        left: layer.x,
        top: layer.y,
        width: layer.width,
        height: layer.height,
        background: "#FEF08A",
      }}
      onInput={(e) => onChange(layer.id, e.currentTarget.innerText)}
    >
      {layer.value || ""}
    </div>
  );
}
