import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Task, TaskCreate } from './Task';
import { useStiggContext } from '@stigg/react-sdk';

const API_BASE_URL = 'http://localhost:8000';

const FEATURE_IDS = {
  DESCRIPTION_LIMIT: "feature-description-char-limit",
  DARK_MODE: "feature-dark-mode",
  HOURLY_TASK_LIMIT: "feature-task-hourly-limit",
  TOTAL_TASK_LIMIT: "feature-task-total-limit-3",
} as const;

const DESCRIPTION_LIMIT_FALLBACK = 50;
const DARK_MODE_FALLBACK = false;
const HOURLY_TASK_LIMIT_FALLBACK = 5;
const TOTAL_TASK_LIMIT_FALLBACK = 10;

function App() {
  const { stigg } = useStiggContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);
  const [hourlyTaskCount, setHourlyTaskCount] = useState<number>(0);
  const [totalTaskCount, setTotalTaskCount] = useState<number>(0);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallType, setPaywallType] = useState<'hourly' | 'total'>('hourly');

  // ------------ Fetching feature information depending on plan subscription ------------
  // 1. Character limit on task description
  const descriptionMaxLength = 
    stigg.getNumericEntitlement({ featureId: FEATURE_IDS.DESCRIPTION_LIMIT }).value ?? DESCRIPTION_LIMIT_FALLBACK;
  // 2. Ability to toggle dark mode
  const canUpdateDarkMode = 
    stigg.getBooleanEntitlement({ featureId: FEATURE_IDS.DARK_MODE }).hasAccess ?? DARK_MODE_FALLBACK;
  // 3. Hourly limit on created tasks
  const stiggHourlyTaskLimit = stigg.getMeteredEntitlement({ featureId: FEATURE_IDS.HOURLY_TASK_LIMIT });
  const hourlyTaskLimit = stiggHourlyTaskLimit.usageLimit ?? HOURLY_TASK_LIMIT_FALLBACK;
  // 4. Limit on total number of created tasks
  const stiggTotalTaskLimit = stigg.getMeteredEntitlement({ featureId: FEATURE_IDS.TOTAL_TASK_LIMIT });
  const totalTaskLimit = stiggTotalTaskLimit.usageLimit ?? TOTAL_TASK_LIMIT_FALLBACK;

  useEffect(() => {
    fetchTasks();
    setHourlyTaskCount(stiggHourlyTaskLimit.currentUsage); // set the current hourly task count if user "logs out"
    setTotalTaskCount(stiggTotalTaskLimit.currentUsage); // set the current total task count if user "logs out"
  }, [stiggHourlyTaskLimit.currentUsage, stiggTotalTaskLimit.currentUsage]);

  useEffect(() => {
    if (darkModeEnabled) {
      document.body.style.backgroundColor = '#1a1a1a';
    } else {
      document.body.style.backgroundColor = '#f5f5f5';
    }
  }, [darkModeEnabled]);

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

    // check if user has reached their hourly task limit; if so, show paywall
    if (hourlyTaskCount >= hourlyTaskLimit) {
      setPaywallType('hourly');
      setShowPaywall(true);
      return;
    }

    // check if user has reached their total task limit; if so, show paywall
    if (totalTaskCount >= totalTaskLimit) {
      setPaywallType('total');
      setShowPaywall(true);
      return;
    }

    try {
      const taskData: TaskCreate = {
        title: title.trim(),
        description: description.trim()
      };
      // store task in DB, and report to Stigg that a task was created (both usage and event)
      const response = await axios.post<Task>(`${API_BASE_URL}/tasks`, taskData);

      setTasks([...tasks, response.data]);
      setHourlyTaskCount(hourlyTaskCount + 1);
      setTotalTaskCount(totalTaskCount + 1);
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error creating task:', error);
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
    <div className={`container ${darkModeEnabled ? 'dark' : ''}`}>
      <div className="header">
        <h1>Simple Todo List</h1>
        <button 
          className="dark-mode-toggle"
          onClick={() => setDarkModeEnabled(!darkModeEnabled)}
          disabled={!canUpdateDarkMode} // button is disabled if user is not allowed to update dark mode
        >
          {darkModeEnabled ? '☀️' : '🌙'}
        </button>
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
          maxLength={descriptionMaxLength} // user input is limited by config. feature in Stigg
        />
        <div style={{ 
          fontSize: '14px', 
          textAlign: 'right', 
          marginTop: '5px',
          color: description.length >= (descriptionMaxLength) ? 'red' : '#666'
        }}>
          {description.length}/{descriptionMaxLength} characters
        </div>
        <div style={{ 
          fontSize: '14px', 
          textAlign: 'right', 
          marginTop: '10px',
          color: '#666'
        }}>
          Hourly Task Limit: {hourlyTaskCount}/{hourlyTaskLimit}
        </div>
        <div style={{ 
          fontSize: '14px', 
          textAlign: 'right', 
          marginTop: '5px',
          color: '#666'
        }}>
          Total Task Limit: {totalTaskCount}/{totalTaskLimit}
        </div>
        <button type="submit">
          Add Task
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

      {showPaywall && (
        <div className="paywall-overlay">
          <div className="paywall-modal">
            {paywallType === 'hourly' ? (
              <>
                <h2 className="paywall-title">⏰ Hourly Limit Reached!</h2>
                <p>You've created <strong>{hourlyTaskCount}/{hourlyTaskLimit}</strong> tasks this hour.</p>
                <p>
                  Wait until <strong>
                    {stiggHourlyTaskLimit.usagePeriodEnd 
                      ? new Date(stiggHourlyTaskLimit.usagePeriodEnd).toLocaleTimeString() 
                      : 'next reset'
                    }
                  </strong> for a reset
                </p>
              </>
            ) : (
              <>
                <h2 className="paywall-title">🚫 Total Limit Reached!</h2>
                <p>You've created <strong>{totalTaskCount}/{totalTaskLimit}</strong> total tasks.</p>
                <p>
                  <strong>This limit does not reset.</strong> You'll need to upgrade to create more tasks.
                </p>
              </>
            )}
            <button className="paywall-upgrade-btn">
              🚀 UPGRADE NOW
            </button>
            <button 
              className="paywall-close-btn"
              onClick={() => setShowPaywall(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
