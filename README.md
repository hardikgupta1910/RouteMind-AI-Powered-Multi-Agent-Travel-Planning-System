# RouteMind

### AI-assisted travel planning with specialist agents, human review, and document-grounded Q&A.

RouteMind turns natural-language travel requests into draft itineraries using a supervisor-driven LangGraph workflow. Specialist agents contribute flight guidance, accommodation research, weather information, and budget assessments.

Users can review the draft before generating the final response. Travel-guide PDFs can also be uploaded to a Qdrant-backed knowledge base for retrieval-augmented question answering and supporting itinerary context.

> RouteMind is a planning assistant, not a booking platform. It does not reserve flights or hotels, process payments, or guarantee prices and availability.

---

## Features

### Natural-language trip planning

Describe a trip in a short request:

```text
Plan a relaxed 3-day Jaipur trip from Mumbai under ₹25,000 per person.
```

The application extracts available constraints and uses them to coordinate the planning workflow.

Missing information, such as dates or traveler count, should be reported rather than invented.

### Supervisor-driven agent routing

The supervisor evaluates whether a request belongs to the travel domain, extracts trip constraints, and selects specialist agents.

| Agent | Responsibility |
|---|---|
| Supervisor | Request screening, constraint extraction, and agent selection |
| Flight agent | Flight and airport guidance using available aviation reference tools |
| Hotel agent | Accommodation research through Tavily MCP search |
| Weather agent | Current conditions and forecast-availability checks |
| Budget agent | Approximate cost breakdown and feasibility assessment |
| Itinerary agent | Combines specialist results with relevant retrieved guide context |
| Human approval node | Pauses execution for draft review |
| Final agent | Produces the final response after approval or revision feedback |

Selected specialists execute sequentially in a predefined order. This implementation does not run all specialist agents in parallel.

### Human-in-the-loop review

The graph pauses after producing a draft itinerary.

The user can:

- Approve the draft and generate the final response.
- Submit feedback and generate a revised final response.

The same `thread_id` is used to resume the paused graph.

> In the current workflow, revision feedback goes directly to final generation. The revised result does not pass through a second approval cycle.

### Travel-guide RAG

Upload PDF documents to expand the travel knowledge base.

The backend:

1. Reads and processes the PDF.
2. Stores document chunks in Qdrant through the retrieval module.
3. Retrieves relevant context for guide questions and itinerary generation.

The frontend provides a separate travel-guide workspace for PDF uploads and questions.

### Persistent graph state

A synchronous MySQL checkpointer stores graph checkpoints.

Thread identifiers associate requests and human-review resumptions with saved graph state.

### React frontend

The Vite React interface includes:

- Trip-request input.
- Itinerary display.
- Separate flights, stays, weather, and budget sections.
- Draft approval and revision controls.
- PDF upload and document questions.
- Loading and error states.
- Browser-persisted display state and thread identifiers.

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, CSS |
| API | FastAPI, Uvicorn, Pydantic |
| Agent orchestration | LangGraph |
| LLM integration | LangChain, ChatGroq |
| Model configuration | `openai/gpt-oss-20b` through Groq |
| Tool integration | Model Context Protocol |
| Search | Tavily through MCP |
| Aviation information | Configured aviation MCP tools |
| Weather | Configured weather MCP tools |
| Retrieval store | Qdrant |
| Checkpoint database | MySQL |
| MySQL checkpoint driver | PyMySQL |
| Configuration | python-dotenv |
| Certificate bundle | certifi |

Model availability, tool availability, and provider requirements depend on the configured services.

---

## Architecture

```text
React frontend
      |
      | HTTP requests
      v
FastAPI
      |
      v
Travel supervisor
      |
      +---- Request outside supported scope
      |              |
      |              v
      |       Supported-scope response
      |
      +---- Travel request
                     |
                     v
          Selected specialist agents
          executed in configured order
                     |
          +----------+----------+
          |          |          |
          v          v          v
      MCP tools    Groq      Qdrant context
                     |
                     v
              Draft itinerary
                     |
                     v
              Human review
              graph interrupt
                     |
                     | Same thread_id
                     | Command(resume=...)
                     v
              Final response

MySQL stores graph checkpoints throughout execution.
```

### Request lifecycle

1. The frontend submits a travel request.
2. The backend generates a thread ID if one is not supplied.
3. The supervisor screens and routes the request.
4. Selected specialists populate shared graph state.
5. The itinerary agent retrieves supporting guide context and creates a draft.
6. The graph pauses at human review.
7. The API returns the draft with `requires_approval`.
8. The frontend submits approval or revision feedback.
9. The backend resumes the same thread and generates the final response.

---

## Project Structure

The main application files are organized as follows:

```text
.
├── app.py
├── backend.py
├── exception.py
├── tools/
│   ├── mcp_client.py
│   └── travel_rag.py
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── App.css
│       └── api.js
├── .env                  # Local configuration; do not commit
└── README.md
```

Additional files may be present depending on the configured ingestion, MCP, and development setup.

---

## Prerequisites

Before starting the application, prepare:

- Python compatible with the installed dependencies.
- Node.js compatible with the installed Vite version.
- npm.
- A running MySQL server and an existing application database.
- A Groq API key.
- A configured Qdrant instance.
- Access and credentials for the MCP servers used by the project.

The backend must be able to reach MySQL during startup because the graph is compiled with a database checkpointer.

---

## Local Setup

### 1. Open the project directory

```powershell
cd RouteMind-AI-Powered-Multi-Agent-Travel-Planning-System
```

### 2. Create a Python virtual environment

```powershell
python -m venv .venv
```

Activate it on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

On macOS or Linux:

```bash
source .venv/bin/activate
```

### 3. Install backend dependencies

If the repository includes a maintained `requirements.txt`, install it:

```powershell
python -m pip install -r requirements.txt
```

Otherwise, the main application imports require packages including:

```powershell
python -m pip install fastapi uvicorn python-multipart python-dotenv certifi mysql-connector-python pymysql langgraph langchain-core langchain-groq "langgraph-checkpoint-mysql[pymysql]" langchain-mcp-adapters qdrant-client
```

The PDF parsing and embedding dependencies depend on the implementation in `tools/travel_rag.py`. Install the packages imported by that module as well.

> Keep a tested dependency file in the repository. The package list above is not a version-pinned, reproducible environment specification.

### 4. Configure environment variables

Create `.env` in the project root:

```env
GROQ_API_KEY=your_groq_api_key

DB_URI=mysql://your_user:your_url_encoded_password@127.0.0.1:3306/routemind

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=routemind
```

The LangGraph checkpointer uses `DB_URI`.

The separate `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` values are used only by code that calls the standalone `get_db_connection()` helper.

If a username or password contains URI-reserved characters, encode those characters in `DB_URI`.

Also configure the environment variables actually read by:

```text
tools/mcp_client.py
tools/travel_rag.py
```

These modules determine the required MCP credentials, Qdrant configuration, and embedding-provider settings. Do not assume a variable name without checking the module.

### 5. Prepare MySQL

Create the database if it does not already exist:

```sql
CREATE DATABASE IF NOT EXISTS routemind
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

Ensure the configured database user has permissions required by the checkpointer, including its setup migrations.

The application calls:

```python
checkpointer.setup()
```

during startup to initialize the checkpoint schema.

### 6. Configure retrieval and MCP services

Before running requests:

- Make Qdrant reachable by the retrieval module.
- Configure the MCP client’s server connections.
- Supply provider credentials required by those servers.
- Confirm that the expected tool names are actually exposed.

Available capabilities depend on the connected servers. A tool mentioned in application code is not automatically available.

### 7. Install frontend dependencies

```powershell
cd frontend
npm install
```

---

## Run the Application

Use two terminals.

### Terminal 1: backend

From the project root, with the virtual environment active:

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

For development reload:

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

Backend endpoints:

```text
API:          http://127.0.0.1:8000
Swagger UI:   http://127.0.0.1:8000/docs
Health:       http://127.0.0.1:8000/health
```

The root path `/` is not defined by the supplied API and may return `404`. Open `/docs` for API documentation.

### Terminal 2: frontend

```powershell
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

