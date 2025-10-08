import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TaskSelector from '../components/focus/TaskSelector';
import FocusSession from '../components/focus/FocusSession';
import SessionComplete from '../components/focus/SessionComplete';
import useLocalStorage from '../hooks/useLocalStorage';
import FocusGarden from '../components/focus/FocusGarden';
import MainLayout from '../components/layouts/MainLayout';

type FocusState = 'selecting' | 'session' | 'complete' | 'break';
const plantTypes = ['cactus', 'fern', 'orchid', 'sunflower', 'bonsai'];

const FocusScreen: React.FC = () => {
  const { tasks, updateTask } = useData();
  const [focusState, setFocusState] = useState<FocusState>('selecting');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentPlant, setCurrentPlant] = useState<string | null>(null);
  const [focusHistory, setFocusHistory] = useLocalStorage< { plantId: number; date: string; plantType: string; duration: number; }[] >('focusHistory', []);
  const [viewMode, setViewMode] = useState<'session' | 'garden'>('session');

  const todayTasks = tasks.filter(t => t.today && !t.completed && t.duration);

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
    setSelectedTask(null);
    setFocusState('selecting');
    setViewMode('session');
  };
  
  const handleStartBreak = () => {
    setSelectedTask(null);
    setFocusState('break');
  };

  const handleNextTask = () => {
    setSelectedTask(null);
    setFocusState('selecting');
    setViewMode('session');
  };

  const handleGoBackToSelection = () => {
    setSelectedTask(null);
    setFocusState('selecting');
    setViewMode('session');
  };

  const inSelectionMode = focusState === 'selecting';
  
  return (
    <MainLayout>
        <div className="absolute inset-0 flex flex-col">
            <header
                className="px-6 pt-6 pb-4 flex justify-center items-center flex-shrink-0"
                style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
            >
                {inSelectionMode ? (
                    <div className="grid grid-cols-2 bg-gray-200 rounded-lg p-1 w-full max-w-48">
                        <button
                            onClick={() => setViewMode('session')}
                            className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'session' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                        >
                            Session
                        </button>
                        <button
                            onClick={() => setViewMode('garden')}
                            className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'garden' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                        >
                            Garden
                        </button>
                    </div>
                ) : (
                    <h1 className="text-3xl font-bold text-gray-900">Focus</h1>
                )}
            </header>

            <main className="flex-1 flex flex-col overflow-y-auto pb-24">
                {focusState === 'selecting' && (
                    viewMode === 'session' ? (
                        <TaskSelector tasks={todayTasks} onSelect={handleTaskSelect} />
                    ) : (
                        <FocusGarden history={focusHistory} />
                    )
                )}
                {focusState === 'session' && selectedTask && <FocusSession task={selectedTask} onComplete={handleSessionComplete} plantType={currentPlant} />}
                {focusState === 'break' && <FocusSession onComplete={handleGoBackToSelection} plantType={null} />}
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
    </MainLayout>
  );
};

export default FocusScreen;