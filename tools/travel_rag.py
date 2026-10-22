import hashlib
import os
from pathlib import Path
import uuid
import requests
from qdrant_client import QdrantClient
from qdrant_client.models import(
    Distance,
    PointStruct,
    VectorParams
)
from io import BytesIO
from pypdf import PdfReader
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage

load_dotenv()

llm = ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=os.getenv("GROQ_API_KEY")
)

OLLAMA_URL=os.getenv(
    "OLLAMA_URL",
    "http://localhost:11434"
)
EMBEDDING_MODEL = "nomic-embed-text"

QDRANT_URL = os.getenv(
    "QDRANT_URL",
    "http://localhost:6333"
)
COLLECTION_NAME = "travel_knowledge"

DOCUMENTS_DIR = Path("data/travel_guides")

qdrant=QdrantClient(url=QDRANT_URL)


def generate_embedding(text:str)->list[float]:
    """Generate an embedding using local ollama"""
    response=requests.post(
        f"{OLLAMA_URL}/api/embed",
        json={
            "model":EMBEDDING_MODEL,
            "input":text
        },
        timeout=120,
    )
    response.raise_for_status()
    embeddings=response.json()["embeddings"]

    if not embeddings:
        raise ValueError("Ollama returned no embeddings")

    return embeddings[0]


def split_text(text:str,chunk_size:int=800,overlap:int=150)->list[str]:
    text=text.strip()
    if not text:
        return []
    
    chunks=[]
    start=0

    while start<len(text):
        end=min(start+ chunk_size,len(text))

        if end<len(text):
            boundary=text.rfind("\n",start,end)

            if boundary>start+chunk_size // 2:
                end=boundary

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(end - overlap, start + 1)

    return chunks

def create_collection(vector_size:int)->None:
    if qdrant.collection_exists(COLLECTION_NAME):
        return

    qdrant.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=vector_size,
            distance=Distance.COSINE
        )
    )



def ingest_documents() -> int:

    if not DOCUMENTS_DIR.exists():
        raise FileNotFoundError(
            f"Document folder not found: {DOCUMENTS_DIR}"
        )

    files = list(DOCUMENTS_DIR.glob("*.md"))

    if not files:
        raise FileNotFoundError(
            f"No Markdown files found in {DOCUMENTS_DIR}"
        )

    total_chunks = 0

    for file_path in files:
        print(f"Processing: {file_path.name}")

        text = file_path.read_text(encoding="utf-8")

        chunks_stored = ingest_text(
            text=text,
            source=file_path.name,
            document_id=str(file_path.resolve())
        )

        total_chunks += chunks_stored

        print(
            f"Stored {chunks_stored} chunks from "
            f"{file_path.name}"
        )

    return total_chunks



def ingest_text(text: str,source: str,document_id: str) -> int:

    chunks = split_text(text)

    if not chunks:
        return 0

    points = []

    for index, chunk in enumerate(chunks):
        vector = generate_embedding(chunk)

        point_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"{document_id}:{index}"
            )
        )

        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "text": chunk,
                    "source": source,
                    "document_id": document_id,
                    "chunk_index": index,
                },
            )
        )

    create_collection(
        vector_size=len(points[0].vector)
    )

    qdrant.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
        wait=True
    )

    return len(points)



def ingest_pdf_bytes(pdf_bytes: bytes, filename: str) -> int:
    """
    Extract text from an uploaded PDF and store it in Qdrant
    using the existing shared ingest_text() function.
    """

    reader = PdfReader(BytesIO(pdf_bytes))

    # Extract text from all pages
    pages_text = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        pages_text.append(page_text)

    full_text = "\n".join(pages_text).strip()

    if not full_text:
        raise ValueError(
            "No readable text found in PDF. "
            "The PDF may be scanned or image-based."
        )

    # Stable ID based on PDF contents
    document_hash = hashlib.sha256(pdf_bytes).hexdigest()

    # Reuse the shared ingestion pipeline
    chunks_stored = ingest_text(
        text=full_text,
        source=filename,
        document_id=document_hash
    )

    return chunks_stored



def retrieve_travel_knowledge(query:str, limit:int=3)->list[dict]:
    
    if not qdrant.collection_exists(COLLECTION_NAME):
        return []

    query_vector=generate_embedding(query)

    results=qdrant.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=limit,
        with_payload=True,
    )

    return[
        {
            "text":point.payload["text"],
            "source":point.payload["source"],
            "score":point.score,
        }
        for point in results.points
    ]



def get_travel_context(query:str, limit:int=3)->str:

    results=retrieve_travel_knowledge(query,limit=limit)

    if not results:
        return "No relevant information found in travel guides."

    context_parts=[]

    for result in results:
        context_parts.append(
            f"source:{result['source']}\n"
            f"relevance score: {result['score']:.3f}\n"
            f"content:{result['text']}"
        )
    return "\n\n".join(context_parts)


def generate_travel_answer(question: str) -> str:

    # Step 1: Retrieve relevant documents from Qdrant
    results = retrieve_travel_knowledge(question, limit=3)

    if not results:
        return "I couldn't find relevant information in the travel guides."

    # Step 2: Prepare retrieved text for the LLM
    context = "\n\n".join(
        f"Source: {result['source']}\n{result['text']}"
        for result in results
    )

    # Step 3: Send question + retrieved text to Groq
    response = llm.invoke([
        SystemMessage(content="""
        You are a knowledgeable travel assistant.

        Answer the user's question using the provided travel-guide context.
        Do not invent facts that are not supported by the context.
        If the context is insufficient, clearly mention what information
        is missing.
        """),

        HumanMessage(content=f"""
        Travel Guide Context:
        {context}

        User Question:
        {question}

        Generate a useful, practical answer.
        """)
    ])

    return response.content



if __name__ == "__main__":

    count = ingest_documents()

    print(f"\nIngestion complete. Stored {count} chunks.")

    question = input("\nAsk a travel knowledge question: ")

    answer = generate_travel_answer(question)

    print("\nGenerated Travel Answer:\n")
    print(answer)