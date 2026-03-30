from django.http import JsonResponse
from django.shortcuts import render
from .RAG import index_document, retrieve_chunks, build_llm_context, rag_pipeline

# Create your views here.

import os
from dotenv import load_dotenv
from django.views.decorators.csrf import csrf_exempt
from groq import Groq
import json

from qdrant_client.models import Filter, FieldCondition, MatchValue
load_dotenv()

client = Groq(
    api_key=os.environ.get("MODEL_API_KEY"),
)


from qdrant_client import QdrantClient


qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
qdrant_api_key = os.getenv("QDRANT_API_KEY", None)

clientQ = QdrantClient(
    url=qdrant_url,
    api_key=qdrant_api_key,
)

SYSTEM_PROMPT = """
You are an advanced AI assistant with the following capabilities:

### 🎯 CORE ROLES:
1. Document Assistant → Answer questions based on provided document context
2. Code Analyst → Detect bugs, issues, and improvements in code
3. Image Interpreter → Understand and extract insights from images (via OCR text)

---

### 🧠 BEHAVIOR RULES:
- ALWAYS prioritize provided context over general knowledge
- If context is missing → clearly say: "Based on general knowledge..."
- DO NOT hallucinate
- Be structured and clear

---

### 🐞 BUG DETECTION MODE:
If the input contains code or technical text:
- Identify bugs or logical issues
- Suggest fixes
- Provide corrected code if possible

Example:

Input:
for i in range(5)
    print(i)

Output:
❌ Issue: Missing colon in loop declaration  
✅ Fix:
for i in range(5):
    print(i)

---

### 📄 DOCUMENT QA MODE:
If context is provided:
- Extract answer ONLY from context
- If not found → say "Not found in provided document"

---



---

### ✍️ RESPONSE STYLE:
- Use bullet points if needed
- Keep it concise but informative
- Highlight issues clearly

---

### EXAMPLES:

Q: What is in the document?  
A: The document discusses [topic] and highlights [key points].

Q: Find bug in this code  
A:  
❌ Issue: ...  
✅ Fix: ...

---

Q: Tell the context of the image or the code in the image or anything in the image?
A: I cant read images...

Always act like a smart assistant helping users understand documents and debug issues.


Q Tell what is in the pdf the certain section or anything?
A: I can help you in dev and code related issues...


STRICT RULES:

1. NEVER mention:
- chunks
- context blocks
- retrieved data
- internal processing

2. If user asks:
   "line no X"
   → You MUST:
   - internally analyze the code
   - find the correct line
   - explain it directly
   - DO NOT say "assuming" or "based on chunks"

3. Behavior:
- Answer like you are directly reading the file
- Be confident and precise
- NO guessing
- NO vague wording

4. Code handling:
- If code is present:
    - understand full structure
    - answer specifically
    - detect bugs if asked

5. If line not found:
   → say:
   "That line is not present in the provided code."

6. Style:
- Clean
- Direct
- Developer-friendly
- No unnecessary explanation

7. NEVER say:
- "based on provided chunks"
- "from retrieved context"
- "it appears"

Speak like a real senior developer explaining code.



"""

def generate_llm_response(question: str, context: str = None):
    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT}
        ]


        if context:
            messages.append({
                "role": "system",
                "content": f"Use this context to answer:\n\n{context}"
            })

        messages.append({
            "role": "user",
            "content": question
        })

        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
        )

        return chat_completion.choices[0].message.content

    except Exception as e:
        return f"Error: {str(e)}"

