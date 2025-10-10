
import React from 'react';
import { Task } from '../../data/mockData';
import Button from '../common/Button';
import GrowingPlant from './GrowingPlant';

interface SessionCompleteProps {
  task: Task;
  plantType: string | null;
  onMarkComplete: () => void;
  onStartBreak: () => void;
  onNextTask: () => void;
  isBreak?: boolean;
}

const SessionComplete: React.FC<SessionCompleteProps> = ({ task, plantType, onMarkComplete, onStartBreak, onNextTask, isBreak = false }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-[var(--color-surface-container)] animate-page-fade-in">
        <div className="w-32 h-32 mb-6">
            <GrowingPlant plantType={plantType} isGrown={true} />
        </div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Focus Complete!</h1>
        <p className="text-[var(--color-text-secondary)] mt-2">You focused on <span className="font-semibold text-[var(--color-text-primary)]">"{task.title}"</span> for {task.duration} minutes.</p>
        
        <div className="w-full max-w-xs mt-10 space-y-3">
            {!isBreak && (
                <Button variant="primary" onClick={onMarkComplete}>
                    Mark as Complete
                </Button>
            )}
            <Button variant="secondary" onClick={onStartBreak}>
                Start 5 min Break
            </Button>
             <Button variant="secondary" onClick={onNextTask}>
                Choose Next Task
            </Button>
        </div>
    </div>
  );
};

export default SessionComplete;