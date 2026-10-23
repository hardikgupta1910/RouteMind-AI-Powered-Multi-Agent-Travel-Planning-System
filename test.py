import asyncio
from tools.mcp_test import get_all_tools,tavily_mcp_search




if __name__=="__main__":
    asyncio.run(tavily_mcp_search("latest news about AI"))