---

## Vite Development Proxy

The frontend uses relative API paths.

Configure `frontend/vite.config.js` to forward requests to FastAPI:

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      "/rag": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        timeout: 600000,
        proxyTimeout: 600000,
      },
      "/health": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
```

This is a development configuration. A production deployment needs its own API routing and frontend-serving arrangement.

---

## API Reference

### Health check

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "message": "AI travel Planner API is running"
}
```

This endpoint reports application availability. It is not a comprehensive health check of every external provider.

### Start a travel-planning run

```http
POST /api/travel
Content-Type: application/json
```

Request:

```json
{
  "message": "Plan a relaxed 3-day Jaipur trip from Mumbai under ₹25,000 per person.",
  "thread_id": null
}
```

Omit `thread_id` or use `null` to generate a new thread.

An illustrative response shape is:

```json
{
  "success": true,
  "thread_id": "user_generated_identifier",
  "answer": "Generated draft itinerary...",
  "requires_approval": true,
  "approval_request": "Please review the generated draft itinerary.",
  "flight_results": "Flight guidance...",
  "hotel_results": "Accommodation guidance...",
  "weather_results": "Current weather or an availability message...",
  "budget_results": "Approximate budget assessment...",
  "itinerary": "Generated draft itinerary...",
  "selected_agents": [
    "flight_agent",
    "hotel_agent",
    "weather_agent",
    "budget_agent",
    "itinerary_agent"
  ],
  "trip_constraints": {
    "destination": "Jaipur",
    "origin": "Mumbai",
    "duration": "3 days",
    "budget": "₹25,000 per person",
    "travel_style": "relaxed",
    "special_preferences": []
  },
  "supervisor_reasoning": "A complete trip requires the specialist workflow.",
  "guardrail_allowed": true,
  "guardrail_reason": "",
  "approved": false,
  "human_feedback": "",
  "llm_calls": 0
}
```

The values above illustrate the response contract, not an actual generated result. Agent selection, text, and call counts vary.

### Approve or revise a draft

```http
POST /api/travel/approve
Content-Type: application/json
```

Approve:

```json
{
  "thread_id": "user_identifier_returned_by_the_first_request",
  "approved": true,
  "feedback": ""
}
```

Request a revised final response:

```json
{
  "thread_id": "user_identifier_returned_by_the_first_request",
  "approved": false,
  "feedback": "Reduce accommodation costs and leave the second afternoon free."
}
```

Use the exact thread ID returned for the paused draft.

Approval finalizes a travel plan; it does not authorize or perform a booking.

### Upload a travel PDF

```http
POST /rag/upload
Content-Type: multipart/form-data
```

Form field:

```text
file: a PDF document
```

Maximum accepted file size: 15 MB.

Example response:

```json
{
  "success": true,
  "filename": "travel-guide.pdf",
  "chunks_stored": 12,
  "message": "PDF successfully ingested into travel knowledge base."
}
```

The chunk count depends on the document and ingestion implementation.

### Ask a guide question

```http
POST /rag/ask
Content-Type: application/json
```

Request:

```json
{
  "question": "What does the uploaded guide recommend for a relaxed two-day visit?"
}
```

Response shape:

```json
{
  "success": true,
  "question": "What does the uploaded guide recommend for a relaxed two-day visit?",
  "answer": "Answer generated using the retrieval workflow..."
}
```

### Error responses

Travel-planning failures may return:

```json
{
  "success": false,
  "error": "Error message"
}
```

Endpoints that raise FastAPI `HTTPException` return a `detail` field instead. The frontend API helper handles both formats.

---

## Thread IDs and Saved State

A thread ID identifies a saved graph execution history. It is not a user account or an authentication credential.

| Action | Thread handling |
|---|---|
| Start a separate trip | Generate a new thread ID |
| Resume a paused review | Use the original thread ID |
| Restore the visible browser session | Frontend restores its saved result and thread ID |
| Start another request on the same thread | Backend receives the new input on that saved thread |

Persisted messages alone do not guarantee conversational understanding. The planning prompts must actually receive relevant prior context for follow-ups such as “make that cheaper” to work reliably.

Clearing the browser session does not delete MySQL checkpoints.

---

## Output and Data Handling

### Plain-text presentation

The planning prompts request:

- Short section headings.
- Separate day-by-day sections.
- Readable activity paragraphs.
- Clear cost categories.
- Explicit unavailable-data messages.

The frontend renders these as ordinary interface text rather than displaying raw tool payloads.

Prompt instructions are not a strict output schema. Existing cleanup handles common formatting, but schema-based structured responses are a future improvement.

### MCP result normalization

Some MCP calls return content blocks containing text or JSON.

The backend should:

1. Unwrap content blocks.
2. Decode embedded JSON where applicable.
3. Extract relevant fields.
4. Produce readable text.
5. Preserve limitations rather than fabricating missing values.

Raw MCP metadata and escaped JSON are not intended as user-facing accommodation or weather output.

---

## Capability Boundaries

### Flights

The configured flight agent uses aviation reference tools such as:

```text
list_airports
list_airlines
```

Those tools alone do not establish:

- Live flight availability.
- Flight numbers or operating schedules.
- Seat inventory.
- Current ticket prices.
- Bookable itineraries.

Flight output should distinguish general guidance from verified live information.

### Accommodation

Search results may include hotels, travel articles, or tour packages.

A package price must not be presented as a hotel nightly rate. Search results do not automatically verify room availability, included meals, or amenities.

### Weather

Current conditions and future forecasts are separate capabilities.

If the connected server exposes `get_current_weather` but not `get_forecast`, the application should report that forecast data is unavailable.

Weather for one city should not be presented as representative of an entire multi-city region.

### Budget

Budget output is an estimate, not a quotation.

It should distinguish:

- Per-person and group costs.
- Nightly rates and total accommodation costs.
- Known amounts and assumptions.
- Verified data and approximate planning figures.
- Included and excluded expenses.

---

## RAG Testing

A useful document-grounding test checks both successful retrieval and appropriate handling of missing information.

Suggested procedure:

1. Upload a PDF containing a unique marker.
2. Ask for the marker.
3. Ask for a specific fact from the document.
4. Ask for a calculation supported by documented amounts.
5. Ask for information the document does not contain.
6. Confirm the answer acknowledges missing information.

For the synthetic Amberlake test guide, example questions include:

```text
What is the document's unique retrieval marker?
```

Expected marker:

```text
COPPER-KITE-482
```

```text
Does Willow Rest House include breakfast?
```

Expected answer:

```text
No.
```

```text
What is tomorrow's weather in Amberlake?
```

Expected behavior:

```text
State that the guide contains no weather forecast.
```

The test guide is fictional and must not be used for actual travel decisions.

---

## Troubleshooting

### MySQL connection refused: error 2003 / WinError 10061

Check whether MySQL is running:

```powershell
Get-Service |
    Where-Object { $_.Name -match 'mysql|mariadb' } |
    Format-Table Name, Status, StartType -AutoSize
```

Start the actual installed service from an Administrator PowerShell.

For example, only if its name is `MySQL80`:

```powershell
Start-Service -Name "MySQL80"
```

Test the port configured in `DB_URI`:

```powershell
Test-NetConnection -ComputerName localhost -Port 3306
```

Use the actual configured port if it differs.

### `NotImplementedError` from `aget_tuple`

The synchronous `PyMySQLSaver` must not be used as though it implements asynchronous checkpoint methods.

The current application runs synchronous graph invocation in a worker thread:

```python
result = await asyncio.to_thread(
    travel_graph.invoke,
    initial_state,
    config=config,
)
```

### No synchronous function provided for a node

A synchronous graph invocation cannot directly execute a node registered only as an asynchronous function.

Keep the invocation style and node implementations consistent.

### `NoneType` has no attribute `ainvoke`

A tool lookup returned no match.

Inspect the tool catalog and validate that the requested tool exists before invoking it.

### `coroutine raised StopIteration`

A `next(...)` lookup without a default may have failed to find a tool.

Use an explicit default and handle missing capabilities:

```python
tool = next(
    (item for item in tools if item.name == required_name),
    None,
)
```

### Raw JSON appears in a result tab

Normalize MCP content before assigning the user-facing result field. Do not stringify the raw content-block list directly into the UI.

### A specialist tab is empty

Check:

```text
selected_agents
flight_results
hotel_results
weather_results
budget_results
```

Possible causes include a skipped agent, an empty result, response filtering, or a previously saved browser result.

### Async-context errors

Check imported project modules for event-loop patches such as:

```python
nest_asyncio.apply()
```

The current FastAPI/Uvicorn setup should not depend on nested event-loop patching.

### Native Python extension blocked by Windows

If an import fails with an Application Control policy message, inspect Windows CodeIntegrity logs.

Do not treat a security-policy block as a LangGraph code error or download replacement DLLs from untrusted sources.

### Missing frontend package

Install dependencies inside `frontend`, not the Python virtual environment:

```powershell
cd frontend
npm install
```

### Old output remains after backend changes

The frontend stores its previous displayed result in browser storage.

Start a new trip and generate a fresh response after restarting the backend.

---

## Security and Deployment Notes

This project should be treated as a development application until additional controls are implemented.

Current considerations include:

- The supplied endpoints do not implement user authentication.
- Thread IDs are not an authorization boundary.
- Document uploads are not isolated per user.
- The upload route checks the filename extension and size, not a complete file-security policy.
- The file is read before its size is checked.
- Some endpoints expose exception text.
- Model-based request screening is not a complete safety boundary.
- The guardrail implementation currently permits requests when validation fails.
- Retrieved documents and tool output may contain untrusted instructions.
- The current checkpoint setup uses a shared database connection.
- Concurrency, connection recovery, and multi-worker behavior need testing.
- Request limits, provider timeouts, observability, and retention policies need production hardening.

Do not upload confidential documents to a shared instance without appropriate access controls and data handling.

Keep `.env`, credentials, local virtual environments, and `node_modules` out of version control.

---

## Known Limitations

- Specialist routing is model-driven.
- Specialists execute sequentially.
- Some aviation tools provide reference data rather than live search.
- Forecasts depend on the connected weather server.
- Missing dates and traveler counts are not handled through a dedicated clarification workflow.
- Stored thread history is not automatically included in every agent prompt.
- Revisions do not trigger a second approval cycle.
- The API does not stream token output or live agent progress.
- Plain-text formatting is prompt-guided rather than schema-enforced.
- Shared PDF retrieval does not currently provide per-user document isolation.
- The displayed `llm_calls` value is an application counter, not authoritative provider usage or billing telemetry.
- Generated travel content requires user verification.

---

## Potential Improvements

- Structured itinerary responses with validated schemas.
- Clarification questions before planning when essential details are missing.
- Date-aware, multi-city weather handling.
- Verified flight-search and hotel-availability integrations.
- Source-linked recommendations.
- Per-user authentication and document isolation.
- A repeated review-and-revision approval loop.
- Streaming responses and real execution events.
- More robust database lifecycle and concurrency handling.
- Automated tests for routing, tool normalization, API contracts, and retrieval grounding.
- Reproducible dependency locking and deployment documentation.

---

## Project Scope

RouteMind demonstrates the integration of:

- Multi-agent orchestration.
- External tool discovery and invocation.
- Retrieval-augmented generation.
- Persistent graph execution.
- Human-in-the-loop review.
- A React interface backed by FastAPI.

Its purpose is to make travel research and itinerary drafting easier while clearly separating generated guidance from verified booking information.