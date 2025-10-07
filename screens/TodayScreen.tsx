import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import TaskCard from '../components/common/TaskCard';
import { RecommendIcon, OverdueIcon, ChevronDownIcon, RefreshSpinnerIcon, SparklesIcon, TimelineIcon, ListsIcon, PlusIconHeader, LockIcon } from '../components/icons/Icons';
import RecommendTasksScreen from './RecommendTasksScreen';
import OverdueTasksScreen from './OverdueTasksScreen';
import AddTaskScreen, { NewTaskData } from './AddTaskScreen';
import TaskDetailScreen from './TaskDetailScreen';
import EditTaskScreen from './EditTaskScreen';
import SettingsScreen from './settings/SettingsScreen';
import { EmptyTodayIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import SyncStatusIndicator from '../components/common/SyncStatusIndicator';
import TimePickerModal from './TimePickerModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import TimelineView from '../components/views/TimelineView';
import DurationPickerModal from './DurationPickerModal';

const parseDateAsLocal = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
};

const TodayScreen: React.FC = () => {
    const { 
        tasks: allTasks, 
        lists: taskLists, 
        profile,
        addTask,
        updateTask,
        syncData
    } = useData();
    const [completingTaskId, setCompletingTaskId] = useState<number | string | null>(null);
    const [uncompletingTaskId, setUncompletingTaskId] = useState<number | string | null>(null);
    const [justUncompletedId, setJustUncompletedId] = useState<number | string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');
    
    // Modal states
    const [isRecommendOpen, setIsRecommendOpen] = useState(false);
    const [isOverdueOpen, setIsOverdueOpen] = useState(false);
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isDurationPickerOpen, setIsDurationPickerOpen] = useState(false);
    const [isTimeChangeConfirmOpen, setIsTimeChangeConfirmOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [timeToSet, setTimeToSet] = useState<string | null>(null);
    const [editInitialTab, setEditInitialTab] = useState<'Basic' | 'Schedule' | 'Subtask'>('Basic');
    const [expandedTaskIds, setExpandedTaskIds] = useState(() =>
        new Set(allTasks.filter(t => !t.completed && t.subtasks && t.subtasks.length > 0).map(t => t.id))
    );
    const [isPlanning, setIsPlanning] = useState(false);
    const [isFinishedTasksVisible, setIsFinishedTasksVisible] = useState(true);
    const [isPlanConfirmOpen, setIsPlanConfirmOpen] = useState(false);
    const [fixedTasksToConvert, setFixedTasksToConvert] = useState<Task[]>([]);
    const [planningTrigger, setPlanningTrigger] = useState(0);

    // Pull to refresh and swipe state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDelta, setPullDelta] = useState(0);
    const gestureStart = useRef<{ x: number; y: number } | null>(null);
    const gestureType = useRef<'none' | 'vertical' | 'horizontal'>('none');
    const listViewRef = useRef<HTMLDivElement>(null);
    const timelineViewRef = useRef<HTMLDivElement>(null);
    const REFRESH_THRESHOLD = 80;
    const MIN_SWIPE_DISTANCE = 50;


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
    
    const { recommendedTasks, overdueTasks } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const recTasks: (Task & { reason: string })[] = [];
        const ovdTasks: (Task & { reason: string })[] = [];
        const recommendedIds = new Set<number | string>();
        const overdueIds = new Set<number | string>();

        allTasks.forEach(task => {
            if (task.completed || task.today) return;

            const dueDate = parseDateAsLocal(task.dueDate);
            const startDate = parseDateAsLocal(task.startDate);

            // Overdue logic
            if (dueDate && dueDate < today) {
                if (!overdueIds.has(task.id)) {
                    const daysAgo = Math.max(1, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)));
                    const reason = daysAgo === 1 ? 'Due yesterday' : `Due ${daysAgo} days ago`;
                    ovdTasks.push({ ...task, reason });
                    overdueIds.add(task.id);
                }
            } else if (startDate && startDate < today) {
                 if (!overdueIds.has(task.id)) {
                    const daysAgo = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (1000 * 3600 * 24)));
                    const reason = daysAgo === 1 ? 'Should have started yesterday' : `Should have started ${daysAgo} days ago`;
                    ovdTasks.push({ ...task, reason });
                    overdueIds.add(task.id);
                }
            }

            // Recommend logic
            if (dueDate && dueDate >= today && dueDate <= threeDaysFromNow) {
                if (!recommendedIds.has(task.id)) {
                    recTasks.push({ ...task, reason: 'Due in the next 3 days' });
                    recommendedIds.add(task.id);
                }
            }
            
            if (task.important && dueDate && dueDate >= startOfWeek && dueDate <= endOfWeek) {
                 if (!recommendedIds.has(task.id)) {
                    recTasks.push({ ...task, reason: 'Important this week' });
                    recommendedIds.add(task.id);
                }
            }
        });

        return { recommendedTasks: recTasks, overdueTasks: ovdTasks };
    }, [allTasks]);

    const { unfinishedTasks, finishedTasks, tasksToSchedule } = useMemo(() => {
        const todayTasks = allTasks.filter(task => task.today);
        const finished = todayTasks.filter(task => task.completed);
        const unfinished = todayTasks.filter(task => !task.completed);
        
        unfinished.sort((a, b) => {
            const isAScheduled = !!a.startTime;
            const isBScheduled = !!b.startTime;

            if (isAScheduled && !isBScheduled) return -1;
            if (!isAScheduled && isBScheduled) return 1;
            if (isAScheduled && isBScheduled) {
                return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
            }
            return 0; // Keep original order for flexible tasks
        });

        const toSchedule = unfinished.filter(t => !t.startTime);

        return { unfinishedTasks: unfinished, finishedTasks: finished, tasksToSchedule: toSchedule };
    }, [allTasks]);

    const totalTodayTasks = unfinishedTasks.length + finishedTasks.length;
    const progress = totalTodayTasks > 0 ? (finishedTasks.length / totalTodayTasks) * 100 : 0;


    // FIX: Changed taskId to allow string for temporary items
    const handleCompleteTask = (taskId: number | string) => {
        setCompletingTaskId(taskId);
        setExpandedTaskIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
        });

        setTimeout(async () => {
            try {
                await updateTask(taskId, { completed: true });
            } catch (error) {
                console.error("Failed to complete task", error);
                // Optionally revert UI change
            } finally {
                setCompletingTaskId(null);
            }
        }, 600);
    };

    // FIX: Changed taskId to allow string for temporary items
    const handleUncompleteTask = (taskId: number | string) => {
        setUncompletingTaskId(taskId);
        const taskToUncomplete = allTasks.find(t => t.id === taskId);
        if (taskToUncomplete?.subtasks?.length) {
             setExpandedTaskIds(prev => new Set(prev).add(taskId));
        }

        setTimeout(async () => {
            try {
                await updateTask(taskId, { completed: false });
                setJustUncompletedId(taskId);
            } catch (error) {
                console.error("Failed to uncomplete task", error);
            } finally {
                setUncompletingTaskId(null);
            }
        }, 300);
    };
    
    // FIX: Changed taskId to allow string for temporary items
    const handleAddTaskToToday = (taskId: number | string) => {
        updateTask(taskId, { today: true });
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
            setSelectedTask({ ...task, today: true });
            setEditInitialTab('Schedule');
            setIsEditOpen(true);
        }
    };

    // FIX: Changed taskId to allow string for temporary items
    const handleToggleSubtask = (taskId: number | string, subtaskId: number) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task && task.subtasks) {
            const newSubtasks = task.subtasks.map(sub =>
                sub.id === subtaskId ? { ...sub, completed: !sub.completed } : sub
            );
            updateTask(taskId, { subtasks: newSubtasks });
            if (selectedTask && selectedTask.id === taskId) {
                 setSelectedTask(prev => prev ? {...prev, subtasks: newSubtasks} : null);
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
    
    // FIX: Changed taskId to allow string for temporary items
    const handleToggleTaskType = (taskId: number | string) => {
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;

        const newType = task.type === 'Fixed' ? 'Flexible' : 'Fixed';
        updateTask(taskId, { type: newType });
    };

    // FIX: Changed taskId to allow string for temporary items
    const handleToggleExpansion = (taskId: number | string) => {
        setExpandedTaskIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId);
            else newSet.add(taskId);
            return newSet;
        });
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
        setEditInitialTab('Basic');
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
    
    const handleOpenTimePicker = (task: Task) => {
        setSelectedTask(task);
        if (task.startTime) {
            setIsTimeChangeConfirmOpen(true);
        } else {
            setIsTimePickerOpen(true);
        }
    };

    const handleConfirmTimeChange = () => {
        setIsTimeChangeConfirmOpen(false);
        setIsTimePickerOpen(true);
    };

    const handleCloseTimePicker = () => {
        setIsTimePickerOpen(false);
        setTimeout(() => {
            if (!isDurationPickerOpen) { // Only clear if we are not chaining to duration picker
                setSelectedTask(null);
            }
        }, 300);
    };
    
    const handleClearTime = async () => {
        if (selectedTask) {
            await updateTask(selectedTask.id, { startTime: undefined });
        }
        handleCloseTimePicker();
    };
    
    const handleCloseDurationPicker = () => {
        setIsDurationPickerOpen(false);
        setTimeout(() => {
            setSelectedTask(null);
            setTimeToSet(null);
        }, 300);
    };

    const handleTimeSelect = async (time: string) => {
        if (selectedTask) {
            setTimeToSet(time);
            setIsTimePickerOpen(false);
            if (!selectedTask.duration) {
                setIsDurationPickerOpen(true);
            } else {
                 await updateTask(selectedTask.id, { startTime: time, time });
                 handleCloseDurationPicker();
            }
        }
    };
    
    const handleDurationSelect = async (duration: number) => {
        if (selectedTask) {
            const updates: Partial<Task> = { 
                duration: duration
            };
            if (timeToSet) {
                updates.startTime = timeToSet;
                updates.time = timeToSet;
            }
            await updateTask(selectedTask.id, updates);
        }
        handleCloseDurationPicker();
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

    const timeToMinutes = (timeStr: string): number => {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };
    
    const minutesToTime = (totalMinutes: number): string => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    const executePlanningLogic = async () => {
        setIsPlanning(true);
        try {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const workStartMinutes = 8 * 60 + 30; // 8:30 AM
            const lunchStartMinutes = 11 * 60 + 30; // 11:30 AM
            const lunchEndMinutes = 13 * 60; // 1:00 PM
            const dinnerStartMinutes = 17 * 60 + 30; // 5:30 PM
            const dinnerEndMinutes = 18 * 60; // 6:00 PM
            const workEndMinutes = 21 * 60; // 9:00 PM
            const scheduleStartMinutes = Math.max(currentMinutes, workStartMinutes);

            if (scheduleStartMinutes >= workEndMinutes) {
                alert("It's too late to plan your day. No available time slots remain.");
                return;
            }

            const busyBlocks = unfinishedTasks
                .filter(task => task.startTime && task.duration)
                .map(task => ({ start: timeToMinutes(task.startTime!), end: timeToMinutes(task.startTime!) + (task.duration || 0) }));
            busyBlocks.push({ start: lunchStartMinutes, end: lunchEndMinutes });
            busyBlocks.push({ start: dinnerStartMinutes, end: dinnerEndMinutes });
            busyBlocks.sort((a, b) => a.start - b.start);

            const availableSlots: { start: number, end: number }[] = [];
            let lastBusyEnd = scheduleStartMinutes;
            for (const block of busyBlocks) {
                if (block.start > lastBusyEnd) availableSlots.push({ start: lastBusyEnd, end: block.start });
                lastBusyEnd = Math.max(lastBusyEnd, block.end);
            }
            if (workEndMinutes > lastBusyEnd) availableSlots.push({ start: lastBusyEnd, end: workEndMinutes });
            
            const slotsCopy = JSON.parse(JSON.stringify(availableSlots));
            const tasksToScheduleSorted = [...tasksToSchedule].sort((a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0));
            const updates: { taskId: string | number, updates: Partial<Task> }[] = [];
            const unscheduledTasksList: Task[] = [];

            for (const task of tasksToScheduleSorted) {
                let scheduled = false;
                const taskDuration = task.duration || 30;
                for (const slot of slotsCopy) {
                    if (slot.end - slot.start >= taskDuration) {
                        const newStartTime = minutesToTime(slot.start);
                        const taskUpdate: Partial<Task> = { startTime: newStartTime, time: newStartTime };
                        if (!task.duration) taskUpdate.duration = 30;
                        updates.push({ taskId: task.id, updates: taskUpdate });
                        slot.start += taskDuration;
                        scheduled = true;
                        break;
                    }
                }
                if (!scheduled) unscheduledTasksList.push(task);
            }
            
            if (updates.length > 0) await Promise.all(updates.map(u => updateTask(u.taskId, u.updates)));
            
            if (unscheduledTasksList.length > 0) {
                const scheduledCount = updates.length;
                const unscheduledTitles = unscheduledTasksList.map(t => t.title).join(', ');
                let message = scheduledCount > 0 
                    ? `Successfully scheduled ${scheduledCount} task(s). The following could not be scheduled: ${unscheduledTitles}.`
                    : `Could not schedule: ${unscheduledTitles}.`;
                alert(message);
            } else if (updates.length === 0 && tasksToSchedule.length > 0) {
                alert("No available time slots to fit your tasks.");
            }
        } catch (error) {
            console.error("Failed to plan day:", error);
            alert("An error occurred while planning your day.");
        } finally {
            setIsPlanning(false);
        }
    };

    useEffect(() => {
        if (planningTrigger > 0) {
            executePlanningLogic();
        }
    }, [planningTrigger]);

    const handlePlanMyDay = () => {
        const fixedWithoutTime = unfinishedTasks.filter(t => t.type === 'Fixed' && !t.startTime);
        if (fixedWithoutTime.length > 0) {
            setFixedTasksToConvert(fixedWithoutTime);
            setIsPlanConfirmOpen(true);
        } else {
            setPlanningTrigger(Date.now());
        }
    };

    const handleConfirmAndPlan = async () => {
        setIsPlanConfirmOpen(false);
        await Promise.all(
            fixedTasksToConvert.map(t => updateTask(t.id, { type: 'Flexible' }))
        );
        setPlanningTrigger(Date.now());
    };


    // Combined handlers for pull-to-refresh and swipe
    const handleTouchStart = (e: React.TouchEvent) => {
        gestureStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        gestureType.current = 'none';

        const activeScrollView = viewMode === 'list' ? listViewRef.current : timelineViewRef.current;
        if (activeScrollView?.scrollTop !== 0) {
            // Can't pull to refresh, disable vertical gesture detection for this touch
            gestureStart.current.y = -1;
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
            if (distance > MIN_SWIPE_DISTANCE && viewMode === 'list') {
                setViewMode('timeline');
            } else if (distance < -MIN_SWIPE_DISTANCE && viewMode === 'timeline') {
                setViewMode('list');
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


    if (!profile) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <svg className="w-10 h-10 animate-ios-spinner text-gray-500" viewBox="0 0 50 50">
                    <circle className="animate-ios-spinner-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
            </div>
        );
    }

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-14 flex justify-center items-center transition-opacity duration-300 pointer-events-none ${pullDelta > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
                    {isRefreshing ? <RefreshSpinnerIcon /> : <ChevronDownIcon className={`w-6 h-6 text-gray-500 transition-transform duration-300 ${pullDelta > REFRESH_THRESHOLD ? 'rotate-180' : ''}`} />}
                </div>

                <div 
                    className="h-full flex flex-col"
                    style={{ transform: `translateY(${isRefreshing ? 56 : pullDelta}px)`, transition: pullDelta === 0 || isRefreshing ? 'transform 0.3s' : 'none' }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <header
                        className="px-6 pt-6 pb-4 grid grid-cols-[auto_1fr_auto] items-center gap-4 flex-shrink-0"
                        style={{ paddingTop: `calc(1.5rem + env(safe-area-inset-top))` }}
                    >
                        <div className="flex justify-start">
                            <SyncStatusIndicator profile={profile} onClick={() => setIsSettingsOpen(true)} />
                        </div>
                        <div className="flex justify-center">
                            <div className="grid grid-cols-2 bg-gray-200 rounded-lg p-1 w-full max-w-48">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => setViewMode('timeline')}
                                    className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}
                                >
                                    Timeline
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end">
                             <button className="text-gray-800" onClick={() => setIsAddTaskOpen(true)}>
                                <PlusIconHeader />
                            </button>
                        </div>
                    </header>


                    <main className="overflow-hidden flex-grow flex flex-col">
                        <div
                            className="flex h-full transition-transform duration-300 ease-out"
                            style={{ transform: viewMode === 'list' ? 'translateX(0%)' : 'translateX(-100%)' }}
                        >
                            {/* List View */}
                            <div ref={listViewRef} className="w-full flex-shrink-0 h-full overflow-y-auto px-6 pb-24 flex flex-col pt-4">
                                {(recommendedTasks.length > 0 || overdueTasks.length > 0) && (
                                    <div className={`p-3 rounded-xl mb-4 text-sm flex items-center gap-3 flex-shrink-0 ${
                                        overdueTasks.length > 0
                                            ? 'bg-red-50 border-red-200'
                                            : 'bg-blue-50 border-blue-200'
                                    }`}>
                                        {overdueTasks.length > 0 ? <OverdueIcon /> : <RecommendIcon />}
                                        <p className={`flex-grow ${overdueTasks.length > 0 ? 'text-red-800' : 'text-blue-800'}`}>
                                            {overdueTasks.length > 0 && (
                                                <>
                                                    <button onClick={() => setIsOverdueOpen(true)} className="font-semibold hover:underline focus:outline-none">
                                                        {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
                                                    </button>
                                                    {recommendedTasks.length > 0 ? ' and ' : ' need attention.'}
                                                </>
                                            )}
                                            {recommendedTasks.length > 0 && (
                                                <>
                                                    <button onClick={() => setIsRecommendOpen(true)} className={`font-semibold hover:underline focus:outline-none ${overdueTasks.length > 0 ? 'text-blue-600' : ''}`}>
                                                        {recommendedTasks.length} recommended
                                                    </button>
                                                    {overdueTasks.length > 0 
                                                        ? ' tasks.' 
                                                        : ` task${recommendedTasks.length > 1 ? 's are' : ' is'} available.`}
                                                </>
                                            )}
                                        </p>
                                    </div>
                                )}

                                {totalTodayTasks > 0 ? (
                                    <>
                                        <div className="mb-4 flex-shrink-0">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-baseline gap-2">
                                                    <h2 className="text-lg font-bold text-gray-800">Today's Tasks</h2>
                                                    <span className="text-sm font-medium text-gray-500">{finishedTasks.length}/{totalTodayTasks}</span>
                                                </div>
                                                {tasksToSchedule.length > 0 && (
                                                    <button
                                                        onClick={handlePlanMyDay}
                                                        disabled={isPlanning}
                                                        className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-xs transition-colors ease-in-out bg-indigo-100 text-indigo-600 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-indigo-50 disabled:text-indigo-300 disabled:cursor-not-allowed"
                                                        aria-label="Plan My Day"
                                                    >
                                                        {isPlanning ? (
                                                            <RefreshSpinnerIcon />
                                                        ) : (
                                                            <>
                                                                <SparklesIcon className="w-4 h-4" />
                                                                <span>Plan</span>
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {unfinishedTasks.length > 0 && (
                                                <section>
                                                    <div className="bg-white rounded-xl card-shadow overflow-hidden divide-y divide-gray-200/60">
                                                        {unfinishedTasks.map(task => {
                                                            const listInfo = listInfoMap.get(task.category) || { icon: '📝', color: 'gray' };
                                                            const timeParts = task.startTime ? task.startTime.split(':').map(Number) : null;
                                                            let displayHour: number | string = '';
                                                            let displayMinute: string = '';
                                                            let displayPeriod: string = '';

                                                            if (timeParts) {
                                                                const [h, m] = timeParts;
                                                                displayMinute = String(m).padStart(2, '0');
                                                                displayPeriod = h >= 12 ? 'pm' : 'am';
                                                                let hour12 = h % 12;
                                                                if (hour12 === 0) hour12 = 12;
                                                                displayHour = hour12;
                                                            }

                                                            return (
                                                                <div key={task.id as React.Key} className="flex items-start">
                                                                    <div className="w-20 shrink-0 flex flex-col items-center pt-3.5 pb-2">
                                                                        <button
                                                                            onClick={(e) => { e.stopPropagation(); handleOpenTimePicker(task); }}
                                                                            className="flex items-start justify-center w-full focus:outline-none rounded-md focus:ring-2 focus:ring-blue-300 h-[36px]"
                                                                            aria-label={`Set start time for ${task.title}`}
                                                                        >
                                                                            {task.startTime ? (
                                                                                <div className="flex">
                                                                                    <span className="text-3xl font-bold text-gray-800 leading-none tracking-tight">{displayHour}</span>
                                                                                    <div className="flex flex-col items-start font-semibold text-gray-500 leading-tight ml-0.5 text-[11px] mt-0.5">
                                                                                        <span>{displayMinute}</span>
                                                                                        <span className="-mt-0.5">{displayPeriod}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}
                                                                        </button>
                                                                         <div className="h-5 flex items-center">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleToggleTaskType(task.id); }}
                                                                                className="p-1 -m-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                                                aria-label={`Toggle task type for ${task.title}. Current: ${task.type}`}
                                                                            >
                                                                                <LockIcon className={`w-3.5 h-3.5 transition-colors ${task.type === 'Fixed' ? 'text-gray-600' : 'text-gray-300'}`} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-grow min-w-0">
                                                                        <TaskCard 
                                                                            variant="list"
                                                                            {...task}
                                                                            color={listInfo.color}
                                                                            categoryIcon={listInfo.icon}
                                                                            onComplete={() => handleCompleteTask(task.id)}
                                                                            isCompleting={completingTaskId === task.id}
                                                                            onToggleSubtask={handleToggleSubtask}
                                                                            onToggleImportant={() => handleToggleImportant(task.id)}
                                                                            onClick={() => handleOpenTaskDetail(task)}
                                                                            isJustUncompleted={justUncompletedId === task.id}
                                                                            onUncompleteAnimationEnd={() => setJustUncompletedId(null)}
                                                                            hideSubtasks={!expandedTaskIds.has(task.id)}
                                                                            onToggleSubtaskVisibility={() => handleToggleExpansion(task.id)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </section>
                                            )}

                                            {finishedTasks.length > 0 && (
                                                <section>
                                                    <button 
                                                        onClick={() => setIsFinishedTasksVisible(!isFinishedTasksVisible)}
                                                        className="w-full flex justify-between items-center mb-3"
                                                        aria-expanded={isFinishedTasksVisible}
                                                    >
                                                        <h2 className="text-base font-bold text-gray-800">Finished Tasks ({finishedTasks.length})</h2>
                                                        <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isFinishedTasksVisible ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isFinishedTasksVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                        <div className="overflow-hidden">
                                                            <div className="bg-white rounded-xl card-shadow overflow-hidden divide-y divide-gray-200/60">
                                                                {finishedTasks.map(task => {
                                                                    const listInfo = listInfoMap.get(task.category) || { icon: '📝', color: 'gray' };
                                                                    return (
                                                                        <div key={task.id as React.Key} className="flex items-start">
                                                                            <div className="w-20 shrink-0" /> {/* Placeholder for alignment */}
                                                                            <div className="flex-grow min-w-0">
                                                                                <TaskCard 
                                                                                    variant="list"
                                                                                    {...task} 
                                                                                    color={listInfo.color}
                                                                                    categoryIcon={listInfo.icon}
                                                                                    onClick={() => handleOpenTaskDetail(task)} 
                                                                                    onUncomplete={() => handleUncompleteTask(task.id)} 
                                                                                    isUncompleting={uncompletingTaskId === task.id}
                                                                                    hideSubtasks={!expandedTaskIds.has(task.id)}
                                                                                    onToggleSubtaskVisibility={() => handleToggleExpansion(task.id)}
                                                                                    onToggleImportant={() => handleToggleImportant(task.id)}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </section>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                     <div className="flex-grow">
                                        <EmptyTodayIllustration onAddTask={() => setIsAddTaskOpen(true)} />
                                    </div>
                                )}
                            </div>

                            {/* Timeline View */}
                            <div ref={timelineViewRef} className="w-full flex-shrink-0 h-full overflow-y-auto pb-24">
                                <TimelineView
                                    tasks={allTasks}
                                    lists={taskLists}
                                    onUnscheduledTaskClick={handleOpenTimePicker}
                                    onScheduledTaskShortPress={handleOpenTaskDetail}
                                    onScheduledTaskLongPress={handleOpenTimePicker}
                                    onCompleteTask={handleCompleteTask}
                                    onUncompleteTask={handleUncompleteTask}
                                    completingTaskId={completingTaskId}
                                    uncompletingTaskId={uncompletingTaskId}
                                />
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            <RecommendTasksScreen 
                isOpen={isRecommendOpen}
                onClose={() => setIsRecommendOpen(false)}
                tasks={recommendedTasks}
                onAddTaskToToday={handleAddTaskToToday}
                listInfoMap={listInfoMap}
            />
            <OverdueTasksScreen
                isOpen={isOverdueOpen}
                onClose={() => setIsOverdueOpen(false)}
                tasks={overdueTasks}
                onAddTaskToToday={handleAddTaskToToday}
                listInfoMap={listInfoMap}
            />
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
                initialTab={editInitialTab}
            />
            <SettingsScreen 
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
            <TimePickerModal
                isOpen={isTimePickerOpen}
                onClose={handleCloseTimePicker}
                onTimeSelect={handleTimeSelect}
                initialTime={selectedTask?.startTime}
                onClearTime={handleClearTime}
            />
             <DurationPickerModal
                isOpen={isDurationPickerOpen}
                onClose={handleCloseDurationPicker}
                onDurationSelect={handleDurationSelect}
                initialDuration={selectedTask?.duration}
            />
            <ConfirmationModal
                isOpen={isTimeChangeConfirmOpen}
                onClose={() => setIsTimeChangeConfirmOpen(false)}
                onConfirm={handleConfirmTimeChange}
                title="Change Start Time?"
                message="This task already has a scheduled time. Are you sure you want to change it?"
                confirmText="Change"
                confirmVariant="primary"
            />
            <ConfirmationModal
                isOpen={isPlanConfirmOpen}
                onClose={() => setIsPlanConfirmOpen(false)}
                onConfirm={handleConfirmAndPlan}
                title="Fixed Tasks Found"
                message={`You have ${fixedTasksToConvert.length} fixed task(s) without a start time. To auto-plan, they can be converted to flexible tasks. Or you can go back and schedule them manually.`}
                confirmText="Convert & Plan"
                cancelText="Go Back"
                confirmVariant="primary"
            />
        </MainLayout>
    );
};

export default TodayScreen;