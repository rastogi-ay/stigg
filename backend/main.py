from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(title="Todo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Task(BaseModel):
    id: int
    title: str
    description: str
    completed: bool = False
    created_at: datetime

class TaskCreate(BaseModel):
    title: str
    description: str

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None

tasks_db = []
next_id = 1
HARDCODED_USER = "user123"

@app.get("/")
def read_root():
    return {"message": "Todo API"}

@app.get("/tasks", response_model=List[Task])
def get_tasks():
    return tasks_db

@app.post("/tasks", response_model=Task)
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
