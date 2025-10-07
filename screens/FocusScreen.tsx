import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TaskSelector from '../components/focus/TaskSelector';
import FocusSession from '../components/focus/FocusSession';
import SessionComplete from '../components/focus/SessionComplete';
import { CloseIcon }  from '../components/icons/Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import FocusGarden from '../components/focus/FocusGarden';

interface FocusScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

type FocusState = 'selecting' | 'session' | 'complete' | 'break';
const plantTypes = ['cactus', 'fern', 'orchid', 'sunflower', 'bonsai'];

const FocusScreen: React.FC<FocusScreenProps> = ({ isOpen, onClose }) => {
  const { tasks, updateTask } = useData();
  const [focusState, setFocusState] = useState<FocusState>('selecting');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentPlant, setCurrentPlant] = useState<string | null>(null);
  const [focusHistory, setFocusHistory] = useLocalStorage< { plantId: number; date: string; plantType: string; duration: number; }[] >('focusHistory', []);

  const todayTasks = tasks.filter(t => t.today && !t.completed && t.duration);

  useEffect(() => {
    if (isOpen) {
      // Reset state when opening
      setFocusState('selecting');
      setSelectedTask(null);
      setCurrentPlant(null);
    }
  }, [isOpen]);

  const handleTaskSelect = (task: Task) => {
    const randomPlant = plantTypes[Math.floor(Math.random() * plantTypes.length)];
    setCurrentPlant(randomPlant);
    setSelectedTask(task);
    setFocusState('session');
  };

  const handleSessionComplete = () => {
    if (selectedTask && selectedTask.duration && currentPlant) {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      setFocusHistory(prevHistory => [...prevHistory, { 
        plantId: Date.now(),
        date: today, 
        duration: selectedTask.duration!,
        plantType: currentPlant,
      }]);
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

      <main className="flex-1 flex flex-col overflow-y-auto">
        {focusState === 'selecting' && (
          <div className="flex flex-col" style={{ paddingTop: `calc(4rem + env(safe-area-inset-top))` }}>
            <FocusGarden history={focusHistory} />
            <TaskSelector tasks={todayTasks} onSelect={handleTaskSelect} />
          </div>
        )}
        {focusState === 'session' && selectedTask && <FocusSession task={selectedTask} onComplete={handleSessionComplete} plantType={currentPlant} />}
        {focusState === 'break' && <FocusSession onComplete={() => setFocusState('selecting')} plantType={null} />}
        {focusState === 'complete' && selectedTask && (
            <SessionComplete 
                task={selectedTask}
                plantType={currentPlant}
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
