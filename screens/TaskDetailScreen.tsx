import React, { useEffect, useState } from 'react';
import { EditButtonIcon, DeleteButtonIcon, FlagIcon, ListCheckIcon, TagIcon, CalendarIcon, StarIcon, ClockIcon, LockIcon, BellIcon } from '../components/icons/Icons';
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
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <rect x="4" y="4" width="16" height="16" rx="4" />
        </svg>
    );

    const SubtaskCircleIcon = ({completed}: {completed: boolean}) => (
        <svg className={`w-5 h-5 transition-colors ${completed ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {completed ? <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> : <circle cx="12" cy="12" r="8" />}
        </svg>
    );

    const todayStr = new Date().toISOString().substring(0, 10);

    return (
        <>
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
                <div className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />
                
                <div className={`w-full max-w-sm bg-transparent transition-transform duration-300 ease-out transform ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} style={{ paddingBottom: `env(safe-area-inset-bottom)` }}>
                    <div className="bg-white rounded-xl card-shadow p-4">
                        <div className="flex items-start gap-3">
                            <div className="pt-1"><EmptySquareCheckIcon /></div>
                            <div className="flex-grow">
                                <p className="w-full text-base font-semibold text-gray-900">{task?.title || 'No Title'}</p>
                                {task?.notes && <p className="w-full text-sm mt-1 text-gray-700 whitespace-pre-wrap">{task.notes}</p>}
                                
                                {task?.subtasks && task.subtasks.length > 0 && (
                                    <div className="mt-2 space-y-1 pt-2 border-t border-gray-100">
                                        {task.subtasks.map((sub) => (
                                            <div key={sub.id} className="flex items-center gap-2 group">
                                                <SubtaskCircleIcon completed={sub.completed} />
                                                <p className={`text-sm ${sub.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{sub.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100">
                             <div className="flex items-center gap-2 flex-wrap min-w-0 mb-3 min-h-[1.75rem]">
                                {task?.reminder !== null && task?.reminder !== undefined && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 text-purple-800 text-xs font-semibold">
                                        <BellIcon className="w-3.5 h-3.5" />
                                        <span className="truncate">{getReminderLabel(task.reminder)}</span>
                                    </div>
                                )}
                                {task?.startTime && task.type === 'Fixed' && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-100 text-green-800 text-xs font-semibold">
                                        <ClockIcon className="w-3.5 h-3.5" />
                                        <span className="truncate">Starts {formatChipDate(task.startDate || todayStr)}, {new Date('1970-01-01T' + task.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                    </div>
                                )}
                                {task?.dueDate && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold"><span>Due {formatChipDate(task.dueDate)}</span></div>)}
                                {task?.category && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-semibold"><span>{task.category}</span></div>)}
                             </div>
                            <div className="flex items-center justify-end">
                                <div className="flex items-center gap-1">
                                    <div title={task?.type} className={`p-2 rounded-full ${task?.type === 'Fixed' ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}><LockIcon className="w-5 h-5" /></div>
                                    {task?.type === 'Fixed' && ( <div title="Start Time" className={`p-2 rounded-full ${task?.startTime ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}><ClockIcon className="w-5 h-5" /></div> )}
                                    <div title="Due Date" className={`p-2 rounded-full ${task?.dueDate ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}><CalendarIcon className="w-5 h-5" /></div>
                                    <div title="List" className={`p-2 rounded-full ${task?.category ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}><TagIcon className="w-5 h-5" /></div>
                                    <div title="Subtasks" className={`p-2 rounded-full ${(task?.subtasks?.length || 0) > 0 ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}><ListCheckIcon className="w-5 h-5" /></div>
                                    <div title="Reminder" className={`p-2 rounded-full ${task?.reminder !== null && task?.reminder !== undefined ? 'text-blue-600 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}><BellIcon className="w-5 h-5" /></div>
                                    <div title="Today" className={`p-2 rounded-full ${task?.today ? 'text-yellow-500 bg-yellow-100' : 'text-gray-500 bg-gray-100'}`}><StarIcon className="w-5 h-5" /></div>
                                    <div title="Important" className={`p-2 rounded-full ${task?.important ? 'text-red-600 bg-red-100' : 'text-gray-500 bg-gray-100'}`}><FlagIcon className="w-4 h-4" /></div>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-3 pt-2">
                        <button onClick={() => setIsDeleteConfirmOpen(true)} className="px-4 py-2.5 bg-gray-100 text-red-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors w-full flex items-center justify-center gap-2">
                            <DeleteButtonIcon />
                            <span>Delete</span>
                        </button>
                        <button onClick={onEdit} className="px-4 py-2.5 bg-blue-100 text-blue-600 font-semibold rounded-xl hover:bg-blue-200 transition-colors w-full flex items-center justify-center gap-2">
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
        </>
    );
};

export default TaskDetailScreen;