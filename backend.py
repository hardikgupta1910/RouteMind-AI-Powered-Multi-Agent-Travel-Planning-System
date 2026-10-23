import asyncio
import os
import mysql.connector
from dotenv import load_dotenv
import certifi
load_dotenv()
os.environ["SSL_CERT_FILE"]=certifi.where()
os.environ["REQUEST_CA_BUNDLE"]=certifi.where()
from typing import TypedDict, Annotated
import operator
import uuid
from urllib.parse import urlparse, unquote
import pymysql
from langgraph.graph import StateGraph, START,END
from contextlib import asynccontextmanager
from langgraph.checkpoint.mysql.pymysql import PyMySQLSaver
from urllib.parse import urlparse, unquote
from langchain_core.messages import(
    AnyMessage,
    HumanMessage,
    AIMessage,
    SystemMessage
)
import asyncio
from langchain_groq import ChatGroq
# from tools.tavily_tool import tavily_search
from tools.mcp_test import tavily_mcp_search
from tools.flight_tool import search_flights
from tools.travel_rag import get_travel_context


DB_URI = os.getenv("DB_URI")

if not DB_URI:
    raise ValueError("DB_URI is missing from your .env file")

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )



GROQ_API_KEY=os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please ass it to your .env file")



llm=ChatGroq(
    model="openai/gpt-oss-20b",
    api_key=GROQ_API_KEY
)


class TravelState(TypedDict):
    messages:Annotated[list[AnyMessage],operator.add]
    user_query:str
    flight_results:str
    hotel_results:str
    itinerary:str 
    llm_calls:int



#Fligtyh Agent

def flight_agent(state:TravelState):
    query=state["user_query"]
    flight_data=search_flights(query)

    return{
        "flight_results":flight_data,
        "messages":[
            AIMessage(content="Flight results fetched.")
        ],
        "llm_calls":state.get("llm_calls",0)+1 
    }


#Hotel agent

# async def hotel_agent(state:TravelState):
#     query=f"Best hotels for {state['user_query']}"
#     # hotel_results=tavily_search(query)
#     hotel_results=await tavily_mcp_search(query)

#     return{
#         "hotel_results":hotel_results,
#         "messages":[
#             AIMessage(content="Hotels information fetched.")
#         ],
#         "llm_calls":state.get("llm_calls",0)+1 
#     }

def hotel_agent(state: TravelState):
    query = f"Best hotels for {state['user_query']}"

    hotel_results = asyncio.run(tavily_mcp_search(query))

    return {
        "hotel_results": hotel_results,
        "messages": [
            AIMessage(content="Hotels information fetched.")
        ],
        "llm_calls": state.get("llm_calls", 0) + 1
    }

# Itinerary Agent

def itinerary_agent(state: TravelState):

    query = state["user_query"]

    # Retrieve relevant travel knowledge from Qdrant
    travel_context = get_travel_context(query, limit=3)

    prompt = f"""
Create a complete travel itinerary.

User Query:
{query}

Flight Results:
{state['flight_results']}

Hotel Results:
{state['hotel_results']}

Travel Guide Knowledge Retrieved from Qdrant:
{travel_context}

Instructions:
- Make the itinerary practical, budget-aware and easy to follow.
- Use the retrieved travel-guide knowledge when it is relevant.
- Do not claim that information came from a travel guide
  unless it is present in the retrieved context.
- If the retrieved context does not contain enough information,
  do not invent facts or pretend the guide provided them.
- Consider flight and hotel information when planning the itinerary.
"""

    response = llm.invoke([
        SystemMessage(
            content="You are an expert travel planner. "
            "Use retrieved travel knowledge as supporting context."
        ),
        HumanMessage(content=prompt)
    ])

    return {
        "itinerary": response.content,
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1
    }

