from tools.tavily_tool import tavily_search
from tools.flight_tool import search_flights
from backend import run_travel_agent
# res=tavily_search("Best hotels in india")

# print(res)


# res=search_flights("plan 7 days japan trip from India")
# print(res)


user=input("enter")
response=run_travel_agent(
    user_input=user,
    thread_id="test_user"
)

print("\n FINAL RESPONSE: \n")
print(response["answer"])

