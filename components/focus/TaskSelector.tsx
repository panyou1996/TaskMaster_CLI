import React from 'react';
import { Task } from '../../data/mockData';

interface TaskSelectorProps {
  tasks: Task[];
  onSelect: (task: Task) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ tasks, onSelect }) => {
  return (
    <div className="flex flex-col items-center w-full p-6">
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">Start a New Session</h2>
      
      <div className="w-full max-w-md">
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map(task => (
              <button 
                key={task.id}
                onClick={() => onSelect(task)}
                className="w-full text-left bg-[var(--color-surface-container)] p-4 rounded-xl card-shadow flex justify-between items-center hover:bg-[var(--color-surface-container-low)] transition-colors animate-card-fade-in"
              >
                <div>
                  <p className="font-semibold text-[var(--color-text-primary)]">{task.title}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">{task.category}</p>
                </div>
                <div className="px-3 py-1 bg-[var(--color-surface-container-low)] rounded-full text-sm font-medium text-[var(--color-text-secondary)]">
                  {task.duration} min
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-[var(--color-surface-container)] rounded-xl card-shadow">
            <p className="font-semibold text-[var(--color-text-secondary)]">No tasks to focus on.</p>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">Add tasks to your "Today" list and set a duration for them.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSelector;