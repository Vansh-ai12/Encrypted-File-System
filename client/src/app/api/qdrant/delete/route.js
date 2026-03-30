import { NextResponse } from "next/server";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const headers = {
  "Content-Type": "application/json",
  "api-key": QDRANT_API_KEY,
};

export async function POST(request) {
  try {
    const { fileId } = await request.json();

    await fetch(`${QDRANT_URL}/collections/Learning_Rag/points/delete`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        filter: {
          must: [{ key: "file_id", match: { value: fileId } }],
        },
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}