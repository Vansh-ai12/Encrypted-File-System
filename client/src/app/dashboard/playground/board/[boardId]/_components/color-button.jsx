"use client";

export const ColorButton = ({ color, active, onClick }) => {
  const isTransparent = color === "transparent";

  return (
    <button
      type="button"
      onClick={() => onClick(color)}
      className={`w-6 h-6 rounded-md border
  ${active ? "ring-2 ring-black" : "border-neutral-300"}
`}
      style={{
        backgroundColor: isTransparent ? "rgb(245 245 245)" : color,
        backgroundImage: isTransparent
          ? "linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)"
          : undefined,
        backgroundSize: isTransparent ? "6px 6px" : undefined,
        backgroundPosition: isTransparent
          ? "0 0,0 3px,3px -3px,-3px 0px"
          : undefined,
      }}
    />
  );
};
