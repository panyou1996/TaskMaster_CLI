
import React from 'react';
import { Task } from '../../data/mockData';

interface TaskSelectorProps {
  tasks: Task[];
  onSelect: (task: Task) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ tasks, onSelect }) => {
  return (
    <div className="flex flex-col items-center w-full p-6">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3">Start a New Session</h2>
      
      <div className="w-full max-w-md">
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map(task => (
              <button 
                key={task.id}
                onClick={() => onSelect(task)}
                className="w-full text-left bg-white dark:bg-gray-800 p-4 rounded-xl card-shadow flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors animate-card-fade-in"
              >
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{task.category}</p>
                </div>
                <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                  {task.duration} min
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-white dark:bg-gray-800 rounded-xl card-shadow">
            <p className="font-semibold text-gray-700 dark:text-gray-300">No tasks to focus on.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Add tasks to your "Today" list and set a duration for them.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSelector;