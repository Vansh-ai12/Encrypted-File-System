// hooks/utils.js
export function connectionIdToColor(connectionId) {
  const colors = [
    "#EF4444", // red
    "#F97316", // orange
    "#EAB308", // yellow
    "#22C55E", // green
    "#06B6D4", // cyan
    "#3B82F6", // blue
    "#8B5CF6", // violet
    "#EC4899", // pink
  ];

  // ✅ SAFETY GUARD
  if (!connectionId || typeof connectionId !== "string") {
    return colors[0]; // default color
  }

  let hash = 0;
  for (let i = 0; i < connectionId.length; i++) {
    hash = connectionId.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

