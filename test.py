import asyncio
from tools.mcp_client import get_all_tools



if __name__=="__main__":
    # asyncio.run(tavily_mcp_search("latest news about AI"))
    asyncio.run(get_all_tools())