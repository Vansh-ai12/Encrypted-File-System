from typing import Dict, List
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings import HuggingFaceEmbeddings


text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,
    chunk_overlap=100
)


embeddings_model = None
vector_store = None

import os
from dotenv import load_dotenv
load_dotenv()






def retrieve_chunks(
    query: str,
    workspace_id: int = None,
    file_id: str = None,
    top_k: int = 3
):
    try:
        conditions = []

        # 🔥 FILTER BY WORKSPACE
        if workspace_id:
            conditions.append({
                "key": "workspace_id",
                "match": {"value": workspace_id}
            })

        # 🔥 FILTER BY FILE
        if file_id:
            conditions.append({
                "key": "file_id",
                "match": {"value": file_id}
            })

        filter_condition = {
            "must": conditions
        } if conditions else None

        vs = get_vector_store()

        results = vs.similarity_search(
            query=query,
            k=top_k,
            filter=filter_condition
        )

        chunks = []
        for doc in results:
            chunks.append({
                "text": doc.page_content,
                "file_id": doc.metadata.get("file_id"),
                "file_name": doc.metadata.get("file_name"),
                "chunk_id": doc.metadata.get("chunk_id")
            })

        return chunks

    except Exception as e:
        return [{"error": str(e)}]


def build_llm_context(chunks: List[Dict]) -> str:
    """
    Combine chunks into prompt context
    """

    context = "\n\n".join([chunk["text"] for chunk in chunks])
    return context


# 🔥 4. FULL RAG PIPELINE FUNCTION
def rag_pipeline(
    query: str,
    file_id: str = None,
    top_k: int = 3
) -> Dict:

    chunks = retrieve_chunks(
    query=query,
    file_id=file_id,
    top_k=top_k
)

    context = build_llm_context(chunks)

    return {
        "query": query,
        "context": context,
        "chunks": chunks
    }