from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from stigg import Stigg
from stigg.generated import ProvisionCustomerInput
from routes import router

load_dotenv()

STIGG_SERVER_API_KEY = os.getenv("STIGG_SERVER_API_KEY")
CUSTOMER_ID = os.getenv("CUSTOMER_ID")
if STIGG_SERVER_API_KEY is None or CUSTOMER_ID is None:
    raise RuntimeError("Missing environment variables: STIGG_SERVER_API_KEY, CUSTOMER_ID")
stigg_client = Stigg.create_async_client(STIGG_SERVER_API_KEY)

# on startup of the app, provision the hardcoded customer to Stigg
CUSTOMER_NAME = "Ayush Rastogi"
FREE_PLAN_ID = "plan-free"
async def provision_hardcoded_customer():
    try:
        provision_input = ProvisionCustomerInput(**{
            "refId": CUSTOMER_ID,
            "name": CUSTOMER_NAME,
            "subscriptionParams": {
                "planId": FREE_PLAN_ID,
            },
        })
        
        result = await stigg_client.provision_customer(provision_input)
        print(f"Customer provisioned: {result.provision_customer.customer.id}")
    except Exception as e:
        print(f"Error provisioning customer: {e}")
        return None

# call the async provision customer route on app startup (no clean-up needed)
@asynccontextmanager
async def lifespan(app: FastAPI):
    await provision_hardcoded_customer()
    yield

# create the app, represents an API for the to-do list
app = FastAPI(title="Todo API", lifespan=lifespan)

# add basic middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# add router (see routes.py for routes)
app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
