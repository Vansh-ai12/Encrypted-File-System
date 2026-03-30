let collectionInitialized = false;

async function ensureCollection() {
  if (collectionInitialized) return;
  await fetch("/api/qdrant/ensure-collection", { method: "POST" });
  collectionInitialized = true;
}

export async function insertVectors(points) {
  if (!points || points.length === 0) {
    console.error("❌ No points to insert");
    return;
  }
  await ensureCollection();

  const res = await fetch("/api/qdrant/insert", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ points }),
  });

  const data = await res.json();
  console.log("Qdrant response:", data);
}

export async function deleteFileVectors(fileId) {
  await fetch("/api/qdrant/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });
}