@csrf_exempt
def generate_response(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body)

        question = data.get("question")
     
        workspace_id = data.get("workspace_id")
        file_id = data.get("file_id")

        if not file_id:
            return JsonResponse({"error": "file_id is required"}, status=400)

        if not question:
            return JsonResponse({"error": "Question is required"}, status=400)
        
        # 🔥 SMART MODE DETECTION
        FULL_SCAN_KEYWORDS = [
    "bug", "issue", "optimize", "review", "fix", "analyze",
    "explain", "overview", "summary", "what does", "full code"
]

        LINE_QUERY = "line" in question.lower()

        if LINE_QUERY:
            use_full_scan = False
        else:
            use_full_scan = any(word in question.lower() for word in FULL_SCAN_KEYWORDS)

        # 🚀 SPECIAL HANDLING FOR LINE QUERIES
        if LINE_QUERY:
            try:
                scroll_res, _ = clientQ.scroll(
            collection_name="Learning_Rag",
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="file_id",
                        match=MatchValue(value=file_id)
                    ),
                    FieldCondition(
                        key="workspace_id",
                        match=MatchValue(value=workspace_id)
                    )
                ]
            ),
            limit=200
        )

        # ✅ SORT BY chunk_id (VERY IMPORTANT)
                sorted_points = sorted(
            scroll_res,
            key=lambda x: x.payload.get("chunk_id", 0)
        )

                full_text = "\n".join([
            point.payload.get("text", "")
            for point in sorted_points
        ])

                context_text = full_text

            except Exception as e:
                return JsonResponse({"error": str(e)}, status=500)
        elif use_full_scan:
            from .RAG import get_vector_store

            vs = get_vector_store()

            try:
                scroll_res, _ = clientQ.scroll(
    collection_name="Learning_Rag",
    scroll_filter=Filter(
        must=[
            FieldCondition(
                key="file_id",
                match=MatchValue(value=file_id)
            ),
            FieldCondition(
                key="workspace_id",
                match=MatchValue(value=workspace_id)
            )
        ]
    ),
    limit=40
)
                results = scroll_res
            except Exception as e:
                print("❌ Qdrant search error:", e)
                return JsonResponse({"error": str(e)}, status=500)


            chunks = [
    {
        "text": point.payload.get("text"),
        "file_id": point.payload.get("file_id"),
        "file_name": point.payload.get("file_name"),
        "chunk_id": point.payload.get("chunk_id"),
    }
    for point in results
]
        else:
            chunks = retrieve_chunks(
        query=question,
        workspace_id=workspace_id,
        file_id=file_id,
        top_k=3
    )
      
        if not chunks:
            context_text = "No relevant context found."
        elif isinstance(chunks[0], dict) and "error" in chunks[0]:
            context_text = "No relevant context found."
        else:
    # ✅ FIRST build context
            context_text = "\n\n".join([
        chunk["text"] for chunk in chunks if chunk.get("text")
    ])

    # 🔥 HARD LIMIT (prevents 413 crash)
            MAX_CONTEXT_CHARS = 12000

            if len(context_text) > MAX_CONTEXT_CHARS:
                context_text = context_text[:MAX_CONTEXT_CHARS]

        # 🔥 Add line numbers to context (helps LLM accuracy)
        context_lines = context_text.split("\n")
        numbered_context = "\n".join(
    [f"{i+1}: {line}" for i, line in enumerate(context_lines)]
)
        final_prompt = f"""
User Question:
{question}

Code / Document:
{numbered_context}

Instructions:
- Answer precisely
- If line number is asked → locate it internally and explain
- Do NOT mention how you found it
- Do NOT mention chunks or context
- Be direct and confident
"""
     
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": final_prompt}
            ],
        )

        return JsonResponse({
            "response": response.choices[0].message.content,
            "chunks_used": chunks
        })

    except Exception as e:
        return JsonResponse({
            "error": str(e)
        }, status=500)

@csrf_exempt
def index_data(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
     
        decrypted_data = request.POST.get("decrypted_data")
        file_id = request.POST.get("file_id")
        file_name = request.POST.get("file_name")
        user_id = request.POST.get("user_id")
        workspace_id = request.POST.get("workspace_id")

     
        if not decrypted_data:
            return JsonResponse({"error": "Decrypted data is required"}, status=400)

        if not file_id or not file_name:
            return JsonResponse({"error": "file_id and file_name required"}, status=400)

        if not user_id:
            return JsonResponse({"error": "user_id required"}, status=400)

       
        result = index_document(
            file_id=file_id,
            file_name=file_name,
            raw_text=decrypted_data,
            user_id=int(user_id),
            workspace_id=int(workspace_id) if workspace_id else None
        )

        return JsonResponse(result, status=200)

    except Exception as e:
        return JsonResponse({
            "status": "error",
            "message": str(e)
        }, status=500)

SYSTEM_PROMPT_2 = """
You are a strict software development assistant.

RULES:

1. ONLY answer programming / dev related questions.

2. If NOT dev-related → reply EXACTLY:
"Sorry, I can’t answer that right now."

3. ALWAYS format responses like this:

- NO unnecessary stars (**)
- NO markdown headings unless useful
- Use clean spacing

4. For code:
- ALWAYS return properly formatted code
- NO ``` unless necessary
- Keep indentation perfect
- Avoid extra explanations inside code

5. Response style:
- Short
- Clean
- Structured
- Developer-friendly

Example:

Factorial in Python:

def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)
"""


@csrf_exempt
def chatbot_reply(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        body = json.loads(request.body)
        question = body.get("question", "").strip()

        if not question:
            return JsonResponse({"error": "Question is required"}, status=400)

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT_2},
            {"role": "user", "content": question}
        ]

        chat_completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
        )

        answer = chat_completion.choices[0].message.content

        return JsonResponse({
            "answer": answer
        })

    except Exception as e:
        return JsonResponse({
            "error": str(e)
        }, status=500)