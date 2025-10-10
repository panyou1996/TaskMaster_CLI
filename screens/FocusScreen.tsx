import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TaskSelector from '../components/focus/TaskSelector';
import FocusSession from '../components/focus/FocusSession';
import SessionComplete from '../components/focus/SessionComplete';
import FocusGarden from '../components/focus/FocusGarden';
import MainLayout from '../components/layouts/MainLayout';
import { ChevronLeftIcon } from '../components/icons/Icons';

type SessionState = 'selecting' | 'focusing' | 'complete';
const plantTypes = ['bonsai', 'cactus', 'fern', 'orchid', 'sunflower'];

const FocusScreen: React.FC = () => {
    const { tasks: allTasks, addFocusSession, updateTask, focusHistory } = useData();
    const [view, setView] = useState<'garden' | 'new_session'>('garden');
    const [sessionState, setSessionState] = useState<SessionState>('selecting');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [plantType, setPlantType] = useState<string | null>(null);

    const focusableTasks = useMemo(() => {
        return allTasks.filter(task => task.today && !task.completed && task.duration && task.duration > 0);
    }, [allTasks]);

    const startSession = (task: Task) => {
        setSelectedTask(task);
        setPlantType(plantTypes[Math.floor(Math.random() * plantTypes.length)]);
        setSessionState('focusing');
    };

    const handleSessionComplete = () => {
        if (selectedTask && plantType && selectedTask.id !== 'break') {
            const sessionData = {
                plant_id: Date.now(),
                session_date: new Date().toISOString().split('T')[0],
                plant_type: plantType,
                duration: selectedTask.duration || 0,
            };
            addFocusSession(sessionData);
        }
        setSessionState('complete');
    };

    const handleMarkComplete = () => {
        if (selectedTask && selectedTask.id !== 'break') {
            updateTask(selectedTask.id, { completed: true });
        }
        resetToGarden();
    };

    const handleStartBreak = () => {
        const breakTask: Task = {
            id: 'break',
            title: 'Break Time',
            duration: 5,
            category: 'Rest',
            completed: false,
        };
        startSession(breakTask);
    };
    
    const resetToSelection = () => {
        setSelectedTask(null);
        setSessionState('selecting');
    };
    
    const resetToGarden = () => {
        resetToSelection();
        setView('garden');
    };

    const renderSessionContent = () => {
        switch (sessionState) {
            case 'selecting':
                return <TaskSelector tasks={focusableTasks} onSelect={startSession} />;
            case 'focusing':
                return <FocusSession task={selectedTask!} onComplete={handleSessionComplete} plantType={plantType} />;
            case 'complete':
                if (!selectedTask) return null;
                // 'break' is not a real task and shouldn't be marked complete
                if (selectedTask.id === 'break') {
                     return <SessionComplete task={selectedTask} plantType={plantType} onMarkComplete={resetToGarden} onStartBreak={handleStartBreak} onNextTask={resetToSelection} isBreak/>;
                }
                return <SessionComplete task={selectedTask} plantType={plantType} onMarkComplete={handleMarkComplete} onStartBreak={handleStartBreak} onNextTask={resetToSelection} />;
            default:
                return null;
        }
    };

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col bg-[var(--color-background-primary)]">
                <header
                    className="px-4 pt-6 pb-4 flex items-center gap-2 flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)] sticky top-0 z-10"
                    style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top, 0px))` }}
                >
                     {view === 'new_session' && (
                        <button onClick={resetToGarden} className="p-2 -ml-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary-500)]">
                            <ChevronLeftIcon />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">{view === 'garden' ? 'Focus Garden' : 'New Session'}</h1>
                </header>
                <main className="flex-grow overflow-y-auto">
                    {view === 'garden' ? (
                        <>
                            <FocusGarden history={focusHistory} />
                            <div className="p-6" style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom, 0px))` }}>
                                <button onClick={() => setView('new_session')} className="w-full bg-[var(--color-primary-500)] text-white font-bold py-3 rounded-xl fab-shadow hover:opacity-90 transition-all">
                                    Start New Focus Session
                                </button>
                            </div>
                        </>
                    ) : (
                        renderSessionContent()
                    )}
                </main>
            </div>
        </MainLayout>
    );
};

// FIX: Add default export for FocusScreen component.
export default FocusScreen;