from fastapi import Request
from fastapi.responses import JSONResponse


class TravelAgentException(Exception):
    pass


async def travel_agent_exception_handler(
    request: Request,
    exc: TravelAgentException
):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Travel planning failed."
        }
    )