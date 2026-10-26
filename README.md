
# RouteMind — AI-Powered Multi-Agent Travel Planning System

RouteMind is an AI-powered travel planning application that generates personalized itineraries based on user preferences, budget, and travel requirements. It combines multi-agent orchestration, external tool integration, and Retrieval-Augmented Generation (RAG) to provide context-aware travel recommendations.

## Features

- **Multi-Agent Workflow:** Uses LangGraph to coordinate specialized agents for flight guidance, hotel research, weather information, budget estimation, and itinerary generation.
- **Intelligent Routing:** A supervisor evaluates travel requests and routes them to the appropriate agents.
- **Human-in-the-Loop:** Allows users to review itineraries, approve drafts, or provide revision feedback before generating the final response.
- **RAG-Based Travel Assistance:** Supports PDF uploads and retrieves relevant information using Qdrant for document-grounded answers and itinerary planning.
- **Persistent State Management:** Uses MySQL checkpointing to preserve graph execution state and resume interrupted workflows.
- **Interactive Frontend:** Provides a React interface for trip planning, itinerary review, and travel-guide question answering.

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React, Vite, CSS |
| Backend | Python, FastAPI, Uvicorn |
| AI Orchestration | LangGraph, LangChain |
| LLM Integration | ChatGroq, Groq API |
| Tool Integration | Model Context Protocol (MCP), Tavily |
| RAG & Vector Search | Qdrant, Ollama Embeddings |
| Database | MySQL |
| Data Validation | Pydantic |

## Architecture

```text
React Frontend
      |
      v
   FastAPI
      |
      v
LangGraph Supervisor
      |
      v
Specialized Agents
  ├── Flight Agent
  ├── Hotel Agent
  ├── Weather Agent
  ├── Budget Agent
  └── Itinerary Agent
      |
      ├── External MCP Tools
      ├── LLM Integration
      └── Qdrant RAG Retrieval
      |
      v
   Draft Itinerary
      |
      v
  Human Review
      |
      v
 Final Response

MySQL → Persistent Graph Checkpoints
```

## Workflow

```mermaid
flowchart TD
    A[React Frontend] --> B[FastAPI Backend]
    B --> C[LangGraph Supervisor]

    C --> D[Flight Agent]
    C --> E[Hotel Agent]
    C --> F[Weather Agent]
    C --> G[Budget Agent]

    D --> H[Itinerary Agent]
    E --> H
    F --> H
    G --> H

    I[External MCP Tools] --> D
    I --> E
    I --> F

    J[PDF Travel Guides] --> K[Text Processing and Embeddings]
    K --> L[(Qdrant Vector Database)]
    L --> H

    H --> M[Draft Itinerary]
    M --> N{Human Review}
    N -->|Approve| O[Final Response]
    N -->|Revise| O

    P[(MySQL Checkpointer)] -.-> C
    P -.-> N
```

## How It Works

1. The user submits a natural-language travel request through the React frontend.
2. FastAPI forwards the request to the LangGraph workflow.
3. The supervisor evaluates the request and routes it to the relevant specialist agents.
4. The agents gather available travel information, estimate costs, and contribute to itinerary generation.
5. The RAG module retrieves relevant context from uploaded travel guides.
6. The itinerary agent generates a draft using the available travel information and retrieved context.
7. The application pauses for human review.
8. The user approves the draft or provides revision feedback.
9. The graph resumes using the saved thread state and generates the final response.

## Project Structure

```text
RouteMind/
├── app.py
├── backend.py
├── exception.py
├── tools/
│   ├── mcp_client.py
│   └── travel_rag.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── api.js
│   ├── package.json
│   └── vite.config.js
├── requirements.txt
└── README.md
```

## RAG Pipeline

1. **Document Ingestion:** Accept travel-guide PDFs for processing.
2. **Text Processing:** Extract text and split it into smaller chunks.
3. **Embedding Generation:** Generate vector embeddings using Ollama.
4. **Vector Storage:** Store document chunks and embeddings in Qdrant.
5. **Context Retrieval:** Retrieve relevant chunks based on the user's query.
6. **Context-Aware Generation:** Use retrieved information to answer travel questions and support itinerary planning.

## Getting Started

### Prerequisites

- Python
- Node.js and npm
- MySQL
- Qdrant
- Groq API key
- Credentials and access for the configured MCP servers

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd RouteMind-AI-Powered-Multi-Agent-Travel-Planning-System
```

### 2. Set Up the Backend

Create a virtual environment:

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
DB_URI=mysql://your_user:your_password@127.0.0.1:3306/routemind
```

Configure any additional environment variables required by the MCP client and RAG modules.

Ensure that MySQL, Qdrant, and the required MCP services are running and accessible.

### 4. Run the Backend

From the project root:

```bash
python -m uvicorn app:app --reload
```

- **API:** http://127.0.0.1:8000
- **Swagger UI:** http://127.0.0.1:8000/docs

### 5. Run the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, typically:

http://localhost:5173

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check API availability |
| POST | `/api/travel` | Generate a travel itinerary draft |
| POST | `/api/travel/approve` | Approve or revise a draft |
| POST | `/rag/upload` | Upload a travel-guide PDF |
| POST | `/rag/ask` | Ask questions about travel documents |

## Key Engineering Concepts

- Graph-based multi-agent orchestration and conditional routing
- Shared state management and checkpoint-based workflow resumption
- Human-in-the-loop approval using persistent thread identifiers
- Retrieval-Augmented Generation for document-grounded responses
- External tool integration through MCP
- REST API development using FastAPI
- Vector search and embedding-based document retrieval
- Separation of frontend, backend, and retrieval components

## Limitations

- RouteMind generates travel recommendations; it does not book flights or hotels or process payments.
- Flight and accommodation information depends on configured tools and available search results.
- Budget estimates and generated recommendations should be independently verified.
- Thread identifiers and workflow approval are not substitutes for authentication or authorization.
- Forecast availability depends on the capabilities of the configured weather service.

## Future Improvements

- Integrate verified flight and hotel availability APIs.
- Add authentication and user-specific document access.
- Introduce automated tests for agent routing, API behavior, and RAG retrieval.
- Add structured itinerary responses and real-time workflow progress.
- Improve clarification handling for incomplete travel requests.

---

**RouteMind demonstrates practical experience with multi-agent AI systems, LangGraph, RAG, MCP integrations, persistent workflows, and full-stack application development.**
