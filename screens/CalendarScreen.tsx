import React, { useState, useMemo } from 'react';
import MainLayout from '../components/layouts/MainLayout';
import { HamburgerMenuIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '../components/icons/Icons';
import { EmptyCalendarIllustration } from '../components/illustrations/Illustrations';
import AddTaskScreen, { NewTaskData } from './AddTaskScreen';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TaskCard from '../components/common/TaskCard';
import TaskDetailScreen from './TaskDetailScreen';
import EditTaskScreen from './EditTaskScreen';

const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const CalendarScreen: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { tasks: allTasks, lists: taskLists, addTask, updateTask } = useData();
    const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);
    const [taskFilterMode, setTaskFilterMode] = useState<'due' | 'start'>('due');
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

    // Modal and task interaction state
    const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);

    const listColorMap = useMemo(() => {
        const map = new Map<string, string>();
        taskLists.forEach(list => {
            map.set(list.name, list.color);
        });
        return map;
    }, [taskLists]);
    
    const listInfoMap = useMemo(() => {
        const map = new Map<string, { icon: string; color: string }>();
        taskLists.forEach(list => {
            map.set(list.name, { icon: list.icon, color: list.color });
        });
        return map;
    }, [taskLists]);

    const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), [currentDate]);
    const lastDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0), [currentDate]);

    const tasksByDay = useMemo(() => {
        const map = new Map<string, { due: Task[], start: Task[] }>();
        
        const ensureDay = (date: string) => {
            if (!map.has(date)) {
                map.set(date, { due: [], start: [] });
            }
        };

        allTasks.forEach(task => {
            // Due date
            if (task.dueDate) {
                ensureDay(task.dueDate);
                map.get(task.dueDate)!.due.push(task);
            }

            // Start date
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
             for(let i = 0; i < offset; i++) {
                 days.push({ day: null, date: null, hasTask: false });
             }
             for (let i = 0; i < dayCount; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                const dateString = formatDateToYYYYMMDD(date);
                const dayTasks = tasksByDay.get(dateString);
                days.push({
                    day: date.getDate(),
                    date: date,
                    hasTask: !!dayTasks && (dayTasks.due.length > 0 || dayTasks.start.length > 0),
                });
            }
            return days;
        };

        if (isCalendarCollapsed) {
            const startOfWeek = new Date(selectedDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Get Sunday
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


    const handleCompleteTask = (taskId: number) => {
        setCompletingTaskId(taskId);
        setTimeout(async () => {
            await updateTask(taskId, { completed: true });
            setCompletingTaskId(null);
        }, 300);
    };

    const handleUncompleteTask = (taskId: number) => {
        updateTask(taskId, { completed: false });
    };

    const handleToggleSubtask = (taskId: number, subtaskId: number) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const newSubtasks = task.subtasks.map(sub =>
                sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
            );
            updateTask(taskId, { subtasks: newSubtasks });
            if (selectedTask?.id === taskId) {
                setSelectedTask(prev => prev ? { ...prev, subtasks: newSubtasks } : null);
            }
        }
    };

    const handleToggleImportant = (taskId: number) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task) updateTask(taskId, { important: !task.important });
    };

    const handleToggleToday = (taskId: number) => {
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
        handleCloseEditTask();
    };


    const handleSelectDate = (date: Date) => {
        if (isSameDay(date, selectedDate)) {
            setIsAddTaskOpen(true);
        } else {
            setSelectedDate(date);
        }
    };
    
    const handleAddTask = async (newTaskData: NewTaskData) => {
        const newTask: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed'> = {
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

    const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const today = new Date();
    const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col font-sans">
                <header
                    className="px-5 pt-6 pb-4 flex justify-between items-center flex-shrink-0"
                    style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                >
                     <div className="w-6"/>
                    <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
                    <button
                        onClick={() => setTaskFilterMode(prev => prev === 'due' ? 'start' : 'due')}
                        className="text-gray-600 p-1 rounded-full hover:bg-gray-100"
                        aria-label={`Switch task view. Current: ${taskFilterMode === 'due' ? 'Due Date' : 'Start Date'}`}
                    >
                        <HamburgerMenuIcon />
                    </button>
                </header>
                
                <main className="flex-grow flex flex-col overflow-y-auto px-5 pb-24">
                    <div className="mb-6 flex-shrink-0">
                        <div className={`flex items-center mb-4 ${isCalendarCollapsed ? 'justify-center' : 'justify-between'}`}>
                             {!isCalendarCollapsed && <button onClick={handlePrevMonth} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Previous month"><ChevronLeftIcon /></button>}
                             <button 
                                onClick={() => setIsCalendarCollapsed(!isCalendarCollapsed)} 
                                className="flex items-center gap-1 font-bold text-lg text-gray-800 focus:outline-none rounded-md px-2 py-1 hover:bg-gray-100"
                                aria-expanded={!isCalendarCollapsed}
                                aria-controls="calendar-grid"
                            >
                                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isCalendarCollapsed ? 'rotate-180' : ''}`} />
                            </button>
                            {!isCalendarCollapsed && <button onClick={handleNextMonth} className="p-1 text-gray-500 hover:text-gray-800" aria-label="Next month"><ChevronRightIcon /></button>}
                        </div>
                        <div id="calendar-grid" className={`transition-all duration-500 ease-in-out overflow-hidden ${isCalendarCollapsed ? 'max-h-20' : 'max-h-96'}`}>
                            <div className="grid grid-cols-7 gap-y-2 text-center">
                                {dayHeaders.map(day => <div key={day} className="text-sm font-medium text-gray-500">{day}</div>)}
                                {displayedDays.map((dayObj, index) => {
                                    const isSelected = dayObj.date && isSameDay(dayObj.date, selectedDate);
                                    const isToday = dayObj.date && isSameDay(dayObj.date, today);
                                    let buttonClass = 'text-gray-700 hover:bg-gray-100';
                                    if (isSelected) buttonClass = 'bg-blue-600 text-white';
                                    else if (isToday) buttonClass = 'bg-gray-100 text-gray-800';

                                    return (
                                        <div key={index} className="py-1.5 flex justify-center items-center">
                                            {dayObj.day && (
                                                <button 
                                                    onClick={() => dayObj.date && handleSelectDate(dayObj.date)}
                                                    className={`w-8 h-8 rounded-full text-sm font-medium flex flex-col items-center justify-center transition-colors relative ${buttonClass}`}
                                                >
                                                    {dayObj.day}
                                                    {dayObj.hasTask && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow flex flex-col">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex-shrink-0">
                            {taskFilterMode === 'due' ? 'Tasks Due for ' : 'Tasks Starting '}
                            {selectedDate.toLocaleString('default', { month: 'long' })} {selectedDate.getDate()}
                        </h2>
                        {selectedDayTasks.length === 0 ? (
                            <div className="flex-grow flex flex-col">
                                <EmptyCalendarIllustration />
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedDayTasks.map(task => {
                                    const listInfo = listInfoMap.get(task.category) || { icon: '📝', color: 'gray' };
                                    return (
                                        <TaskCard 
                                            key={task.id} 
                                            {...task}
                                            color={listInfo.color}
                                            categoryIcon={listInfo.icon}
                                            onComplete={handleCompleteTask}
                                            isCompleting={completingTaskId === task.id}
                                            onUncomplete={handleUncompleteTask}
                                            onToggleSubtask={handleToggleSubtask}
                                            onToggleImportant={handleToggleImportant}
                                            onClick={() => handleOpenTaskDetail(task)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>
            <AddTaskScreen 
                isOpen={isAddTaskOpen}
                onClose={() => setIsAddTaskOpen(false)}
                initialDate={formatDateToYYYYMMDD(selectedDate)}
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
        </MainLayout>
    );
};

export default CalendarScreen;