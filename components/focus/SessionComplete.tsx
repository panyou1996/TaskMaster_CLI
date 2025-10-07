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
}

const SessionComplete: React.FC<SessionCompleteProps> = ({ task, plantType, onMarkComplete, onStartBreak, onNextTask }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6 bg-white animate-page-fade-in">
        <div className="w-32 h-32 mb-6">
            <GrowingPlant plantType={plantType} isGrown={true} />
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Focus Complete!</h1>
        <p className="text-gray-500 mt-2">You focused on <span className="font-semibold text-gray-700">"{task.title}"</span> for {task.duration} minutes.</p>
        
        <div className="w-full max-w-xs mt-10 space-y-3">
            <Button variant="primary" onClick={onMarkComplete}>
                Mark as Complete
            </Button>
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
