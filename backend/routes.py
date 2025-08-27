from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from models import Task, TaskCreate, TaskUpdate

# database to track tasks and their information
tasks_db = []
next_id = 1

router = APIRouter()

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
