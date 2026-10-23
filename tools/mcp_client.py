import os
import asyncio
import certifi
from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient
 
os.environ["SSL_CERT_FILE"]=certifi.where()
os.environ["REQUEST_CA_BUNDLE"]=certifi.where()

load_dotenv()

TAVILY_API_KEY=os.getenv("TAVILY_API_KEY")
AVIATIONSTACK_API_KEY=os.getenv("AVIATIONSTACK_API_KEY")

client=MultiServerMCPClient(
    {
        "tavily":{
            "transport":"streamable_http",
            "url":f"https://mcp.tavily.com/mcp/?tavilyApiKey={TAVILY_API_KEY}"
        },
        "aviationstack": {
            "transport":"stdio",
            "command": "uvx",
            "args": [
                "aviationstack-mcp"
                ],
            "env": {
                "AVIATION_STACK_API_KEY": AVIATIONSTACK_API_KEY
            }
        }
        
    }
)


search_tool=None
aviation_tools={}

async def initialize_mcp():
    global search_tool
    global aviation_tools
    if search_tool is not None and aviation_tools:
        return

    tools=await client.get_tools()


    for tool in tools:
        print(tool.name)

    search_tool=next(
        tool
        for tool in tools
        if tool.name=="tavily_search"
    )

    aviation_tools=next(
            tool
            for tool in tools
            if tool.name!="tavily_search"
    )



async def get_all_tools():
    tools=await client.get_tools()
    for tool in tools:
        print(tool.name)



async def tavily_mcp_search(query:str):
    await initialize_mcp()
    result=await search_tool.ainvoke(
        {
        "query":query
        }
    )

    return result


async def aviation_mcp_search(tool_name:str, tools_args:dict=None):
    tools=await client.get_tools()

    tool=next(
        t for t in tools
        if t.name==tool_name
    )
    result=await search_tool.ainvoke(
        tools_args or {}
    )

    return result
 