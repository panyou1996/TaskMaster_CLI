import React, { useEffect } from 'react';
import {
    TrashIcon,
    RegenerateIcon,
    PlusCircleIcon,
} from '../components/icons/Icons';
import { Task } from '../data/mockData';

interface OverdueTasksScreenProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: (Task & { reason: string })[];
  // FIX: Changed taskId to allow string for temporary items
  onAddTaskToToday: (taskId: number | string) => void;
  listInfoMap: Map<string, { icon: string; color: string }>;
}

const colorVariants = {
    green: { bg: 'bg-green-100' },
    blue: { bg: 'bg-blue-100' },
    pink: { bg: 'bg-pink-100' },
    purple: { bg: 'bg-purple-100' },
    yellow: { bg: 'bg-yellow-100' },
    red: { bg: 'bg-red-100' },
    orange: { bg: 'bg-orange-100' },
};

const OverdueTasksScreen: React.FC<OverdueTasksScreenProps> = ({ isOpen, onClose, tasks, onAddTaskToToday, listInfoMap }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // FIX: Changed taskId to allow string for temporary items
  const handleAdd = (taskId: number | string) => {
    onAddTaskToToday(taskId);
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Sheet */}
      <div 
        className={`w-full bg-white rounded-t-3xl modal-shadow transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'} flex flex-col max-h-[80vh]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overdue-title"
      >
        {/* Header */}
        <div className="pt-3 px-4 pb-3 border-b border-gray-200 flex-shrink-0">
          <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex justify-between items-center h-8">
            <button className="p-1 text-gray-500 hover:text-gray-800"><TrashIcon /></button>
            <h2 id="overdue-title" className="text-base font-bold text-gray-900">Overdue Tasks</h2>
            <button className="p-1 text-blue-600 hover:text-blue-800"><RegenerateIcon /></button>
          </div>
        </div>
        
        {/* Content */}
        <div
          className="p-4 space-y-3 pb-8 overflow-y-auto"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
        >
          {tasks.length > 0 ? (
              tasks.map(task => {
                 const listInfo = listInfoMap.get(task.category) || { icon: '💼', color: 'blue' };
                 const colors = colorVariants[listInfo.color as keyof typeof colorVariants] || colorVariants.blue;
                return (
                    <div key={task.id} className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full ${colors.bg}`}>
                            <span className="text-xl">{listInfo.icon}</span>
                        </div>
                        <div>
                        <p className="font-semibold text-sm text-gray-800">{task.title}</p>
                        <p className="text-xs text-red-500">{task.reason}</p>
                        </div>
                    </div>
                    <button onClick={() => handleAdd(task.id)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded-full">
                        <PlusCircleIcon />
                    </button>
                    </div>
                );
              })
          ) : (
            <div className="text-center py-8 text-gray-500">
                <p>No overdue tasks. Great job!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverdueTasksScreen;