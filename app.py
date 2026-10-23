from pathlib import Path
import traceback
import uvicorn
from fastapi import FastAPI, Request, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from backend import run_travel_agent, lifespan
from tools.travel_rag import ingest_pdf_bytes, generate_travel_answer
from exception import (
    TravelAgentException,
    travel_agent_exception_handler
)


class RAGQuestion(BaseModel):
    question: str


class TravelRequest(BaseModel):
    message: str
    thread_id: str | None = None


app = FastAPI(
    title="AI Travel Planning System",
    description="LangGraph Multi-Agent Travel Planner with FastAPI Frontend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_exception_handler(
    TravelAgentException,
    travel_agent_exception_handler
)


class TravelRequest(BaseModel):
    message:str
    thread_id:str|None=None



@app.post("/api/travel")
async def travel_planner(request_data:TravelRequest):
    try:
        user_message=request_data.message.strip()

        if not user_message:
            return JSONResponse(
                status_code=400,
                content={
                    "success":False,
                    "error":"Message cannot be empty."
                }
            )
        result=await run_travel_agent(
            user_input=user_message,
            thread_id=request_data.thread_id
        )

        return JSONResponse(
            content={
                "success":True,
                "thread_id":result["thread_id"],
                "answer":result["answer"],
                "flight_results":result["flight_results"],
                "hotel_results":result["hotel_results"],
                "itinerary":result["itinerary"],
                "llm_calls":result["llm_calls"]
            }
        )
    except Exception as e:
        print("ERROR: ",e)
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success":False,
                "error":str(e)
            }
        )

@app.post("/rag/upload")
async def upload_travel_pdf(file:UploadFile=File(...)):

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="On;y PDF files allowed"
        )

    pdf_bytes= await file.read()

    if len(pdf_bytes)>15*1024*1024: #15 mb

        raise HTTPException(
            status_code=413,
            detail="PDF file cannot exceed 15 MB"
        )

    try:
        chunks_stored=ingest_pdf_bytes(
            pdf_bytes=pdf_bytes,
            filename=file.filename
        )
        return{
            "success": True,
            "filename": file.filename,
            "chunks_stored": chunks_stored,
            "message": "PDF successfully ingested into travel knowledge base."
        }
    except Exception as e:
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=f" PDF ingestion failed:{str(e)}"
        )


@app.post("/rag/ask")
async def ask_travel_questions(request_data: RAGQuestion):

    question=request_data.question.strip()

    if not question:
        return JSONResponse(
            status_code=400,
            content={
                "seccess":False,
                "error":"Question cannot be empty."
            }
        )

    try:
        answer=generate_travel_answer(question)
        return JSONResponse(
            content={
                "success":True,
                "question":question,
                "answer":answer
            }
        )

    except Exception as e:
        print("RAG ERROR:",e)
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success":False,
                "error":str(e)
            }
        )

















@app.get("/health")
async def health_check():
    return{
        "status":"ok",
        "message":"AI travel Planner API is running"
    }


@app.get("/favicon.ico")
async def favicon():
    return JSONResponse(content={})




if __name__=="__main__":
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )
