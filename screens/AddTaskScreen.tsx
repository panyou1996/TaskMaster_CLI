import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { CheckIcon, TrashIcon, PlusIconHeader, RefreshSpinnerIcon } from '../components/icons/Icons';
import { useData } from '../contexts/DataContext';

export interface NewTaskData {
    title: string;
    list: string;
    isImportant: boolean;
    isToday: boolean;
    type: 'Fixed' | 'Flexible';
    startDate: string;
    startTime: string;
    duration: string;
    dueDate: string;
    notes: string;
    subtasks: { id: number; text: string; completed: boolean }[];
}

interface AddTaskScreenProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  onAddTask?: (taskData: NewTaskData) => Promise<void>;
}

const AddTaskScreen: React.FC<AddTaskScreenProps> = ({ isOpen, onClose, initialDate, onAddTask }) => {
    const { lists: userLists } = useData();
    const listOptions = useMemo(() => userLists.map(l => l.name), [userLists]);

    const [title, setTitle] = useState('');
    const [selectedList, setSelectedList] = useState('');
    const [isImportant, setIsImportant] = useState(false);
    const [isToday, setIsToday] = useState(false);
    const [taskType, setTaskType] = useState<'Fixed' | 'Flexible'>('Fixed');
    const [startDate, setStartDate] = useState(new Date().toISOString().substring(0, 10));
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [notes, setNotes] = useState('');
    
    const [activeTab, setActiveTab] = useState<'Basic' | 'Schedule' | 'Subtask'>('Basic');
    const [subtasks, setSubtasks] = useState<{ id: number; text: string; completed: boolean }[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resetState = useCallback(() => {
        setTitle('');
        setSelectedList(listOptions.length > 0 ? listOptions[0] : '');
        setIsImportant(false);
        setIsToday(false);
        setTaskType('Fixed');
        setStartDate(new Date().toISOString().substring(0, 10));
        setStartTime('');
        setDuration('');
        setDueDate('');
        setNotes('');
        setActiveTab('Basic');
        setSubtasks([]);
        setNewSubtaskText('');
        setError(null);
        setLoading(false);
    }, [listOptions]);

    useEffect(() => {
        if (isOpen) {
            resetState(); // Clear previous state first
            if (initialDate) {
                setDueDate(initialDate);
                setStartDate(initialDate);
                setActiveTab('Schedule'); // Switch to schedule tab for better UX
            }
            
            const handleKeyDown = (event: KeyboardEvent) => {
              if (event.key === 'Escape') {
                onClose();
              }
            };
            window.addEventListener('keydown', handleKeyDown);
            
            return () => {
              window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [isOpen, initialDate, onClose, resetState]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Task name is required.");
            return;
        }
        if (!selectedList) {
            setError("Please select a list. If you have no lists, please create one first.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (onAddTask) {
                await onAddTask({
                    title,
                    list: selectedList,
                    isImportant,
                    isToday,
                    type: taskType,
                    startDate,
                    startTime,
                    duration,
                    dueDate,
                    notes,
                    subtasks
                });
            }
            onClose();
        } catch (err: any) {
            const errorMessage = (err && typeof err === 'object' && err.message)
                ? err.message
                : 'Failed to save the task. Please try again.';
            setError(errorMessage);
            console.error("Failed to add task:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubtask = () => {
        if (newSubtaskText.trim()) {
            setSubtasks([...subtasks, { id: Date.now(), text: newSubtaskText, completed: false }]);
            setNewSubtaskText('');
        }
    };

    const handleToggleSubtask = (id: number) => {
        setSubtasks(subtasks.map(sub => sub.id === id ? { ...sub, completed: !sub.completed } : sub));
    };

    const handleDeleteSubtask = (id: number) => {
        setSubtasks(subtasks.filter(sub => sub.id !== id));
    };


    const CloseIcon: React.FC = () => (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    );

    return (
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
                aria-labelledby="add-task-title"
            >
                <header
                    className="pt-3 px-4 pb-3 border-b border-gray-200 bg-white rounded-t-3xl sticky top-0 z-10"
                    style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top))` }}
                >
                    <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
                    <div className="flex justify-between items-center h-8">
                        <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
                            <CloseIcon />
                        </button>
                        <h2 id="add-task-title" className="text-base font-bold text-gray-900">Add New Task</h2>
                        <button type="submit" form="add-task-form" disabled={loading} className="p-1 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors disabled:opacity-50">
                            {loading ? <RefreshSpinnerIcon /> : <CheckIcon />}
                        </button>
                    </div>
                </header>
                
                <form id="add-task-form" onSubmit={handleSubmit}>
                    <div
                        className="p-4 space-y-4 overflow-y-auto max-h-[75vh] pb-24"
                        style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}
                    >
                        {error && <p className="text-red-500 text-sm text-center -mt-2 mb-2 px-4 bg-red-50 py-2 rounded-lg">{error}</p>}
                        
                        {/* Tab Toggle */}
                        <div className="flex bg-gray-200 rounded-lg p-1">
                            <button type="button" onClick={() => setActiveTab('Basic')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Basic' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Basic</button>
                            <button type="button" onClick={() => setActiveTab('Schedule')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Schedule' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Schedule</button>
                            <button type="button" onClick={() => setActiveTab('Subtask')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${activeTab === 'Subtask' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Subtask</button>
                        </div>

                        <div className="grid">
                             {/* Basic Tab Content */}
                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab === 'Basic' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                     <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                                        <div>
                                            <label htmlFor="task-title" className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                                            <input
                                                id="task-title"
                                                type="text"
                                                placeholder="e.g. Plan team meeting"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                required
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="task-list" className="block text-sm font-medium text-gray-700 mb-1">List</label>
                                            <div className="relative">
                                                <select
                                                    id="task-list"
                                                    value={selectedList}
                                                    onChange={(e) => setSelectedList(e.target.value)}
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
                                                >
                                                    {listOptions.map(list => <option key={list} value={list}>{list}</option>)}
                                                </select>
                                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-700">
                                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label htmlFor="task-important" className="font-medium text-gray-700 text-sm">Important</label>
                                            <button
                                                type="button"
                                                id="task-important"
                                                onClick={() => setIsImportant(!isImportant)}
                                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isImportant ? 'bg-blue-600' : 'bg-gray-200'}`}
                                            >
                                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isImportant ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label htmlFor="task-today" className="font-medium text-gray-700 text-sm">Today</label>
                                            <button
                                                type="button"
                                                id="task-today"
                                                onClick={() => setIsToday(!isToday)}
                                                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isToday ? 'bg-blue-600' : 'bg-gray-200'}`}
                                            >
                                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isToday ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div>
                                            <label htmlFor="task-notes" className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <textarea
                                                id="task-notes"
                                                rows={2}
                                                placeholder="Add more details..."
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Schedule Tab Content */}
                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab === 'Schedule' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                 <div className="overflow-hidden">
                                     <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
                                            <div className="flex bg-gray-200 rounded-lg p-1">
                                                <button type="button" onClick={() => setTaskType('Fixed')} className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-all ${taskType === 'Fixed' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Fixed</button>
                                                <button type="button" onClick={() => setTaskType('Flexible')} className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-all ${taskType === 'Flexible' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>Flexible</button>
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duration (in minutes)</label>
                                            <input type="number" id="duration" placeholder="e.g. 30" value={duration} onChange={e => setDuration(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" min="0" />
                                        </div>
                                        <div>
                                            <label htmlFor="due-day" className="block text-sm font-medium text-gray-700 mb-1">Due Day</label>
                                            <input type="date" id="due-day" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>

                                        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${taskType === 'Fixed' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                            <div className="overflow-hidden">
                                                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4">
                                                    <div>
                                                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                                        <input type="time" id="start-time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                             {/* Subtask Tab Content */}
                            <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${activeTab === 'Subtask' ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                <div className="overflow-hidden">
                                    <div className="bg-white p-4 rounded-xl shadow-sm">
                                        <label htmlFor="subtask-input" className="block text-sm font-medium text-gray-700 mb-1">Add Subtask</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="subtask-input"
                                                type="text"
                                                placeholder="e.g. Research competitors"
                                                value={newSubtaskText}
                                                onChange={(e) => setNewSubtaskText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={handleAddSubtask} 
                                                className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                                                aria-label="Add subtask"
                                            >
                                                <PlusIconHeader />
                                            </button>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {subtasks.map(sub => (
                                                <div key={sub.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={sub.completed}
                                                            onChange={() => handleToggleSubtask(sub.id)}
                                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className={`text-sm ${sub.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                                            {sub.text}
                                                        </span>
                                                    </div>
                                                    <button type="button" onClick={() => handleDeleteSubtask(sub.id)} className="text-gray-400 hover:text-red-500">
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskScreen;