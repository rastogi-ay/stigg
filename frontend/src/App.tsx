import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Task, TaskCreate } from './Task';
import { 
  BooleanEntitlementFallback,
  MeteredEntitlementFallback,
  NumericEntitlementFallback,
  useStiggContext,
} from '@stigg/react-sdk';

const API_BASE_URL = 'http://localhost:8000';

const FEATURE_IDS = {
  DESCRIPTION_LIMIT: "feature-description-char-limit",
  DARK_MODE: "feature-dark-mode",
  HOURLY_TASK_LIMIT: "feature-task-hourly-limit",
  TOTAL_TASK_LIMIT: "feature-task-total-limit-3",
} as const;

const DESCRIPTION_LIMIT_FALLBACK: NumericEntitlementFallback = {
  hasAccess: true,
  value: 50,
};
const DARK_MODE_FALLBACK: BooleanEntitlementFallback = {
  hasAccess: true,
};
const HOURLY_TASK_LIMIT_FALLBACK: MeteredEntitlementFallback = {
  hasAccess: true,
  usageLimit: 5,
};
const TOTAL_TASK_LIMIT_FALLBACK: MeteredEntitlementFallback = {
  hasAccess: true,
  usageLimit: 10,
};

function App() {
  const { stigg } = useStiggContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [entitlements, setEntitlements] = useState<any>(null);
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(false);
  const [hourlyTaskCount, setHourlyTaskCount] = useState<number>(0);
  const [totalTaskCount, setTotalTaskCount] = useState<number>(0);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [paywallType, setPaywallType] = useState<'hourly' | 'total' | 'revoked'>('hourly');

  // fetch entitlements, meant to be used on App mount
  const fetchEntitlements = useCallback(async () => {
    await stigg.refresh();

    try {
      const result = {
        descriptionLimit: stigg.getNumericEntitlement({
          featureId: FEATURE_IDS.DESCRIPTION_LIMIT,
          options: { fallback: DESCRIPTION_LIMIT_FALLBACK }
        }),
        darkMode: stigg.getBooleanEntitlement({
          featureId: FEATURE_IDS.DARK_MODE,
          options: { fallback: DARK_MODE_FALLBACK }
        }),
        hourlyTaskLimit: stigg.getMeteredEntitlement({
          featureId: FEATURE_IDS.HOURLY_TASK_LIMIT,
          options: { fallback: HOURLY_TASK_LIMIT_FALLBACK }
        }),
        totalTaskLimit: stigg.getMeteredEntitlement({
          featureId: FEATURE_IDS.TOTAL_TASK_LIMIT,
          options: { fallback: TOTAL_TASK_LIMIT_FALLBACK }
        }),
      };

      setEntitlements(result);
      setHourlyTaskCount(result.hourlyTaskLimit.currentUsage);
      setTotalTaskCount(result.totalTaskLimit.currentUsage);
    } catch (err) {
      console.error('Failed to fetch entitlements:', err);
    }
  }, [stigg]);

  // fetch tasks, meant to be used on App mount
  const fetchTasks = async (): Promise<void> => {
    try {
      const response = await axios.get<Task[]>(`${API_BASE_URL}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  // create a task, and report relevant info to Stigg
  const createTask = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) return;
    await stigg.refresh();

    // helper function to check entitlements and show paywall if needed
    const checkEntitlementAccess = (entitlement: any, type: 'hourly' | 'total'): boolean => {
      if (!entitlement.hasAccess) {
        setPaywallType(entitlement.accessDeniedReason === 'Revoked' ? 'revoked' : type);
        setShowPaywall(true);
        return false;
      }
      return true;
    };

    // check entitlements
    const hourlyTaskLimit = stigg.getMeteredEntitlement({
      featureId: FEATURE_IDS.HOURLY_TASK_LIMIT,
      options: { requestedUsage: 1, fallback: HOURLY_TASK_LIMIT_FALLBACK }
    });
    if (!checkEntitlementAccess(hourlyTaskLimit, 'hourly')) return;

    const totalTaskLimit = stigg.getMeteredEntitlement({
      featureId: FEATURE_IDS.TOTAL_TASK_LIMIT,
      options: { requestedUsage: 1, fallback: TOTAL_TASK_LIMIT_FALLBACK }
    });
    if (!checkEntitlementAccess(totalTaskLimit, 'total')) return;
  
    try {
      const taskData: TaskCreate = {
        title: title.trim(),
        description: description.trim()
      };
      const response = await axios.post<Task>(`${API_BASE_URL}/tasks`, taskData);

      setTasks([...tasks, response.data]);
      setHourlyTaskCount(prev => prev + 1);
      setTotalTaskCount(prev => prev + 1);
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // simple method for marking a task as complete / incomplete
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

  // simple method for deleting a task (doesn't affect Stigg metrics)
  const deleteTask = async (taskId: number): Promise<void> => {
    try {
      await axios.delete(`${API_BASE_URL}/tasks/${taskId}`);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  // useEffect for initializng Stigg client, entitlements, and tasks
  useEffect(() => {
    const initialize = async () => {
      await stigg.waitForInitialization();
      fetchEntitlements();
      fetchTasks();
    };
    
    initialize();
  }, [fetchEntitlements, stigg]);

  useEffect(() => {
    if (darkModeEnabled) {
      document.body.style.backgroundColor = '#1a1a1a';
    } else {
      document.body.style.backgroundColor = '#f5f5f5';
    }
  }, [darkModeEnabled]);

  return (
    <div className={`container ${darkModeEnabled ? 'dark' : ''}`}>
      <div className="header">
        <h1>Simple Todo List</h1>
        {entitlements?.darkMode?.hasAccess && (
          <button 
            className="dark-mode-toggle"
            onClick={() => setDarkModeEnabled(!darkModeEnabled)}
          >
            {darkModeEnabled ? '☀️' : '🌙'}
          </button>
        )}
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
          maxLength={entitlements?.descriptionLimit?.value}
        />
        <div style={{ 
          fontSize: '14px', 
          textAlign: 'right', 
          marginTop: '5px',
          color: description.length >= (entitlements?.descriptionLimit?.value) ? 'red' : '#666'
        }}>
          Description Length: {description.length}/{entitlements?.descriptionLimit?.value} characters
        </div>
        <div style={{ 
          fontSize: '14px', 
          textAlign: 'right', 
          marginTop: '10px',
          color: '#666'
        }}>
          {entitlements?.hourlyTaskLimit
            ? `Hourly Task Limit: ${hourlyTaskCount}/${entitlements.hourlyTaskLimit.usageLimit}`
            : 'Hourly Task Limit: N/A'
          }
        </div>
        <div style={{ 
          fontSize: '14px', 
          textAlign: 'right', 
          marginTop: '5px',
          color: '#666'
        }}>
          {entitlements?.totalTaskLimit
            ? `Total Task Limit: ${totalTaskCount}/${entitlements.totalTaskLimit.usageLimit}`
            : 'Total Task Limit: N/A'
          }
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
            {paywallType === 'revoked' ? (
              <>
                <h2 className="paywall-title">🔒 Access Revoked</h2>
                <p>
                  Your access to this feature has been revoked.
                </p>
                <p>
                  Please contact support or upgrade your plan to restore access.
                </p>
              </>
            ) : paywallType === 'hourly' ? (
              <>
                <h2 className="paywall-title">⏰ Hourly Limit Reached!</h2>
                <p>
                  You've created <strong>
                    {entitlements?.hourlyTaskLimit
                      ? `${hourlyTaskCount}/${entitlements.hourlyTaskLimit.usageLimit}`
                      : 'N/A'
                    }
                  </strong> tasks this hour.
                </p>
                <p>
                  Wait until <strong>
                    {entitlements?.hourlyTaskLimit?.usagePeriodEnd
                      ? new Date(entitlements.hourlyTaskLimit.usagePeriodEnd).toLocaleTimeString()
                      : 'next reset'
                    }
                  </strong> for a reset
                </p>
              </>
            ) : (
              <>
                <h2 className="paywall-title">🚫 Total Limit Reached!</h2>
                <p>
                  You've created <strong>
                    {entitlements?.totalTaskLimit 
                      ? `${totalTaskCount}/${entitlements.totalTaskLimit.usageLimit}` 
                      : 'N/A'
                    }
                  </strong> total tasks.
                </p>
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
