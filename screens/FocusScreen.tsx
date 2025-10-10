import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TaskSelector from '../components/focus/TaskSelector';
import FocusSession from '../components/focus/FocusSession';
import SessionComplete from '../components/focus/SessionComplete';
import FocusGarden from '../components/focus/FocusGarden';
import MainLayout from '../components/layouts/MainLayout';
import { InfoIcon, ChevronLeftIcon } from '../components/icons/Icons';
// FIX: The original file had a corrupted import statement. Assuming it was for react-router-dom.
import { Link, useNavigate } from 'react-router-dom';

type SessionState = 'selecting' | 'focusing' | 'complete' | 'garden';

// List of available plant types for the garden
const plantTypes = ['cactus', 'fern', 'flower', 'tree'];

// FIX: The original file was corrupted and missing the component definition and default export.
// Reconstructing the component based on its imports and expected functionality.
const FocusScreen: React.FC = () => {
    const { tasks, addFocusSession, focusHistory, updateTask } = useData();
    const navigate = useNavigate();
    const [sessionState, setSessionState] = useState<SessionState>('selecting');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [currentPlant, setCurrentPlant] = useState<string | null>(null);

    const focusableTasks = useMemo(() => {
        return tasks.filter(task => task.today && !task.completed && task.duration && task.duration > 0);
    }, [tasks]);

    const handleSelectTask = (task: Task) => {
        setSelectedTask(task);
        const randomPlant = plantTypes[Math.floor(Math.random() * plantTypes.length)];
        setCurrentPlant(randomPlant);
        setSessionState('focusing');
    };

    const handleSessionComplete = () => {
        if (selectedTask && currentPlant && selectedTask.id !== 'break') {
            addFocusSession({
                plant_id: Date.now(),
                session_date: new Date().toISOString().split('T')[0],
                plant_type: currentPlant,
                duration: selectedTask.duration || 0,
            });
        }
        setSessionState('complete');
    };

    const handleMarkComplete = () => {
        if (selectedTask) {
            updateTask(selectedTask.id, { completed: true });
        }
        setSelectedTask(null);
        setSessionState('selecting');
    };

    const handleStartBreak = () => {
        setSelectedTask({
            id: 'break',
            title: 'Break Time',
            duration: 5,
            category: 'System',
            completed: false,
        } as Task); // Cast as Task to satisfy type, knowing it's a temporary break object
        setCurrentPlant(null); // No plant for break time
        setSessionState('focusing');
    };

    const handleNextTask = () => {
        setSelectedTask(null);
        setSessionState('selecting');
    };
    
    const handleExitFocus = () => {
        setSelectedTask(null);
        setSessionState('selecting');
    };

    const renderContent = () => {
        switch (sessionState) {
            case 'focusing':
                return <FocusSession task={selectedTask!} onComplete={handleSessionComplete} plantType={currentPlant} />;
            case 'complete':
                return <SessionComplete task={selectedTask!} plantType={currentPlant} onMarkComplete={handleMarkComplete} onStartBreak={handleStartBreak} onNextTask={handleNextTask} />;
            case 'garden':
                return <FocusGarden history={focusHistory} />;
            case 'selecting':
            default:
                return <TaskSelector tasks={focusableTasks} onSelect={handleSelectTask} />;
        }
    };

    return (
        <MainLayout hideNavBar>
            <div className="absolute inset-0 flex flex-col bg-[var(--color-background-primary)]">
                <header
                    className="px-4 pt-6 pb-4 grid grid-cols-3 items-center flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)] sticky top-0 z-10"
                    style={{ paddingTop: `calc(1.5rem + var(--safe-area-inset-top, 0px))` }}
                >
                    <div className="flex justify-start">
                         <button onClick={sessionState === 'focusing' || sessionState === 'complete' ? handleExitFocus : () => navigate(-1)} className="p-2 -ml-2 text-[var(--color-text-secondary)]">
                            <ChevronLeftIcon />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        <div className="grid grid-cols-2 bg-[var(--color-surface-container-low)] rounded-lg p-1 w-full max-w-48">
                            <button onClick={() => setSessionState('selecting')} className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${sessionState !== 'garden' ? 'bg-[var(--color-surface-container)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}>Focus</button>
                            <button onClick={() => setSessionState('garden')} className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${sessionState === 'garden' ? 'bg-[var(--color-surface-container)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}>Garden</button>
                        </div>
                    </div>
                     <div className="flex justify-end">
                        <Link to="/settings/about" className="p-2 text-[var(--color-text-secondary)]">
                            <InfoIcon className="w-6 h-6" />
                        </Link>
                    </div>
                </header>
                <main className="flex-grow overflow-y-auto">
                    {renderContent()}
                </main>
            </div>
        </MainLayout>
    );
};

export default FocusScreen;
