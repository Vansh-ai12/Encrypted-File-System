import { NextResponse } from "next/server";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const headers = {
  "Content-Type": "application/json",
  "api-key": QDRANT_API_KEY,
};

export async function POST() {
  try {
    const res = await fetch(`${QDRANT_URL}/collections/Learning_Rag`, { headers });

    if (res.status === 404) {
      // Create collection
      await fetch(`${QDRANT_URL}/collections/Learning_Rag`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          vectors: { size: 384, distance: "Cosine" },
        }),
      });

      // ✅ Create payload indexes RIGHT AFTER collection is created
      await fetch(`${QDRANT_URL}/collections/Learning_Rag/index`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          field_name: "file_id",
          field_schema: "keyword",
        }),
      });

      await fetch(`${QDRANT_URL}/collections/Learning_Rag/index`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          field_name: "workspace_id",
          field_schema: "keyword",
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}