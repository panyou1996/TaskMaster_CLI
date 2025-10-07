import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TaskSelector from '../components/focus/TaskSelector';
import FocusSession from '../components/focus/FocusSession';
import SessionComplete from '../components/focus/SessionComplete';
import { CloseIcon }  from '../components/icons/Icons';
import useLocalStorage from '../hooks/useLocalStorage';

interface FocusScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

type FocusState = 'selecting' | 'session' | 'complete' | 'break';

const FocusScreen: React.FC<FocusScreenProps> = ({ isOpen, onClose }) => {
  const { tasks, updateTask } = useData();
  const [focusState, setFocusState] = useState<FocusState>('selecting');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [focusHistory, setFocusHistory] = useLocalStorage< { date: string, duration: number }[] >('focusHistory', []);

  const todayTasks = tasks.filter(t => t.today && !t.completed && t.duration);

  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setFocusState('selecting');
      setSelectedTask(null);
    }
  }, [isOpen]);

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setFocusState('session');
  };

  const handleSessionComplete = () => {
    if (selectedTask && selectedTask.duration) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      setFocusHistory(prevHistory => [...prevHistory, { date: today, duration: selectedTask.duration! }]);
    }
    setFocusState('complete');
  };
  
  const handleMarkComplete = () => {
    if (selectedTask) {
      updateTask(selectedTask.id, { completed: true });
    }
    setFocusState('selecting'); // Go back to task selection
  };
  
  const handleStartBreak = () => {
    setFocusState('break');
  };

  const handleNextTask = () => {
    setFocusState('selecting');
  };
  
  const handleClose = () => {
    // TODO: Add confirmation if a session is active
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-background-primary)] flex flex-col animate-page-fade-in">
      <header className="absolute top-0 left-0 right-0 z-10 flex justify-end p-4" style={{ paddingTop: `calc(1rem + env(safe-area-inset-top))` }}>
        <button onClick={handleClose} className="p-2 text-gray-500 bg-black/5 rounded-full hover:bg-black/10">
            <CloseIcon />
        </button>
      </header>

      <main className="flex-1 flex flex-col">
        {focusState === 'selecting' && <TaskSelector tasks={todayTasks} onSelect={handleTaskSelect} />}
        {focusState === 'session' && selectedTask && <FocusSession task={selectedTask} onComplete={handleSessionComplete} />}
        {focusState === 'break' && <FocusSession onComplete={() => setFocusState('selecting')} />}
        {focusState === 'complete' && selectedTask && (
            <SessionComplete 
                task={selectedTask} 
                onMarkComplete={handleMarkComplete}
                onStartBreak={handleStartBreak}
                onNextTask={handleNextTask}
            />
        )}
      </main>
    </div>
  );
};

export default FocusScreen;