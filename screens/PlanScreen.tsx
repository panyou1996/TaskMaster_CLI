import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import { 
    SearchIcon, 
    PlusIconHeader,
    ChevronDownIcon,
    RefreshSpinnerIcon,
    HamburgerMenuIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '../components/icons/Icons';
import { EmptyListsIllustration, EmptyCalendarIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { Task, TaskList } from '../data/mockData';
import AddListScreen, { NewListData } from './AddListScreen';
import EditListScreen from './EditListScreen';
import AddTaskScreen, { NewTaskData } from './AddTaskScreen';
import TaskCard from '../components/common/TaskCard';
import TaskDetailScreen from './TaskDetailScreen';
import EditTaskScreen from './EditTaskScreen';
import { FixedSizeList as List } from 'react-window';

const colorVariants = {
    green: { bg: 'bg-green-100 dark:bg-green-900/30' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30' },
};

const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const PlanScreen: React.FC = () => {
    const [viewMode, setViewMode] = useState<'lists' | 'calendar'>('lists');
    const { 
        lists: taskLists, 
        tasks: allTasks, 
        addList, 
        updateList, 
        deleteList, 
        syncData,
        addTask,
        updateTask
    } = useData();
    const navigate = useNavigate();

    // -- STATE FOR LISTS VIEW --
    const [isAddListOpen, setIsAddListOpen] = useState(false);
    const [isEditListOpen, setIsEditListOpen] = useState(false);
    const [listToEdit, setListToEdit] = useState<TaskList | null>(null);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // -- STATE FOR CALENDAR VIEW --
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
    const [taskFilterMode, setTaskFilterMode] = useState<'due' | 'start'>('due');
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [completingTaskId, setCompletingTaskId] = useState<number | string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    
    // -- PULL TO REFRESH & SWIPE STATE --
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDelta, setPullDelta] = useState(0);
    const gestureStart = useRef<{ x: number; y: number } | null>(null);
    const gestureType = useRef<'none' | 'vertical' | 'horizontal'>('none');
    const listsViewRef = useRef<HTMLDivElement>(null);
    const calendarViewRef = useRef<HTMLDivElement>(null);
    const REFRESH_THRESHOLD = 80;
    const MIN_SWIPE_DISTANCE = 50;

    // --- STATE FOR VIRTUALIZATION ---
    const [mainListSize, setMainListSize] = useState({ width: 0, height: 0 });
    const mainListContainerRef = useRef<HTMLDivElement>(null);
    const [searchListSize, setSearchListSize] = useState({ width: 0, height: 0 });
    const searchListContainerRef = useRef<HTMLDivElement>(null);
    const LIST_ITEM_SIZE = 92; // 80px card height + 12px space-y-3

    useEffect(() => {
        if (isSearchVisible) {
            setTimeout(() => searchInputRef.current?.focus(), 300); // Wait for transition
        }
    }, [isSearchVisible]);

    // --- EFFECT FOR VIRTUALIZATION ---
    useEffect(() => {
        const mainEl = mainListContainerRef.current;
        if (mainEl) {
            const resizeObserver = new ResizeObserver(entries => {
                if (entries[0]) {
                    const { width, height } = entries[0].contentRect;
                    setMainListSize({ width, height });
                }
            });
            resizeObserver.observe(mainEl);
            return () => resizeObserver.disconnect();
        }
    }, []);

    useEffect(() => {
        const searchEl = searchListContainerRef.current;
        if (searchEl && isSearchVisible) {
            const resizeObserver = new ResizeObserver(entries => {
                if (entries[0]) {
                    const { width, height } = entries[0].contentRect;
                    setSearchListSize({ width, height });
                }
            });
            resizeObserver.observe(searchEl);
            return () => resizeObserver.disconnect();
        }
    }, [isSearchVisible]);
    
    // -- LOGIC FOR LISTS VIEW --
    const taskCounts = useMemo(() => {
        const counts: { [key: string]: number } = {};
        for (const task of allTasks) {
            if (!task.completed) {
                counts[task.category] = (counts[task.category] || 0) + 1;
            }
        }
        return counts;
    }, [allTasks]);

    const filteredTaskLists = useMemo(() => {
        if (!searchQuery) {
            return taskLists;
        }
        const lowerCaseQuery = searchQuery.toLowerCase();
        return taskLists.filter(list => 
            list.name.toLowerCase().includes(lowerCaseQuery)
        );
    }, [taskLists, searchQuery]);

    const handleAddList = async (newListData: NewListData) => await addList(newListData);
    const handleOpenEditModal = (list: TaskList) => {
        setListToEdit(list);
        setIsEditListOpen(true);
    };
    const handleCloseEditModal = () => {
        setIsEditListOpen(false);
        setListToEdit(null);
    };
    const handleSaveList = async (updatedList: TaskList) => {
        await updateList(updatedList.id, updatedList);
        handleCloseEditModal();
    };
    const handleDeleteList = async (listId: number | string) => {
        const listToDelete = taskLists.find(l => l.id === listId);
        if (listToDelete) await deleteList(listId, listToDelete.name);
        handleCloseEditModal();
    };

    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isClickRef = useRef(true);
    const cancelLongPress = () => {
        if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    };
    const onPointerDown = (list: TaskList) => {
        isClickRef.current = true;
        cancelLongPress();
        pressTimerRef.current = setTimeout(() => {
            isClickRef.current = false;
            handleOpenEditModal(list);
        }, 500);
    };
    const onPointerUp = (listId: number | string) => {
        cancelLongPress();
        if (isClickRef.current) navigate(`/lists/${listId}`);
    };

    // -- ROW RENDERER FOR VIRTUALIZED LIST --
    const ListRow = ({ data, index, style }: { data: TaskList[], index: number, style: React.CSSProperties }) => {
        const list = data[index];
        const colors = colorVariants[list.color as keyof typeof colorVariants] || colorVariants.blue;
        const count = taskCounts[list.name] || 0;
        
        return (
            <div style={style}>
                <div style={{ paddingBottom: '12px' }} /* Simulates space-y-3 */> 
                    <div 
                        onPointerDown={() => onPointerDown(list)}
                        onPointerUp={() => onPointerUp(list.id)}
                        onPointerLeave={cancelLongPress}
                        onPointerCancel={cancelLongPress}
                        className="bg-white dark:bg-gray-800 p-4 rounded-xl card-shadow flex items-center space-x-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors select-none h-[80px]"
                        onContextMenu={(e) => e.preventDefault()}
                    >
                        <div className={`p-2 rounded-lg flex items-center justify-center w-12 h-12 ${colors.bg}`}>
                            <span className="text-2xl">{list.icon}</span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{list.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{count} tasks</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // -- LOGIC FOR CALENDAR VIEW --
    const listColorMap = useMemo(() => new Map(taskLists.map(l => [l.name, l.color])), [taskLists]);
    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const lastDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

    const tasksByDay = useMemo(() => {
        const map = new Map<string, { due: Task[], start: Task[] }>();
        const ensureDay = (date: string) => {
            if (!map.has(date)) map.set(date, { due: [], start: [] });
        };
        allTasks.forEach(task => {
            if (task.dueDate) {
                ensureDay(task.dueDate);
                map.get(task.dueDate)!.due.push(task);
            }
            if (task.startDate) {
                ensureDay(task.startDate);
                map.get(task.startDate)!.start.push(task);
            }
        });
        return map;
    }, [allTasks]);

    const displayedDays = useMemo(() => {
        const generateDays = (startDate: Date, dayCount: number, offset: number = 0) => {
             const days = [];
             for(let i = 0; i < offset; i++) days.push({ day: null, date: null, hasTask: false });
             for (let i = 0; i < dayCount; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateString = formatDateToYYYYMMDD(date);
                const dayTasks = tasksByDay.get(dateString);
                days.push({ day: date.getDate(), date, hasTask: !!dayTasks && (dayTasks.due.length > 0 || dayTasks.start.length > 0) });
            }
            return days;
        };
        if (isCalendarCollapsed) {
            const startOfWeek = new Date(selectedDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            return generateDays(startOfWeek, 7);
        } else {
            return generateDays(firstDayOfMonth, lastDayOfMonth.getDate(), firstDayOfMonth.getDay());
        }
    }, [isCalendarCollapsed, selectedDate, tasksByDay, firstDayOfMonth, lastDayOfMonth]);
    
    const selectedDayTasks = useMemo(() => {
        const dateString = formatDateToYYYYMMDD(selectedDate);
        const dayTasks = tasksByDay.get(dateString);
        if (!dayTasks) return [];
        const tasksToShow = taskFilterMode === 'start' ? dayTasks.start : dayTasks.due;
        return [...tasksToShow].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
    }, [selectedDate, tasksByDay, taskFilterMode]);

    const handleCompleteTask = (taskId: number | string) => {
        setCompletingTaskId(taskId);
        setTimeout(async () => {
            await updateTask(taskId, { completed: true });
            setCompletingTaskId(null);
        }, 300);
    };
    const handleUncompleteTask = (taskId: number | string) => updateTask(taskId, { completed: false });
    const handleToggleSubtask = (taskId: number | string, subtaskId: number) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task?.subtasks) {
            const newSubtasks = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
            updateTask(taskId, { subtasks: newSubtasks });
            if (selectedTask?.id === taskId) setSelectedTask(p => p ? { ...p, subtasks: newSubtasks } : null);
        }
    };
    const handleToggleImportant = (taskId: number | string) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task) updateTask(taskId, { important: !task.important });
    };
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
    const handleSelectDate = (date: Date) => {
        if (isSameDay(date, selectedDate)) setIsAddTaskOpen(true);
        else setSelectedDate(date);
    };
    const handleAddTask = async (newTaskData: NewTaskData) => {
        const newTask: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed' | 'status'> = {
            title: newTaskData.title,
            category: newTaskData.list,
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
            color: listColorMap.get(newTaskData.list) || 'gray',
        };
        await addTask(newTask);
    };
    const handlePrevMonth = () => setCurrentDate(p => new Date(p.getFullYear(), p.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(p => new Date(p.getFullYear(), p.getMonth() + 1, 1));
    const today = new Date();
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // Combined handlers for pull-to-refresh and swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        gestureStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        gestureType.current = 'none';

        const activeScrollView = viewMode === 'lists' ? mainListContainerRef.current : calendarViewRef.current;
        if (activeScrollView?.scrollTop !== 0) {
            gestureStart.current.y = -1; // Disable vertical
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!gestureStart.current) return;

        const deltaX = e.touches[0].clientX - gestureStart.current.x;
        const deltaY = e.touches[0].clientY - gestureStart.current.y;

        if (gestureType.current === 'none') {
            if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
                gestureType.current = 'horizontal';
            } else if (Math.abs(deltaY) > 10 && Math.abs(deltaY) > Math.abs(deltaX)) {
                gestureType.current = 'vertical';
            }
        }

        if (gestureType.current === 'vertical' && gestureStart.current.y !== -1 && deltaY > 0) {
            setPullDelta(Math.pow(deltaY, 0.85));
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!gestureStart.current) return;

        if (gestureType.current === 'horizontal') {
            const endX = e.changedTouches[0].clientX;
            const distance = gestureStart.current.x - endX;
            if (distance > MIN_SWIPE_DISTANCE && viewMode === 'lists') {
                setViewMode('calendar');
            } else if (distance < -MIN_SWIPE_DISTANCE && viewMode === 'calendar') {
                setViewMode('lists');
            }
        } else if (gestureType.current === 'vertical' && gestureStart.current.y !== -1) {
            if (pullDelta > REFRESH_THRESHOLD) {
                setIsRefreshing(true);
                syncData().finally(() => {
                    setIsRefreshing(false);
                    setPullDelta(0);
                });
            } else {
                setPullDelta(0);
            }
        }

        gestureStart.current = null;
        gestureType.current = 'none';
    };

    return (
        <MainLayout>
             <div className="absolute inset-0 flex flex-col overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-14 flex justify-center items-center transition-opacity duration-300 pointer-events-none ${pullDelta > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
                    {isRefreshing ? <RefreshSpinnerIcon /> : <ChevronDownIcon className={`w-6 h-6 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${pullDelta > REFRESH_THRESHOLD ? 'rotate-180' : ''}`} />}
                </div>
                <div
                    className="h-full flex flex-col"
                    style={{ transform: `translateY(${isRefreshing ? 56 : pullDelta}px)`, transition: pullDelta === 0 || isRefreshing ? 'transform 0.3s' : 'none' }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <header
                        className="px-6 pt-6 pb-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 flex-shrink-0 bg-[var(--color-surface-container)] border-b border-[var(--color-border)]"
                        style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                    >
                        <div className="flex justify-start">
                            <button className="text-gray-600 dark:text-gray-400 p-1" onClick={() => setIsSearchVisible(true)}>
                                <SearchIcon />
                            </button>
                        </div>
                        <div className="flex justify-center">
                            <div className="grid grid-cols-2 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 w-full max-w-48">
                                <button onClick={() => setViewMode('lists')} className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'lists' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Lists</button>
                                <button onClick={() => setViewMode('calendar')} className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Calendar</button>
                            </div>
                        </div>
                        <div className="flex justify-end">
                            {viewMode === 'lists' ? (
                                <button className="text-gray-800 dark:text-gray-200" onClick={() => setIsAddListOpen(true)}><PlusIconHeader /></button>
                            ) : (
                                <button onClick={() => setTaskFilterMode(p => p === 'due' ? 'start' : 'due')} className="text-gray-600 dark:text-gray-400 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><HamburgerMenuIcon /></button>
                            )}
                        </div>
                    </header>

                    <main className="overflow-hidden flex-grow flex flex-col">
                         <div
                            className="flex h-full transition-transform duration-300 ease-out"
                            style={{ transform: viewMode === 'lists' ? 'translateX(0%)' : 'translateX(-100%)' }}
                        >
                            {/* Lists View */}
                            <div ref={mainListContainerRef} className="w-full flex-shrink-0 h-full px-6 pb-24 pt-4">
                                {taskLists.length === 0 ? (
                                    <EmptyListsIllustration onAddList={() => setIsAddListOpen(true)} />
                                ) : (
                                    mainListSize.height > 0 && (
                                        <List
                                            height={mainListSize.height}
                                            width={mainListSize.width}
                                            itemCount={taskLists.length}
                                            itemSize={LIST_ITEM_SIZE}
                                            itemData={taskLists}
                                        >
                                            {({ data, index, style }) => <ListRow data={data} index={index} style={style} />}
                                        </List>
                                    )
                                )}
                            </div>
                            {/* Calendar View */}
                             <div ref={calendarViewRef} className="w-full flex-shrink-0 h-full overflow-y-auto px-6 pb-24">
                                <div className="pt-4 -mx-1">
                                    <div className="mb-6 flex-shrink-0">
                                        <div className={`flex items-center mb-4 ${isCalendarCollapsed ? 'justify-center' : 'justify-between'}`}>
                                            {!isCalendarCollapsed && <button onClick={handlePrevMonth} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"><ChevronLeftIcon /></button>}
                                            <button onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)} className="flex items-center gap-1 font-bold text-lg text-gray-800 dark:text-gray-200 focus:outline-none rounded-md px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                <ChevronDownIcon className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isCalendarCollapsed ? 'rotate-180' : ''}`} />
                                            </button>
                                            {!isCalendarCollapsed && <button onClick={handleNextMonth} className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"><ChevronRightIcon /></button>}
                                        </div>
                                        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isCalendarCollapsed ? 'max-h-20' : 'max-h-96'}`}>
                                            <div className="grid grid-cols-7 gap-y-2 text-center">
                                                {dayHeaders.map(day => <div key={day} className="text-sm font-medium text-gray-500 dark:text-gray-400">{day}</div>)}
                                                {displayedDays.map((dayObj, index) => {
                                                    const isSelected = dayObj.date && isSameDay(dayObj.date, selectedDate);
                                                    const isToday = dayObj.date && isSameDay(dayObj.date, today);
                                                    let buttonClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700';
                                                    if (isSelected) buttonClass = 'bg-blue-600 text-white';
                                                    else if (isToday) buttonClass = 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
                                                    return (
                                                        <div key={index} className="py-1.5 flex justify-center items-center">
                                                            {dayObj.day && (<button onClick={() => dayObj.date && handleSelectDate(dayObj.date)} className={`w-8 h-8 rounded-full text-sm font-medium flex flex-col items-center justify-center transition-colors relative ${buttonClass}`}>
                                                                {dayObj.day}
                                                                {dayObj.hasTask && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />}
                                                            </button>)}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow flex flex-col">
                                        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex-shrink-0">
                                            {taskFilterMode === 'due' ? 'Tasks Due for ' : 'Tasks Starting '}
                                            {selectedDate.toLocaleString('default', { month: 'long' })} {selectedDate.getDate()}
                                        </h2>
                                        {selectedDayTasks.length === 0 ? <div className="flex-grow flex flex-col"><EmptyCalendarIllustration /></div> : (<div className="space-y-3">
                                            {selectedDayTasks.map(task => (<TaskCard key={task.id} {...task} onComplete={() => handleCompleteTask(task.id)} isCompleting={completingTaskId === task.id} onUncomplete={() => handleUncompleteTask(task.id)} onToggleSubtask={handleToggleSubtask} onToggleImportant={() => handleToggleImportant(task.id)} onToggleToday={() => handleToggleToday(task.id)} onClick={() => handleOpenTaskDetail(task)} />))}
                                        </div>)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Search Overlay */}
            <div className={`fixed inset-0 z-40 bg-gray-50 dark:bg-gray-900 flex flex-col transition-transform duration-300 ease-in-out ${isSearchVisible ? 'translate-y-0' : 'translate-y-full'}`}
                 style={{ paddingTop: `env(safe-area-inset-top)` }}>
                <div className="flex-shrink-0 px-4 pt-4 pb-3 flex items-center gap-2">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search lists..."
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <button 
                        onClick={() => { setIsSearchVisible(false); setSearchQuery(''); }}
                        className="font-semibold text-blue-600 dark:text-blue-400 px-2"
                    >
                        Cancel
                    </button>
                </div>
                
                <div ref={searchListContainerRef} className="flex-grow px-6 pb-24 pt-4">
                     {filteredTaskLists.length === 0 && searchQuery ? (
                        <div className="text-center py-16">
                            <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No lists found</p>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Try a different search term.</p>
                        </div>
                    ) : (
                        searchListSize.height > 0 && (
                            <List
                                height={searchListSize.height}
                                width={searchListSize.width}
                                itemCount={filteredTaskLists.length}
                                itemSize={LIST_ITEM_SIZE}
                                itemData={filteredTaskLists}
                            >
                                {({ data, index, style }) => <ListRow data={data} index={index} style={style} />}
                            </List>
                        )
                    )}
                </div>
            </div>

            <AddListScreen isOpen={isAddListOpen} onClose={() => setIsAddListOpen(false)} onAddList={handleAddList} />
            <EditListScreen isOpen={isEditListOpen} onClose={handleCloseEditModal} list={listToEdit} onSaveList={handleSaveList} onDeleteList={handleDeleteList} />
            <AddTaskScreen isOpen={isAddTaskOpen} onClose={() => setIsAddTaskOpen(false)} initialDate={formatDateToYYYYMMDD(selectedDate)} onAddTask={handleAddTask} />
            <TaskDetailScreen isOpen={isDetailOpen} onClose={handleCloseTaskDetail} task={selectedTask} onEdit={handleOpenEditTask} />
            <EditTaskScreen
                isOpen={isEditOpen}
                onClose={handleCloseEditTask}
                task={selectedTask}
                onSave={handleSaveTask}
            />
        </MainLayout>
    );
};

export default PlanScreen;