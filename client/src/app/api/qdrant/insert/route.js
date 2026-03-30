import { NextResponse } from "next/server";

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const headers = {
  "Content-Type": "application/json",
  "api-key": QDRANT_API_KEY,
};

export async function POST(request) {
  try {
    const { points } = await request.json();

    if (!points || points.length === 0) {
      return NextResponse.json({ error: "No points provided" }, { status: 400 });
    }

    const res = await fetch(`${QDRANT_URL}/collections/Learning_Rag/points`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ points }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}