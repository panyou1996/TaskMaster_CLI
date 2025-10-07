import React from 'react';
import { Task } from '../../data/mockData';

interface TaskSelectorProps {
  tasks: Task[];
  onSelect: (task: Task) => void;
}

const TaskSelector: React.FC<TaskSelectorProps> = ({ tasks, onSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6" style={{ paddingTop: `calc(4rem + env(safe-area-inset-top))` }}>
      <h1 className="text-3xl font-bold text-gray-800">Choose a task to focus on</h1>
      <p className="text-gray-500 mt-2 mb-8">Only tasks for today with a duration will be shown.</p>
      
      <div className="w-full max-w-md overflow-y-auto">
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map(task => (
              <button 
                key={task.id}
                onClick={() => onSelect(task)}
                className="w-full text-left bg-white p-4 rounded-xl card-shadow flex justify-between items-center hover:bg-gray-50 transition-colors animate-card-fade-in"
              >
                <div>
                  <p className="font-semibold text-gray-800">{task.title}</p>
                  <p className="text-sm text-gray-500">{task.category}</p>
                </div>
                <div className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                  {task.duration} min
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 px-4 bg-gray-100 rounded-xl">
            <p className="font-semibold text-gray-700">No tasks to focus on.</p>
            <p className="text-sm text-gray-500 mt-1">Add tasks to your "Today" list and set a duration for them.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskSelector;
