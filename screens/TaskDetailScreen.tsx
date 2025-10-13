import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditButtonIcon, DeleteButtonIcon, FlagIcon, ListCheckIcon, TagIcon, CalendarIcon, StarIcon, ClockIcon, LockIcon, BellIcon, DurationIcon } from '../components/icons/Icons';
import type { Task } from '../data/mockData';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { useData } from '../contexts/DataContext';

interface TaskDetailScreenProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: () => void;
}

const formatChipDate = (dateString?: string): string => {
    if (!dateString) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dateString.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 3) return `In ${diffDays} days`;
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1 && diffDays >= -3) return `${Math.abs(diffDays)} days ago`;
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

const reminderOptions = [
    { label: 'On time', value: 0 },
    { label: '5 minutes before', value: 5 },
    { label: '10 minutes before', value: 10 },
    { label: '15 minutes before', value: 15 },
    { label: '30 minutes before', value: 30 },
    { label: '1 hour before', value: 60 },
];

const getReminderLabel = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '';
    const option = reminderOptions.find(o => o.value === value);
    return option ? option.label : '';
};

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ isOpen, onClose, task, onEdit }) => {
    const { deleteTask } = useData();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const handleConfirmDelete = async () => {
        if (!task) return;
        try {
            await deleteTask(task.id);
            setIsDeleteConfirmOpen(false);
            onClose(); 
        } catch (error) {
            console.error("Failed to delete task:", error);
            alert("Could not delete the task. Please try again.");
            setIsDeleteConfirmOpen(false);
        }
    };

    const EmptySquareCheckIcon = () => (
        <svg className="w-6 h-6 text-[var(--color-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="4" y="4" width="16" height="16" rx="4" />
        </svg>
    );

    const SubtaskCircleIcon = ({completed}: {completed: boolean}) => (
        <svg className={`w-5 h-5 transition-colors ${completed ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-tertiary)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {completed ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> : <circle cx="12" cy="12" r="8" />}
        </svg>
    );

    const todayStr = new Date().toISOString().substring(0, 10);

    return createPortal(
        <>
            <div className={`fixed inset-0 z-50 grid place-items-center p-4 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
                <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />
                
                <div className={`w-full max-w-sm bg-transparent transition-transform duration-300 ease-out transform ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} style={{ paddingBottom: `env(safe-area-inset-bottom)` }}>
                    <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow p-4 overflow-y-auto max-h-[75vh]">
                        <div className="flex items-start gap-3">
                            <div className="pt-1"><EmptySquareCheckIcon /></div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="flex-grow w-full text-base font-semibold text-[var(--color-text-primary)]">{task?.title || 'No Title'}</p>
                                     <div className="flex items-start pt-1 shrink-0">
                                        {task?.important && (
                                            <div className="flex flex-col items-center w-[50px]">
                                                <div className="w-9 h-9 flex items-center justify-center rounded-full text-red-600 bg-red-100 dark:bg-red-900/30">
                                                    <FlagIcon className="w-5 h-5" />
                                                </div>
                                                <span className="text-[10px] font-medium text-center text-[var(--color-text-tertiary)] mt-1 leading-tight">Important</span>
                                            </div>
                                        )}
                                        {task?.today && (
                                            <div className="flex flex-col items-center w-[50px]">
                                                <div className="w-9 h-9 flex items-center justify-center rounded-full text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30">
                                                    <StarIcon className="w-5 h-5" />
                                                </div>
                                                <span className="text-[10px] font-medium text-center text-[var(--color-text-tertiary)] mt-1 leading-tight">Today</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {task?.notes && <p className="w-full text-sm mt-1 text-[var(--color-text-secondary)] whitespace-pre-wrap">{task.notes}</p>}
                                
                                {task?.subtasks && task.subtasks.length > 0 && (
                                    <div className="mt-2 space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                                        {task.subtasks.map((sub) => (
                                            <div key={sub.id} className="flex items-start gap-2 group">
                                                <SubtaskCircleIcon completed={sub.completed} />
                                                <p className={`text-sm ${sub.completed ? 'text-[var(--color-text-tertiary)] line-through' : 'text-[var(--color-text-secondary)]'}`}>{sub.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                             <div className="flex items-center gap-2 flex-wrap min-w-0 mb-3 min-h-[1.75rem]">
                                {task?.duration && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] text-xs font-semibold">
                                        <DurationIcon className="w-3.5 h-3.5" />
                                        <span>{task.duration} min</span>
                                    </div>
                                )}
                                {task?.reminder !== null && task?.reminder !== undefined && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-semibold">
                                        <BellIcon className="w-3.5 h-3.5" />
                                        <span className="truncate">{getReminderLabel(task.reminder)}</span>
                                    </div>
                                )}
                                {task?.startTime && task.type === 'Fixed' && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        <span className="truncate">Starts {formatChipDate(task.startDate || todayStr)}, {new Date('1970-01-01T' + task.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                    </div>
                                )}
                                {task?.dueDate && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] text-xs font-semibold"><span>Due {formatChipDate(task.dueDate)}</span></div>)}
                                {task?.category && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold"><span>{task.category}</span></div>)}
                             </div>
                             <div className="flex items-start justify-around">
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <div title={task?.type} className={`p-2 rounded-full ${task?.type === 'Fixed' ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-container-low)]'}`}><LockIcon className="w-5 h-5" /></div>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Fixed</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <div title="Duration" className={`p-2 rounded-full ${(task?.duration) ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-container-low)]'}`}><DurationIcon className="w-5 h-5" /></div>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Duration</span>
                                </div>
                                {task?.type === 'Fixed' && (
                                    <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                        <div title="Start Time" className={`p-2 rounded-full ${task?.startTime ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-container-low)]'}`}><ClockIcon className="w-5 h-5" /></div>
                                        <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Start</span>
                                    </div>
                                )}
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <div title="Due Date" className={`p-2 rounded-full ${task?.dueDate ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-container-low)]'}`}><CalendarIcon className="w-5 h-5" /></div>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Due</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <div title="List" className={`p-2 rounded-full ${task?.category ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-container-low)]'}`}><TagIcon className="w-5 h-5" /></div>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">List</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <div title="Subtasks" className={`p-2 rounded-full ${(task?.subtasks?.length || 0) > 0 ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-container-low)]'}`}><ListCheckIcon className="w-5 h-5" /></div>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Subs</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <div title="Reminder" className={`p-2 rounded-full ${task?.reminder !== null && task?.reminder !== undefined ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' : 'text-[var(--color-text-secondary)] bg-[var(--color-surface-container-low)]'}`}><BellIcon className="w-5 h-5" /></div>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Alert</span>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={() => setIsDeleteConfirmOpen(true)} className="px-4 py-2.5 bg-[var(--color-surface-container-low)] text-[var(--color-functional-red)] font-semibold rounded-xl hover:bg-[var(--color-border)] transition-colors w-full flex items-center justify-center gap-2">
                            <DeleteButtonIcon />
                            <span>Delete</span>
                        </button>
                        <button onClick={onEdit} className="px-4 py-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors w-full flex items-center justify-center gap-2">
                            <EditButtonIcon />
                            <span>Edit Task</span>
                        </button>
                    </div>
                </div>
            </div>
            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Task?"
                message="Are you sure you want to permanently delete this task? This action cannot be undone."
                confirmText="Delete"
            />
        </>,
        document.body
    );
};

export default TaskDetailScreen;