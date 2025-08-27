from dotenv import load_dotenv
import os
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from datetime import datetime
from stigg import Stigg
from stigg.generated import ProvisionCustomerInput, ReportUsageInput, UsageEventsReportInput
from models import Task, TaskCreate, TaskUpdate

load_dotenv()

STIGG_SERVER_API_KEY = os.getenv("STIGG_SERVER_API_KEY")
CUSTOMER_ID = os.getenv("CUSTOMER_ID")
FREE_PLAN_ID = os.getenv("FREE_PLAN_ID")
if any(x is None for x in [STIGG_SERVER_API_KEY, CUSTOMER_ID, FREE_PLAN_ID]):
    raise RuntimeError("Missing environment variables: STIGG_SERVER_API_KEY, CUSTOMER_ID, FREE_PLAN_ID")
stigg_client = Stigg.create_async_client(STIGG_SERVER_API_KEY)

# database to track tasks and their information
tasks_db = []
next_id = 1

# on startup of the app, provision the hardcoded customer to Stigg
CUSTOMER_NAME = "Ayush Rastogi"
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

# ------------ Routes ------------
@app.get("/tasks", response_model=List[Task])
def get_tasks():
    return tasks_db

@app.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    global next_id
    new_task = Task(
        id=next_id,
        title=task.title,
        description=task.description,
        completed=False,
        created_at=datetime.now()
    )
    tasks_db.append(new_task)
    next_id += 1
    
    # report usage to Stigg (add 1 to tasks created so far)
    try:
        await stigg_client.report_usage(ReportUsageInput(
            **{
                "value": 1,
                "customerId": CUSTOMER_ID,
                "featureId": "feature-task-limit",
            }
        ))
    except Exception as e:
        print(f"Error reporting usage: {e}")
    
    # report task creation event to Stigg for total task limit tracking
    try:
        await stigg_client.report_event(UsageEventsReportInput(
            **{
                "usageEvents": [{
                    "customerId": CUSTOMER_ID,
                    "eventName": "task_created",
                    "idempotencyKey": str(uuid.uuid4())
                }]
            }
        ))
    except Exception as e:
        print(f"Error reporting task event: {e}")
    
    return new_task

@app.put("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, task_update: TaskUpdate):
    for task in tasks_db:
        if task.id == task_id:
            if task_update.title is not None:
                task.title = task_update.title
            if task_update.description is not None:
                task.description = task_update.description
            if task_update.completed is not None:
                task.completed = task_update.completed
            return task
    raise HTTPException(status_code=404, detail="Task not found")

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    global tasks_db
    tasks_db = [task for task in tasks_db if task.id != task_id]
    return {"message": "Task deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
