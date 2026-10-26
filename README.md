
# RouteMind — AI-Powered Multi-Agent Travel Planning System

RouteMind is an AI-powered travel planning application that uses specialized agents to generate personalized itineraries based on user preferences, budget, and travel requirements. It combines multi-agent orchestration, external search tools, and Retrieval-Augmented Generation (RAG) to provide context-aware travel recommendations.

## Features

- **Multi-Agent Workflow:** Uses LangGraph to coordinate agents for flight guidance, hotel research, weather information, budget estimation, and itinerary generation.
- **Intelligent Routing:** A supervisor evaluates travel requests and selects the appropriate agents.
- **Human-in-the-Loop:** Allows users to review itineraries, approve drafts, or provide revision feedback before generating the final response.
- **RAG-Based Travel Assistance:** Supports PDF uploads and retrieves relevant information using Qdrant for document-grounded answers and itinerary planning.
- **Persistent State Management:** Uses MySQL checkpointing to preserve graph execution state and resume interrupted workflows.
- **Interactive Frontend:** Provides a React interface for trip planning, itinerary review, and travel-guide Q&A.

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
Travel Supervisor
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

## How It Works

1. The user submits a natural-language travel request through the React frontend.
2. FastAPI forwards the request to the LangGraph workflow.
3. The supervisor evaluates the request and routes it to the relevant specialist agents.
4. The agents gather available travel information, estimate costs, and contribute to itinerary generation.
5. The RAG module retrieves relevant information from uploaded travel guides.
6. The application presents a draft itinerary for human review.
7. The workflow resumes using the saved thread state to generate the final response after approval or revision feedback.

## Getting Started

### Prerequisites

- Python
- Node.js and npm
- MySQL
- Qdrant
- Groq API key
- Credentials and access for configured MCP servers

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

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
DB_URI=mysql://your_user:your_password@127.0.0.1:3306/routemind
```

Configure any additional environment variables required by the MCP client and RAG modules. Ensure MySQL, Qdrant, and the required MCP services are running and accessible.

### 4. Run the Backend

From the project root:

```bash
python -m uvicorn app:app --reload
```

- API: `http://127.0.0.1:8000`
- Swagger UI: `http://127.0.0.1:8000/docs`

### 5. Run the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, typically `http://localhost:5173`.

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
- Separation of frontend, backend, and retrieval components

## Limitations

- RouteMind generates travel recommendations; it does not book flights or hotels or process payments.
- Flight and accommodation information depends on configured tools and available search results.
- Budget estimates and generated recommendations should be independently verified.
- Thread identifiers and workflow approval are not substitutes for authentication or authorization.

## Future Improvements

- Integrate verified flight and hotel availability APIs.
- Add authentication and user-specific document access.
- Introduce automated tests for agent routing, API behavior, and RAG retrieval.
- Add structured itinerary responses and real-time workflow progress.

---

**RouteMind demonstrates practical experience with AI agents, LangGraph, RAG, external tool integration, persistent workflows, and full-stack application development.**
