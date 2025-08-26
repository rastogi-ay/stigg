import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Task, TaskCreate } from './types/Task';

const API_BASE_URL = 'http://localhost:8000';

function App(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async (): Promise<void> => {
    try {
      const response = await axios.get<Task[]>(`${API_BASE_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const createTask = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const taskData: TaskCreate = {
        title: title.trim(),
        description: description.trim()
      };
      const response = await axios.post<Task>(`${API_BASE_URL}/tasks`, taskData);
      setTasks([...tasks, response.data]);
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (taskId: number, completed: boolean): Promise<void> => {
    try {
      const response = await axios.put<Task>(`${API_BASE_URL}/tasks/${taskId}`, {
        completed: !completed
      });
      setTasks(tasks.map(task => 
        task.id === taskId ? response.data : task
      ));
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (taskId: number): Promise<void> => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Simple Todo List</h1>
      </div>

      <form className="task-form" onSubmit={createTask}>
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Task description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      <div className="task-list">
        {tasks.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            No tasks yet. Add your first task above!
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
              <input
                type="checkbox"
                className="task-checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task.id, task.completed)}
              />
              <div className="task-content">
                <h3 className="task-title">{task.title}</h3>
                {task.description && (
                  <p className="task-description">{task.description}</p>
                )}
              </div>
              <div className="task-actions">
                <button 
                  className="delete-button"
                  onClick={() => deleteTask(task.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
