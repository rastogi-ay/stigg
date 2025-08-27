from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from stigg.generated import FetchEntitlementQuery
from models import Task, TaskCreate, TaskUpdate

router = APIRouter()

# Database and constants
tasks_db = []
next_id = 1
HARDCODED_CUSTOMER_ID = "ayush-123"

@router.get("/")
def read_root():
    return {"message": "Todo API"}

@router.get("/entitlement/{feature_id}")
async def check_entitlement(feature_id: str):
    # Import here to avoid circular imports
    from stigg import Stigg
    import os
    
    STIGG_SERVER_API_KEY = os.getenv("STIGG_SERVER_API_KEY")
    stigg_client = Stigg.create_async_client(STIGG_SERVER_API_KEY)
    
    try:
        resp = await stigg_client.get_entitlement(FetchEntitlementQuery(**{
            "customerId": HARDCODED_CUSTOMER_ID,
            "featureId": feature_id
        }))
        
        return {
            "customerId": HARDCODED_CUSTOMER_ID,
            "featureId": feature_id,
            "isGranted": resp.entitlement.is_granted,
            "hasAccess": resp.entitlement.has_access
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch entitlement: {str(e)}")

# resp = client.get_entitlement(FetchEntitlementQuery(
#   **{
#     "customer_id": "customer-demo-id",
#     "feature_id": "feature-test" 
#   }
# ))

# if resp.entitlement.is_granted:
#   # customer has access to the feature
#   pass
# else:
#   # access denied
#   pass


@router.get("/tasks", response_model=List[Task])
def get_tasks():
    return tasks_db

@router.post("/tasks", response_model=Task)
def create_task(task: TaskCreate):
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
    return new_task

@router.put("/tasks/{task_id}", response_model=Task)
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

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    global tasks_db
    tasks_db = [task for task in tasks_db if task.id != task_id]
    return {"message": "Task deleted"}
