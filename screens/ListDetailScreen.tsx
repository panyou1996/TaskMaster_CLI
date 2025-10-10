import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import TaskCard from '../components/common/TaskCard';
import { FilterIcon, ChevronLeftIcon, PlusIcon, ChevronDownIcon, CheckIcon, SortIcon } from '../components/icons/Icons';
import { EmptyListDetailIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import AddTaskScreen, { NewTaskData } from './AddTaskScreen';
import TaskDetailScreen from './TaskDetailScreen';
import EditTaskScreen from './EditTaskScreen';

const colorVariants = {
    green: { bg: 'bg-green-100 dark:bg-green-900/30' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30' },
};

type FilterType = 'overdue' | 'dueIn3Days' | 'dueThisWeek' | 'startIn3Days' | 'startThisWeek' | 'custom' | null;
type SortType = 'default' | 'dueDate' | 'startDate' | 'importance' | 'title';


const parseDateString = (dateString: string | undefined): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [year, month, day] = parts;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date;
};

interface CustomDateRangeSheetProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (data: { start: string; end: string; type: 'due' | 'start' }) => void;
    initialRange: { start: string | null; end: string | null };
    initialType: 'due' | 'start';
}

const CustomDateRangeSheet: React.FC<CustomDateRangeSheetProps> = ({ 
    isOpen, 
    onClose, 
    onApply, 
    initialRange,
    initialType
}) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(initialRange.start || today);
    const [endDate, setEndDate] = useState(initialRange.end || today);
    const [rangeType, setRangeType] = useState<'due' | 'start'>(initialType);

    useEffect(() => {
        if (isOpen) {
            setStartDate(initialRange.start || today);
            setEndDate(initialRange.end || today);
            setRangeType(initialType);
        }
    }, [isOpen, initialRange, initialType, today]);


    const handleApply = () => {
        if (startDate && endDate) {
            onApply({ start: startDate, end: endDate, type: rangeType });
        }
    };
    
    return (
        <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            <div className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />
            <div className={`w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} role="dialog">
                <header className="pt-3 px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
                    <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 text-center">Custom Date Range</h2>
                </header>
                <div
                    className="p-4 space-y-4 pb-8"
                    style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom))` }}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                            <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                            <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Apply range to</label>
                        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                            <button type="button" onClick={() => setRangeType('due')} className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-all ${rangeType === 'due' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Due Date</button>
                            <button type="button" onClick={() => setRangeType('start')} className={`w-1/2 py-1.5 text-sm font-semibold rounded-md transition-all ${rangeType === 'start' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Start Date</button>
                        </div>
                    </div>
                    <button onClick={handleApply} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors mt-2 !-mb-2">
                        Apply Filter
                    </button>
                </div>
            </div>
        </div>
    );
};

const FilterSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectFilter: (filter: FilterType) => void;
    onCustomRangeClick: () => void;
    currentFilter: FilterType;
}> = ({ isOpen, onClose, onSelectFilter, onCustomRangeClick, currentFilter }) => {
    const filters: { label: string; value: FilterType }[] = [
        { label: 'All Tasks', value: null },
        { label: 'Overdue', value: 'overdue' },
        { label: 'Due in 3 days', value: 'dueIn3Days' },
        { label: 'Due this week', value: 'dueThisWeek' },
        { label: 'Starts in 3 days', value: 'startIn3Days' },
        { label: 'Starts this week', value: 'startThisWeek' },
    ];

    const handleSelect = (filter: FilterType) => {
        onSelectFilter(filter);
        onClose();
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            <div className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />
            <div className={`w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} role="dialog" aria-modal="true" aria-labelledby="filter-title">
                <header className="pt-3 px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
                    <h2 id="filter-title" className="text-base font-bold text-gray-900 dark:text-gray-100 text-center">Filter Tasks</h2>
                </header>
                <div
                    className="p-4 space-y-2 pb-8"
                    style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom))` }}
                >
                    {filters.map(filter => (
                        <button key={filter.label} onClick={() => handleSelect(filter.value)} className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${currentFilter === filter.value ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                            <span>{filter.label}</span>
                            {currentFilter === filter.value && <CheckIcon />}
                        </button>
                    ))}
                    <div className="border-t border-gray-200 dark:border-gray-700 my-2 !mt-4" />
                     <button onClick={onCustomRangeClick} className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${currentFilter === 'custom' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                        <span>Custom Range...</span>
                        {currentFilter === 'custom' && <CheckIcon />}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SortSheet: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelectSort: (sort: SortType) => void;
    currentSort: SortType;
}> = ({ isOpen, onClose, onSelectSort, currentSort }) => {
    const sortOptions: { label: string; value: SortType }[] = [
        { label: 'Default', value: 'default' },
        { label: 'Sort by Due Date', value: 'dueDate' },
        { label: 'Sort by Start Date', value: 'startDate' },
        { label: 'Sort by Importance', value: 'importance' },
        { label: 'Sort by Title (A-Z)', value: 'title' },
    ];

    const handleSelect = (sort: SortType) => {
        onSelectSort(sort);
        onClose();
    };

    return (
         <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            <div className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />
            <div className={`w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} role="dialog" aria-modal="true" aria-labelledby="sort-title">
                <header className="pt-3 px-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
                    <h2 id="sort-title" className="text-base font-bold text-gray-900 dark:text-gray-100 text-center">Sort Tasks</h2>
                </header>
                <div
                    className="p-4 space-y-2 pb-8"
                    style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom))` }}
                >
                    {sortOptions.map(option => (
                        <button key={option.value} onClick={() => handleSelect(option.value)} className={`w-full text-left p-3 rounded-lg text-sm font-medium transition-colors flex justify-between items-center ${currentSort === option.value ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                            <span>{option.label}</span>
                            {currentSort === option.value && <CheckIcon />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};


const ListDetailScreen: React.FC = () => {
    const { listId } = useParams<{ listId: string }>();
    const navigate = useNavigate();
    
    const { tasks: allTasks, lists: taskLists, addTask, updateTask } = useData();

    const [completingTaskId, setCompletingTaskId] = useState<number | string | null>(null);
    const [uncompletingTaskId, setUncompletingTaskId] = useState<number | string | null>(null);
    const [justUncompletedId, setJustUncompletedId] = useState<number | string | null>(null);
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isFinishedTasksVisible, setIsFinishedTasksVisible] = useState(false);
    
    // Filtering State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterType>(null);
    const [isCustomRangeOpen, setIsCustomRangeOpen] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
    const [customRangeType, setCustomRangeType] = useState<'due' | 'start'>('due');

    // Sorting State
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [activeSort, setActiveSort] = useState<SortType>('default');

    const listInfoMap = useMemo(() => {
        const map = new Map<string, { icon: string; color: string }>();
        taskLists.forEach(list => {
            map.set(list.name, { icon: list.icon, color: list.color });
        });
        return map;
    }, [taskLists]);

    const currentList = useMemo(() => taskLists.find(list => list.id.toString() === listId), [taskLists, listId]);
    
    const listTasks = useMemo(() => allTasks.filter(task => task.category === currentList?.name), [allTasks, currentList]);

    const filteredListTasks = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (!activeFilter) return listTasks;

        if (activeFilter === 'custom' && customDateRange.start && customDateRange.end) {
            const customStart = parseDateString(customDateRange.start);
            const customEnd = parseDateString(customDateRange.end);
            if (!customStart || !customEnd) return listTasks;
            return listTasks.filter(task => {
                if (customRangeType === 'due') {
                    const dueDate = parseDateString(task.dueDate);
                    return dueDate && dueDate >= customStart && dueDate <= customEnd;
                }
                const startDate = parseDateString(task.startDate);
                return startDate && startDate >= customStart && startDate <= customEnd;
            });
        }
        
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        return listTasks.filter(task => {
            const dueDate = parseDateString(task.dueDate);
            const startDate = parseDateString(task.startDate);
            switch (activeFilter) {
                case 'overdue': return dueDate && dueDate < today && !task.completed;
                case 'dueIn3Days': return dueDate && dueDate >= today && dueDate <= threeDaysFromNow;
                case 'dueThisWeek': return dueDate && dueDate >= startOfWeek && dueDate <= endOfWeek;
                case 'startIn3Days': return startDate && startDate >= today && startDate <= threeDaysFromNow;
                case 'startThisWeek': return startDate && startDate >= startOfWeek && startDate <= endOfWeek;
                default: return true;
            }
        });
    }, [listTasks, activeFilter, customDateRange, customRangeType]);

    const sortTasks = (tasks: Task[]): Task[] => {
        const tasksToSort = [...tasks];
        return tasksToSort.sort((a, b) => {
             switch (activeSort) {
                case 'importance': return (b.important ? 1 : 0) - (a.important ? 1 : 0);
                case 'title': return a.title.localeCompare(b.title);
                case 'dueDate': {
                    const dateA = a.dueDate ? parseDateString(a.dueDate)?.getTime() : Infinity;
                    const dateB = b.dueDate ? parseDateString(b.dueDate)?.getTime() : Infinity;
                    return dateA - dateB;
                }
                case 'startDate': {
                    const dateA = a.startDate ? parseDateString(a.startDate)?.getTime() : Infinity;
                    const dateB = b.startDate ? parseDateString(b.startDate)?.getTime() : Infinity;
                    return dateA - dateB;
                }
                default:
                    // FIX: The `id` can be a string (for temporary items) or a number.
                    // The subtraction operator is not valid for strings.
                    // This handles numeric, string, and mixed-type comparisons safely.
                    if (typeof a.id === 'number' && typeof b.id === 'number') {
                        return a.id - b.id;
                    }
                    if (typeof a.id === 'string' && typeof b.id === 'string') {
                        return a.id.localeCompare(b.id);
                    }
                    // Handle mixed types: numbers (synced items) come before strings (pending items)
                    if (typeof a.id === 'number') {
                        return -1;
                    }
                    if (typeof b.id === 'number') {
                        return 1;
                    }
                    return 0;
            }
        });
    };

    const tasks = useMemo(() => sortTasks(filteredListTasks.filter(task => !task.completed)), [filteredListTasks, activeSort]);
    const finishedTasks = useMemo(() => sortTasks(filteredListTasks.filter(task => task.completed)), [filteredListTasks, activeSort]);
    
    // FIX: Changed taskId to allow string for temporary items
    const handleCompleteTask = (taskId: number | string) => {
        setCompletingTaskId(taskId);
        setTimeout(async () => {
            await updateTask(taskId, { completed: true });
            setCompletingTaskId(null);
        }, 600);
    };

    // FIX: Changed taskId to allow string for temporary items
    const handleUncompleteTask = (taskId: number | string) => {
        setUncompletingTaskId(taskId);
        setTimeout(async () => {
            await updateTask(taskId, { completed: false });
            setJustUncompletedId(taskId);
            setUncompletingTaskId(null);
        }, 300);
    };

    // FIX: Changed taskId to allow string for temporary items
    const handleToggleSubtask = (taskId: number | string, subtaskId: number) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task?.subtasks) {
            const newSubtasks = task.subtasks.map(sub =>
                sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
            );
            updateTask(taskId, { subtasks: newSubtasks });
            if (selectedTask?.id === taskId) {
                setSelectedTask(prev => prev ? { ...prev, subtasks: newSubtasks } : null);
            }
        }
    };
    
    // FIX: Changed taskId to allow string for temporary items
    const handleToggleImportant = (taskId: number | string) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task) updateTask(taskId, { important: !task.important });
    };
    
    // FIX: Changed taskId to allow string for temporary items
    const handleToggleToday = (taskId: number | string) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task) updateTask(taskId, { today: !task.today });
    };

    const handleOpenTaskDetail = (task: Task) => {
        setSelectedTask(task);
        setIsDetailOpen(true);
    };

    const handleCloseTaskDetail = () => {
        setIsDetailOpen(false);
        setTimeout(() => setSelectedTask(null), 300);
    };

    const handleOpenEditTask = () => {
        setIsDetailOpen(false);
        setIsEditOpen(true);
    };
    
    const handleCloseEditTask = () => {
        setIsEditOpen(false);
        setTimeout(() => setSelectedTask(null), 300);
    };

    const handleSaveTask = async (updatedTask: Task) => {
        await updateTask(updatedTask.id, updatedTask);
    };

    const handleAddTask = async (newTaskData: NewTaskData) => {
        const newTask: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed'> = {
            title: newTaskData.title,
            category: currentList?.name || 'Work',
            important: newTaskData.isImportant,
            today: newTaskData.isToday,
            type: newTaskData.type,
            dueDate: newTaskData.dueDate || undefined,
            startDate: newTaskData.type === 'Fixed' ? (newTaskData.startDate || undefined) : undefined,
            startTime: newTaskData.type === 'Fixed' ? (newTaskData.startTime || undefined) : undefined,
            time: newTaskData.type === 'Fixed' ? (newTaskData.startTime || '--:--') : '--:--',
            duration: newTaskData.duration ? parseInt(newTaskData.duration, 10) : undefined,
            notes: newTaskData.notes || undefined,
            subtasks: newTaskData.subtasks || [],
            color: currentList?.color || 'gray',
        };
        await addTask(newTask);
    };

    const handleSelectFilter = (filter: FilterType) => {
        setActiveFilter(filter);
        if (filter !== 'custom') setCustomDateRange({ start: null, end: null });
    }

    const handleOpenCustomRange = () => {
        setIsFilterOpen(false);
        setIsCustomRangeOpen(true);
    };

    const handleApplyCustomRange = (data: { start: string; end: string; type: 'due' | 'start' }) => {
        setCustomDateRange({ start: data.start, end: data.end });
        setCustomRangeType(data.type);
        setActiveFilter('custom');
        setIsCustomRangeOpen(false);
    };

    const clearFilter = () => {
        setActiveFilter(null);
        setCustomDateRange({ start: null, end: null });
        setCustomRangeType('due');
    };

    if (!currentList) {
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-lg font-semibold">List not found</p>
                    <button onClick={() => navigate('/lists')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
                        Go back to lists
                    </button>
                </div>
            </MainLayout>
        )
    }

    const listColor = colorVariants[currentList.color as keyof typeof colorVariants] || colorVariants.blue;

    return (
        <MainLayout hideNavBar>
            <div className="absolute inset-0 flex flex-col">
                <header
                    className="px-4 pt-6 pb-4 flex items-center gap-2 flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)]"
                    style={{ paddingTop: `calc(1.5rem + var(--status-bar-height, env(safe-area-inset-top)))` }}
                >
                    <button onClick={() => navigate('/plan')} className="p-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                        <ChevronLeftIcon />
                    </button>
                    <div className={`p-2 rounded-lg flex items-center justify-center w-10 h-10 ${listColor.bg}`}>
                        <span className="text-xl">{currentList.icon}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{currentList.name}</h1>
                    <div className="flex-grow" />
                    <button 
                        onClick={() => setIsSortOpen(true)}
                        className={`p-2 rounded-full transition-colors ${activeSort !== 'default' ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        aria-label="Sort tasks"
                    >
                        <SortIcon />
                    </button>
                    <button 
                        onClick={() => setIsFilterOpen(true)}
                        className={`p-2 rounded-full transition-colors ${activeFilter ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                        aria-label="Filter tasks"
                    >
                        <FilterIcon />
                    </button>
                </header>

                <main className="px-6 pb-6 overflow-y-auto flex-grow">
                    {(tasks.length === 0 && finishedTasks.length === 0 && activeFilter) ? (
                        <div className="text-center py-16">
                             <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No tasks match your filter</p>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Try adjusting or clearing the filter.</p>
                            <button onClick={clearFilter} className="mt-4 px-4 py-2 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">
                                Clear Filter
                            </button>
                        </div>
                    ) : listTasks.length === 0 ? (
                        <EmptyListDetailIllustration onAddTask={() => setIsAddTaskOpen(true)} />
                    ) : (
                        <>
                            {tasks.length > 0 && (
                                <section>
                                    <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-3">Tasks</h2>
                                    <div className="space-y-3">
                                        {tasks.map(task => {
                                             const listInfo = listInfoMap.get(task.category) || { icon: '📝', color: 'gray' };
                                            return (
                                                <TaskCard 
                                                    key={task.id} 
                                                    {...task} 
                                                    color={listInfo.color}
                                                    categoryIcon={listInfo.icon}
                                                    onComplete={() => handleCompleteTask(task.id)}
                                                    isCompleting={completingTaskId === task.id}
                                                    onToggleSubtask={handleToggleSubtask}
                                                    onToggleImportant={() => handleToggleImportant(task.id)}
                                                    onClick={() => handleOpenTaskDetail(task)}
                                                    hideSubtasks={true}
                                                    isJustUncompleted={justUncompletedId === task.id}
                                                    onUncompleteAnimationEnd={() => setJustUncompletedId(null)}
                                                />
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {finishedTasks.length > 0 && (
                                <section className={tasks.length > 0 ? "mt-6" : ""}>
                                     <button 
                                        onClick={() => setIsFinishedTasksVisible(!isFinishedTasksVisible)}
                                        className="w-full flex justify-between items-center mb-3"
                                        aria-expanded={isFinishedTasksVisible}
                                    >
                                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-200">Finished Tasks</h2>
                                        <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isFinishedTasksVisible ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isFinishedTasksVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                        <div className="overflow-hidden">
                                            <div className="space-y-3">
                                                {finishedTasks.map(task => {
                                                    const listInfo = listInfoMap.get(task.category) || { icon: '📝', color: 'gray' };
                                                    return (
                                                        <TaskCard 
                                                            key={task.id} 
                                                            {...task} 
                                                            color={listInfo.color}
                                                            categoryIcon={listInfo.icon}
                                                            onClick={() => handleOpenTaskDetail(task)} 
                                                            onUncomplete={() => handleUncompleteTask(task.id)} 
                                                            isUncompleting={uncompletingTaskId === task.id}
                                                            hideSubtasks={true}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </>
                    )}
                </main>
            </div>

            <button 
                onClick={() => setIsAddTaskOpen(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 z-30"
                aria-label="Add new task"
            >
                <PlusIcon />
            </button>

            <AddTaskScreen
                isOpen={isAddTaskOpen}
                onClose={() => setIsAddTaskOpen(false)}
                onAddTask={handleAddTask}
            />
            <TaskDetailScreen
                isOpen={isDetailOpen}
                onClose={handleCloseTaskDetail}
                task={selectedTask}
                onEdit={handleOpenEditTask}
            />
            <EditTaskScreen
                isOpen={isEditOpen}
                onClose={handleCloseEditTask}
                task={selectedTask}
                onSave={handleSaveTask}
            />
            <FilterSheet
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onSelectFilter={handleSelectFilter}
                onCustomRangeClick={handleOpenCustomRange}
                currentFilter={activeFilter}
            />
             <SortSheet
                isOpen={isSortOpen}
                onClose={() => setIsSortOpen(false)}
                onSelectSort={setActiveSort}
                currentSort={activeSort}
            />
            <CustomDateRangeSheet
                isOpen={isCustomRangeOpen}
                onClose={() => setIsCustomRangeOpen(false)}
                onApply={handleApplyCustomRange}
                initialRange={customDateRange}
                initialType={customRangeType}
            />
        </MainLayout>
    );
};

export default ListDetailScreen;
