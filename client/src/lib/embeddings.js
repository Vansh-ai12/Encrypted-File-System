import { pipeline } from "@xenova/transformers";

let embedder = null;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return embedder;
}

export async function generateEmbedding(text) {
  const model = await getEmbedder();

  const output = await model(text, {
    pooling: "mean",
    normalize: true,
  });

 
  const embedding = output.data;

  return Array.from(embedding);
}