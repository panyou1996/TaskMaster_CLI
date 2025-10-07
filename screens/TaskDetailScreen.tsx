import React, { useEffect, useState } from 'react';
import { EditIcon, TrashIcon } from '../components/icons/Icons';
import type { Task } from '../data/mockData';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { useData } from '../contexts/DataContext';

interface TaskDetailScreenProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: () => void;
}

const TaskDetailScreen: React.FC<TaskDetailScreenProps> = ({ isOpen, onClose, task, onEdit }) => {
    const { deleteTask } = useData();
    const [activeTab, setActiveTab] = useState<'Basic' | 'Schedule' | 'Subtask'>('Basic');
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('Basic');
        }
    }, [isOpen]);
    
    const handleConfirmDelete = async () => {
        if (!task) return;
        try {
            await deleteTask(task.id);
            setIsDeleteConfirmOpen(false);
            onClose(); // Close the detail screen after deletion
        } catch (error) {
            console.error("Failed to delete task:", error);
            alert("Could not delete the task. Please try again.");
            setIsDeleteConfirmOpen(false);
        }
    };


    const DetailItem: React.FC<{label: string, value?: string | React.ReactNode}> = ({label, value}) => {
        const isNote = label === 'Notes';
        return (
            <div>
                <p className="block text-sm font-medium text-gray-500 mb-1">{label}</p>
                <div className={`w-full px-4 py-2.5 bg-gray-100/70 border border-gray-200 rounded-xl min-h-[45px] flex items-center ${isNote ? 'text-base text-gray-700 whitespace-pre-wrap' : 'text-sm text-gray-800'}`}>
                    {value || '-'}
                </div>
            </div>
        );
    };

    const ToggleItem: React.FC<{label: string, value: boolean}> = ({label, value}) => (
        <div className="flex justify-between items-center">
            <p className="font-medium text-gray-700 text-sm">{label}</p>
            <p className={`text-sm font-semibold px-3 py-1 rounded-full ${value ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                {value ? 'Yes' : 'No'}
            </p>
        </div>
    );

    return (
        <>
            <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
                <div
                    className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                    aria-hidden="true"
                />
                <div
                    className={`w-full bg-gray-50 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="task-detail-title"
                >
                    <header className="pt-3 px-4 pb-3 border-b border-gray-200 bg-white rounded-t-3xl sticky top-0 z-10">
                        <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                        <div className="flex justify-between items-center h-8">
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="p-1 text-gray-500 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                                <TrashIcon />
                            </button>
                            <h2 id="task-detail-title" className="text-base font-bold text-gray-900">Task Detail</h2>
                            <button onClick={onEdit} className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors">
                                <EditIcon />
                            </button>
                        </div>
                    </header>
                    
                    <div
                        className="p-4 space-y-4 overflow-y-auto max-h-[75vh] pb-24"
                        style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}
                    >
                        <div className="flex bg-gray-200 rounded-lg p-1">
                            <button type="button" onClick={() => setActiveTab('Basic')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Basic' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Basic</button>
                            <button type="button" onClick={() => setActiveTab('Schedule')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Schedule' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Schedule</button>
                            <button type="button" onClick={() => setActiveTab('Subtask')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Subtask' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Subtask</button>
                        </div>

                        <div className="grid">
                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab === 'Basic' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                                        <DetailItem label="Task Name" value={task?.title} />
                                        <DetailItem label="List" value={task?.category} />
                                        <ToggleItem label="Important" value={task?.important ?? false} />
                                        <ToggleItem label="Today" value={task?.today ?? false} />
                                        <DetailItem label="Notes" value={task?.notes} />
                                    </div>
                                </div>
                            </div>
                            
                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab === 'Schedule' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                                        <DetailItem label="Task Type" value={task?.type} />
                                        <DetailItem label="Duration" value={task?.duration ? `${task.duration} min` : undefined} />
                                        <DetailItem label="Due Day" value={task?.dueDate} />
                                        {task?.type === 'Fixed' && (
                                            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                                <DetailItem label="Start Date" value={task?.startDate} />
                                                <DetailItem label="Start Time" value={task?.startTime} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab === 'Subtask' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="bg-white p-4 rounded-xl shadow-sm">
                                        <p className="block text-sm font-medium text-gray-700 mb-2">Subtasks</p>
                                        {task?.subtasks && task.subtasks.length > 0 ? (
                                            <div className="space-y-2">
                                                {task.subtasks.map(sub => (
                                                    <div key={sub.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                                                        <input type="checkbox" checked={sub.completed} disabled className="h-5 w-5 rounded border-gray-300 text-blue-600" />
                                                        <span className={`text-sm ${sub.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{sub.text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 text-center py-4">No subtasks added.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
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