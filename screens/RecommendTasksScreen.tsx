import React, { useEffect } from 'react';
import {
    TrashIcon,
    RegenerateIcon,
    PlusCircleIcon,
} from '../components/icons/Icons';
import { Task } from '../data/mockData';

interface RecommendTasksScreenProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: (Task & { reason: string })[];
  // FIX: Changed taskId to allow string for temporary items
  onAddTaskToToday: (taskId: number | string) => void;
  listInfoMap: Map<string, { icon: string; color: string }>;
}

const colorVariants = {
    green: { bg: 'bg-green-100 dark:bg-green-900/30' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30' },
};


const RecommendTasksScreen: React.FC<RecommendTasksScreenProps> = ({ isOpen, onClose, tasks, onAddTaskToToday, listInfoMap }) => {
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
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Sheet */}
      <div 
        className={`w-full bg-[var(--color-surface-container)] rounded-t-3xl modal-shadow transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'} flex flex-col max-h-[80vh]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recommend-title"
      >
        {/* Header */}
        <div className="pt-3 px-4 pb-3 border-b border-[var(--color-border)] flex-shrink-0">
          <div className="w-8 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3" />
          <div className="flex justify-between items-center h-8">
            <button className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><TrashIcon /></button>
            <h2 id="recommend-title" className="text-base font-bold text-[var(--color-text-primary)]">Recommend Tasks</h2>
            <button className="p-1 text-[var(--color-primary-500)] hover:opacity-80"><RegenerateIcon /></button>
          </div>
        </div>
        
        {/* Content */}
        <div
          className="p-4 space-y-3 pb-24 overflow-y-auto"
          style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
        >
          {tasks.length > 0 ? (
              tasks.map(task => {
                const listInfo = listInfoMap.get(task.category) || { icon: '💼', color: 'blue' };
                const colors = colorVariants[listInfo.color as keyof typeof colorVariants] || colorVariants.blue;
                return (
                    <div key={task.id} className="bg-[var(--color-surface-container-low)] p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full ${colors.bg}`}>
                            <span className="text-xl">{listInfo.icon}</span>
                        </div>
                        <div>
                        <p className="font-semibold text-sm text-[var(--color-text-primary)]">{task.title}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">{task.reason}</p>
                        </div>
                    </div>
                    <button onClick={() => handleAdd(task.id)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/40 p-1.5 rounded-full">
                        <PlusCircleIcon />
                    </button>
                    </div>
                )
              })
          ) : (
             <div className="text-center py-8 text-[var(--color-text-secondary)]">
                <p>No recommendations for now!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendTasksScreen;