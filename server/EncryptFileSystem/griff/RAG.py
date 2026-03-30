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

def get_vector_store():
    global embeddings_model, vector_store

    if embeddings_model is None:
        embeddings_model = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    from qdrant_client import QdrantClient

    qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key = os.getenv("QDRANT_API_KEY", None)

    client = QdrantClient(
        url=qdrant_url,
        api_key=qdrant_api_key,  # None locally, real key in production
    )

    vector_store = QdrantVectorStore(
        client=client,
        collection_name="Learning_Rag",
        embedding=embeddings_model
    )

    return vector_store

def index_document(
    file_id: str,
    file_name: str,
    raw_text: str,
    user_id: int,
    workspace_id: int = None
) -> Dict:

    try:
        docs = [
            Document(
                page_content=raw_text,
                metadata={
                    "file_id": file_id,
                    "file_name": file_name,
                    "user_id": user_id,             
                    "workspace_id": workspace_id   
                }
            )
        ]

        chunks = text_splitter.split_documents(docs)

        for i, chunk in enumerate(chunks):
            chunk.metadata["chunk_id"] = i

        vs = get_vector_store()
        vs.add_documents(chunks)

        return {
            "status": "success",
            "chunks_indexed": len(chunks),
            "file_id": file_id
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


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