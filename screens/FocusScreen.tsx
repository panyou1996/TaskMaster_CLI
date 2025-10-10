import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TaskSelector from '../components/focus/TaskSelector';
import FocusSession from '../components/focus/FocusSession';
import SessionComplete from '../components/focus/SessionComplete';
import FocusGarden from '../components/focus/FocusGarden';
import MainLayout from '../components/layouts/MainLayout';
import { InfoIcon, ChevronLeftIcon } from '../components/icons/Icons';
import { Link } from 'react-router-dom';

type FocusState = 'selecting' | 'session' | 'complete' | 'break';
const plantTypes = ['cactus', 'fern', 'orchid', 'sunflower', 'bonsai'];

const FocusScreen: React.FC = () => {
  const { tasks, updateTask, focusHistory, addFocusSession, profile } = useData();
  const [focusState, setFocusState] = useState<FocusState>('selecting');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentPlant, setCurrentPlant] = useState<string | null>(null);
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
      addFocusSession({
        plant_id: Date.now(),
        session_date: today,
        duration: selectedTask.duration!,
        plant_type: currentPlant,
      });
    }
    setFocusState('complete');
  };
  
  const handleMarkComplete = () => {
    if (selectedTask) {
      updateTask(selectedTask.id, { 
        completed: true,
      });
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

  if (!profile) {
      return null;
  }
  
  return (
    <MainLayout>
        <div className="absolute inset-0 flex flex-col">
            <header
                className="px-6 pt-6 pb-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)]"
                style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
            >
                <div className="flex justify-start">
                    <Link to="/today" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] p-2 -m-2" aria-label="Back to Today">
                        <ChevronLeftIcon />
                    </Link>
                </div>
                <div className="flex justify-center">
                    {inSelectionMode ? (
                        <div className="grid grid-cols-2 bg-[var(--color-surface-container-low)] rounded-lg p-1 w-full max-w-48">
                            <button
                                onClick={() => setViewMode('session')}
                                className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'session' ? 'bg-[var(--color-surface-container)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
                            >
                                Session
                            </button>
                            <button
                                onClick={() => setViewMode('garden')}
                                className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'garden' ? 'bg-[var(--color-surface-container)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
                            >
                                Garden
                            </button>
                        </div>
                    ) : (
                        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Focus</h1>
                    )}
                </div>
                 <div className="flex justify-end">
                    <button className="text-[var(--color-text-secondary)] p-1" aria-label="Focus mode information">
                        <InfoIcon className="w-6 h-6" />
                    </button>
                </div>
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