def final_agent(state:TravelState):
    final_prompt=f"""

Generate the final travel travel response for the user

User Request:
{state['user_query']}

Flight :
{state['flight_results']}

Hotel :
{state['hotel_results']}

Itinerary:
{state['itinerary']}


Format the final answer beautifully using these sections:
1. Trip summary
2. Flight information
3.Hotel suggestions
4. Day-by-Day itinerary
5.Estimated Budget
6. Final Recommendations

Important
- Be clear and practical.
- mention taht live flight api may not provide ticket prices if pricing is unavailable
- kepp the response useful for real travel planning.

"""


    response=llm.invoke([
        SystemMessage(content="You are a professional AI travel booking assistant."),

        HumanMessage(content=final_prompt)
    ])

    return{
        "itinerary": response.content,
        "messages":[response],
        "llm_calls":state.get("llm_calls",0)+1
    }



# Building graph



graph=StateGraph(TravelState)

graph.add_node("flight_agent",flight_agent)
graph.add_node("hotel_agent",hotel_agent)
graph.add_node("itinerary_agent",itinerary_agent)
graph.add_node("final_agent",final_agent)


#checkpoint

graph.add_edge(START,"flight_agent")
graph.add_edge("flight_agent","hotel_agent")
graph.add_edge("hotel_agent","itinerary_agent")
graph.add_edge("itinerary_agent","final_agent")
graph.add_edge("final_agent", END)




# DB_URI = os.getenv("DB_URI")

# parsed = urlparse(DB_URI)

# conn = pymysql.connect(
#     host=parsed.hostname,
#     port=parsed.port or 3306,
#     user=unquote(parsed.username),
#     password=unquote(parsed.password),
#     database=parsed.path.lstrip("/"),
#     autocommit=True,
# )

# checkpointer = PyMySQLSaver(conn)
# checkpointer.setup()

# travel_graph = graph.compile(checkpointer=checkpointer)


import pymysql
from langgraph.checkpoint.mysql.pymysql import PyMySQLSaver
from urllib.parse import urlparse, unquote


def create_checkpointer():
    parsed = urlparse(DB_URI)

    conn = pymysql.connect(
        host=parsed.hostname,
        port=parsed.port or 3306,
        user=unquote(parsed.username),
        password=unquote(parsed.password),
        database=parsed.path.lstrip("/"),
        autocommit=True,
    )

    checkpointer = PyMySQLSaver(conn)
    checkpointer.setup()

    travel_graph = graph.compile(checkpointer=checkpointer)

    return travel_graph

@asynccontextmanager
async def lifespan(app):
    global travel_graph

    travel_graph = create_checkpointer()

    print("Travel graph initialized with synchronous MySQL checkpointer")

    yield

# Run Travel Agent

# async def run_travel_agent(user_input: str, thread_id: str | None = None):

#     if not thread_id:
#         thread_id = f"user_{uuid.uuid4().hex}"

#     config = {
#         "configurable": {
#             "thread_id": thread_id
#         }
#     }

#     result = await travel_graph.invoke(
#         {
#             "messages": [
#                 HumanMessage(content=user_input)
#             ],
#             "user_query": user_input,
#             "flight_results": "",
#             "hotel_results": "",
#             "itinerary": "",
#             "llm_calls": 0
#         },
#         config=config
#     )

#     final_answer = result["messages"][-1].content

#     return {
#         "thread_id": thread_id,
#         "answer": final_answer,
#         "flight_results": result.get("flight_results", ""),
#         "hotel_results": result.get("hotel_results", ""),
#         "itinerary": result.get("itinerary", ""),
#         "llm_calls": result.get("llm_calls", 0),
#     }





async def run_travel_agent(
    user_input: str,
    thread_id: str | None = None
):
    if not thread_id or thread_id == "string":
        thread_id = f"user_{uuid.uuid4().hex}"

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    initial_state = {
        "messages": [HumanMessage(content=user_input)],
        "user_query": user_input,
        "flight_results": "",
        "hotel_results": "",
        "itinerary": "",
        "llm_calls": 0
    }

    result = await asyncio.to_thread(
        travel_graph.invoke,
        initial_state,
        config
    )

    final_answer = result["messages"][-1].content

    return {
        "thread_id": thread_id,
        "answer": final_answer,
        "flight_results": result.get("flight_results", ""),
        "hotel_results": result.get("hotel_results", ""),
        "itinerary": result.get("itinerary", ""),
        "llm_calls": result.get("llm_calls", 0)
    }