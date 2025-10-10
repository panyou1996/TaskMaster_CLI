
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../components/layouts/MainLayout';
import TaskCard from '../components/common/TaskCard';
import { RecommendIcon, OverdueIcon, ChevronDownIcon, RefreshSpinnerIcon, SparklesIcon, TimelineIcon, ListsIcon, PlusIconHeader, LockIcon, FocusHeaderIcon, SettingsHeaderIcon } from '../components/icons/Icons';
import RecommendTasksScreen from './RecommendTasksScreen';
import OverdueTasksScreen from './OverdueTasksScreen';
import AddTaskScreen, { NewTaskData } from './AddTaskScreen';
import TaskDetailScreen from './TaskDetailScreen';
import EditTaskScreen from './EditTaskScreen';
import { EmptyTodayIllustration } from '../components/illustrations/Illustrations';
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import TimePickerModal from './TimePickerModal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import TimelineView from '../components/views/TimelineView';
import DurationPickerModal from './DurationPickerModal';
import usePlanningSettings, { PlanningSettings } from '../hooks/usePlanningSettings';
import PlanningSettingsDrawer from './PlanningSettingsDrawer';
import useLocalStorage from '../hooks/useLocalStorage';
import { triggerHapticImpact, triggerHapticNotification, triggerHapticSelection } from '../utils/permissions';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';

const parseDateAsLocal = (dateString?: string): Date | null => {
    if (!dateString) return null;
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
};

// --- Planning Algorithm Logic ---

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

const runSequentialPlanning = (
    flexibleTasks: Task[],
    scheduledTasks: Task[],
    settings: PlanningSettings
): { taskId: string | number, updates: Partial<Task> }[] => {
    const { taskGap, workStartTime, workEndTime, lunchStartTime, lunchEndTime, dinnerStartTime, dinnerEndTime } = settings;

    let busySlots = scheduledTasks
        .filter(t => t.startTime && t.duration)
        .map(t => ({
            start: timeToMinutes(t.startTime!),
            end: timeToMinutes(t.startTime!) + t.duration!
        }));

    busySlots.push(
        { start: timeToMinutes(lunchStartTime), end: timeToMinutes(lunchEndTime) },
        { start: timeToMinutes(dinnerStartTime), end: timeToMinutes(dinnerEndTime) }
    );
    
    busySlots = busySlots.sort((a, b) => a.start - b.start);

    const mergedBusySlots: { start: number, end: number }[] = [];
    if (busySlots.length > 0) {
        mergedBusySlots.push({ ...busySlots[0] });
        for (let i = 1; i < busySlots.length; i++) {
            const last = mergedBusySlots[mergedBusySlots.length - 1];
            const current = busySlots[i];
            if (current.start < last.end) {
                last.end = Math.max(last.end, current.end);
            } else {
                mergedBusySlots.push({ ...current });
            }
        }
    }

    const updates: { taskId: string | number, updates: Partial<Task> }[] = [];
    
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    // Round up to the next 15-minute interval
    const roundedNowMinutes = Math.ceil(nowMinutes / 15) * 15;
    const effectiveWorkStartMinutes = timeToMinutes(workStartTime);
    let currentTime = Math.max(effectiveWorkStartMinutes, roundedNowMinutes);

    const workEndMinutes = timeToMinutes(workEndTime);

    for (const task of flexibleTasks) {
        const duration = task.duration || 30;
        let foundSlot = false;
        let potentialStartTime = currentTime;

        while (!foundSlot) {
            const taskStart = potentialStartTime;
            const taskEnd = taskStart + duration;

            if (taskStart >= workEndMinutes + 240) { // Safety break to prevent infinite loops
                break; 
            }

            let conflict = false;
            for (const slot of mergedBusySlots) {
                if (taskStart < slot.end && taskEnd > slot.start) {
                    conflict = true;
                    potentialStartTime = slot.end + taskGap;
                    break;
                }
            }

            if (!conflict) {
                foundSlot = true;
                const newStartTime = minutesToTime(taskStart);
                updates.push({ taskId: task.id, updates: { startTime: newStartTime, time: newStartTime } });
                
                const newSlot = { start: taskStart, end: taskEnd };
                mergedBusySlots.push(newSlot);
                mergedBusySlots.sort((a, b) => a.start - b.start);
                
                currentTime = taskEnd + taskGap;
            }
        }
    }
    
    return updates;
};

const runWeightedPlanning = (
    flexibleTasks: Task[],
    scheduledTasks: Task[],
    settings: PlanningSettings
): { taskId: string | number, updates: Partial<Task> }[] => {
    
    const getPermutations = (arr: Task[]): Task[][] => {
        const output: Task[][] = [];
        const swap = (array: Task[], i: number, j: number) => { [array[i], array[j]] = [array[j], array[i]]; };
        const generate = (k: number, heapArr: Task[]) => {
            if (k === 1) {
                output.push([...heapArr]);
                return;
            }
            generate(k - 1, heapArr);
            for (let i = 0; i < k - 1; i++) {
                if (k % 2 === 0) swap(heapArr, i, k - 1);
                else swap(heapArr, 0, k - 1);
                generate(k - 1, heapArr);
            }
        };
        generate(arr.length, [...arr]);
        return output;
    };
    
    const allPermutations = getPermutations(flexibleTasks);
    let bestPlan: { updates: { taskId: string | number, updates: Partial<Task> }[], weight: number } | null = null;
    
    const workEndMins = timeToMinutes(settings.workEndTime);
    const lunchSlot = { start: timeToMinutes(settings.lunchStartTime), end: timeToMinutes(settings.lunchEndTime) };
    const dinnerSlot = { start: timeToMinutes(settings.dinnerStartTime), end: timeToMinutes(settings.dinnerEndTime) };
    const originalBusySlots = scheduledTasks.filter(t => t.startTime && t.duration).map(t => ({ start: timeToMinutes(t.startTime!), end: timeToMinutes(t.startTime!) + t.duration! }));
    const allFixedSlots = [...originalBusySlots, lunchSlot, dinnerSlot];

    for (const permutation of allPermutations) {
        const simulationResult = runSequentialPlanning(permutation, scheduledTasks, settings);
        
        let weight = 0;
        
        const scheduledPermutation: (Task & { scheduledStartTime: string })[] = [];
        permutation.forEach(task => {
            const update = simulationResult.find(u => u.taskId === task.id);
            if (update?.updates.startTime) {
                 scheduledPermutation.push({ ...task, scheduledStartTime: update.updates.startTime });
            }
        });
        
        if (scheduledPermutation.length !== permutation.length) {
            weight = Infinity;
        } else {
            let crossCount = 0;
            scheduledPermutation.forEach((task, index) => {
                if (task.important) weight += index * 2;
                
                const taskStartMins = timeToMinutes(task.scheduledStartTime);
                for (const fixedSlot of allFixedSlots) {
                    if (taskStartMins === fixedSlot.end + settings.taskGap) {
                        crossCount++;
                        break;
                    }
                }
            });
            weight += crossCount * 1;
            
            const lastTask = scheduledPermutation[scheduledPermutation.length - 1];
            if(lastTask) {
                const lastEndTime = timeToMinutes(lastTask.scheduledStartTime) + (lastTask.duration || 0);
                if (lastEndTime > workEndMins) {
                    const overtimeHours = (lastEndTime - workEndMins) / 60;
                    weight += overtimeHours * 2;
                }
            }
        }
        
        if (bestPlan === null || weight < bestPlan.weight) {
            bestPlan = { updates: simulationResult, weight };
        }
    }
    
    return bestPlan ? bestPlan.updates : [];
};

// --- React Component ---

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
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isDurationPickerOpen, setIsDurationPickerOpen] = useState(false);
    const [isTimeChangeConfirmOpen, setIsTimeChangeConfirmOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [timeToSet, setTimeToSet] = useState<string | null>(null);
    const [isPlanning, setIsPlanning] = useState(false);
    const [isPlanConfirmOpen, setIsPlanConfirmOpen] = useState(false);
    const [fixedTasksToConvert, setFixedTasksToConvert] = useState<Task[]>([]);
    const [planningTrigger, setPlanningTrigger] = useState(0);

    const [isFinishedTasksVisible, setIsFinishedTasksVisible] = useLocalStorage('today_finished_tasks_visible', true);
    
    const [rawExpandedTaskIds, setRawExpandedTaskIds] = useLocalStorage<Array<string|number>|null>('today_expanded_task_ids', null);

    const defaultExpandedIds = useMemo(() =>
        new Set(allTasks.filter(t => !t.completed && t.subtasks && t.subtasks.length > 0).map(t => t.id)),
    [allTasks]);

    const expandedTaskIds = useMemo(() => {
        if (rawExpandedTaskIds !== null) {
            return new Set(rawExpandedTaskIds);
        }
        return defaultExpandedIds;
    }, [rawExpandedTaskIds, defaultExpandedIds]);

    const setExpandedTaskIds = useCallback((setter: (prev: Set<string|number>) => Set<string|number>) => {
        const newSet = setter(expandedTaskIds);
        setRawExpandedTaskIds(Array.from(newSet));
    }, [expandedTaskIds, setRawExpandedTaskIds]);

    // New planning settings state
    const [planningSettings] = usePlanningSettings();
    const [isPlanningSettingsOpen, setIsPlanningSettingsOpen] = useState(false);
    const [isAlgorithmChoiceOpen, setIsAlgorithmChoiceOpen] = useState(false);
    const [algorithmToRun, setAlgorithmToRun] = useState<'sequential' | 'weighted' | null>(null);

    // Pull to refresh and swipe state
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDelta, setPullDelta] = useState(0);
    const gestureStart = useRef<{ x: number; y: number } | null>(null);
    const gestureType = useRef<'none' | 'vertical' | 'horizontal'>('none');
    const listViewRef = useRef<HTMLDivElement>(null);
    const timelineViewRef = useRef<HTMLDivElement>(null);
    const REFRESH_THRESHOLD = 80;
    const MIN_SWIPE_DISTANCE = 50;

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // Update every minute to check overdue status
        return () => clearInterval(timer);
    }, []);


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
            const isFixedForAnotherDay = task.type === 'Fixed' && task.startTime && startDate && startDate.getTime() !== today.getTime();

            if (dueDate && dueDate >= today && dueDate <= threeDaysFromNow) {
                if (!isFixedForAnotherDay && !recommendedIds.has(task.id)) {
                    recTasks.push({ ...task, reason: 'Due in the next 3 days' });
                    recommendedIds.add(task.id);
                }
            }
            
            if (task.important && dueDate && dueDate >= startOfWeek && dueDate <= endOfWeek) {
                 if (!isFixedForAnotherDay && !recommendedIds.has(task.id)) {
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
        triggerHapticNotification(NotificationType.Success);
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
        triggerHapticImpact(ImpactStyle.Light);
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
        if (task.startTime && task.type === 'Fixed') {
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
            // Always open the duration picker. It will be pre-filled if a duration already exists.
            setIsDurationPickerOpen(true);
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
    
    const isTaskOverdue = (task: Task, now: Date): boolean => {
        if (task.completed || !task.startTime || !task.duration) {
            return false;
        }
        const endMinutes = timeToMinutes(task.startTime) + task.duration;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        return endMinutes < nowMinutes;
    };
    
    const executePlanningLogic = useCallback(async () => {
        if (!algorithmToRun) return;

        setIsPlanning(true);
        try {
            const unfinishedTodayTasks = allTasks.filter(task => task.today && !task.completed);
            
            // Fixed tasks are obstacles; flexible tasks are the ones to be planned.
            const fixedTasks = unfinishedTodayTasks.filter(t => t.type === 'Fixed');
            const flexibleTasksToPlan = unfinishedTodayTasks.filter(t => t.type === 'Flexible');

            if (flexibleTasksToPlan.length === 0) {
                alert("No flexible tasks to plan.");
                setIsPlanning(false);
                setAlgorithmToRun(null);
                return;
            }

            let planUpdates: { taskId: string | number, updates: Partial<Task> }[] = [];

            if (algorithmToRun === 'sequential') {
                planUpdates = runSequentialPlanning(flexibleTasksToPlan, fixedTasks, planningSettings);
            } else if (algorithmToRun === 'weighted') {
                if (flexibleTasksToPlan.length > 8) {
                    alert(`Too many tasks for weighted planning (max 8). Using sequential algorithm instead.`);
                    planUpdates = runSequentialPlanning(flexibleTasksToPlan, fixedTasks, planningSettings);
                } else {
                    planUpdates = runWeightedPlanning(flexibleTasksToPlan, fixedTasks, planningSettings);
                }
            }
            
            const scheduledTaskIds = new Set(planUpdates.map(u => u.taskId));
            
            const unscheduledTasksToClear = flexibleTasksToPlan.filter(
                t => !scheduledTaskIds.has(t.id) && t.startTime
            );
                
            const clearingUpdates = unscheduledTasksToClear.map(t => ({
                taskId: t.id,
                updates: { startTime: undefined, time: '--:--' }
            }));

            const allUpdates = [...planUpdates, ...clearingUpdates];

            if (allUpdates.length > 0) {
                await Promise.all(allUpdates.map(u => updateTask(u.taskId, u.updates)));
            }

            if (planUpdates.length < flexibleTasksToPlan.length) {
                const unscheduledCount = flexibleTasksToPlan.length - planUpdates.length;
                alert(`Successfully planned ${planUpdates.length} tasks. Could not find a time slot for ${unscheduledCount} task(s).`);
            }

        } catch (e) {
            console.error("Planning failed", e);
            alert("An error occurred during planning.");
        } finally {
            setIsPlanning(false);
            setAlgorithmToRun(null);
        }
    }, [algorithmToRun, allTasks, planningSettings, updateTask]);


    useEffect(() => {
        if (planningTrigger > 0 && algorithmToRun) {
            executePlanningLogic();
        }
    }, [planningTrigger, algorithmToRun, executePlanningLogic]);

    const handlePlanMyDay = () => {
        const fixedWithoutTime = unfinishedTasks.filter(t => t.type === 'Fixed' && !t.startTime);
        if (fixedWithoutTime.length > 0) {
            setFixedTasksToConvert(fixedWithoutTime);
            setIsPlanConfirmOpen(true);
        } else {
             if (planningSettings.algorithm === 'ask') {
                setIsAlgorithmChoiceOpen(true);
            } else {
                setAlgorithmToRun(planningSettings.algorithm);
                setPlanningTrigger(Date.now());
            }
        }
    };
    
    const handleChooseAlgorithmAndPlan = (algo: 'sequential' | 'weighted') => {
        setIsAlgorithmChoiceOpen(false);
        setAlgorithmToRun(algo);
        setPlanningTrigger(Date.now());
    }

    const handleConfirmAndPlan = async () => {
        setIsPlanConfirmOpen(false);
        await Promise.all(
            fixedTasksToConvert.map(t => updateTask(t.id, { type: 'Flexible' }))
        );
        if (planningSettings.algorithm === 'ask') {
            setIsAlgorithmChoiceOpen(true);
        } else {
            setAlgorithmToRun(planningSettings.algorithm);
            setPlanningTrigger(Date.now());
        }
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
                triggerHapticImpact(ImpactStyle.Medium);
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
                <svg className="w-10 h-10 animate-ios-spinner text-[var(--color-text-secondary)]" viewBox="0 0 50 50">
                    <circle className="animate-ios-spinner-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" />
                </svg>
            </div>
        );
    }

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-14 flex justify-center items-center transition-opacity duration-300 pointer-events-none ${pullDelta > 0 || isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
                    {isRefreshing ? <RefreshSpinnerIcon /> : <ChevronDownIcon className={`w-6 h-6 text-[var(--color-text-secondary)] transition-transform duration-300 ${pullDelta > REFRESH_THRESHOLD ? 'rotate-180' : ''}`} />}
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
                            <Link to="/focus" className="text-[var(--color-text-secondary)] hover:text-[var(--color-primary-500)] transition-colors p-1 -m-1">
                                <FocusHeaderIcon />
                            </Link>
                        </div>
                        <div className="flex justify-center">
                            <div className="grid grid-cols-2 bg-[var(--color-surface-container-low)] rounded-lg p-1 w-full max-w-48">
                                <button
                                    onClick={() => { setViewMode('list'); triggerHapticSelection(); }}
                                    className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'list' ? 'bg-[var(--color-surface-container)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
                                >
                                    List
                                </button>
                                <button
                                    onClick={() => { setViewMode('timeline'); triggerHapticSelection(); }}
                                    className={`w-full text-center py-1.5 text-sm font-semibold rounded-md transition-all ${viewMode === 'timeline' ? 'bg-[var(--color-surface-container)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}
                                >
                                    Timeline
                                </button>
                            </div>
                        </div>
                        <div className="flex justify-end">
                             <button className="text-[var(--color-text-primary)]" onClick={() => setIsAddTaskOpen(true)}>
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
                                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                    }`}>
                                        {overdueTasks.length > 0 ? <OverdueIcon /> : <RecommendIcon />}
                                        <p className={`flex-grow ${overdueTasks.length > 0 ? 'text-red-800 dark:text-red-300' : 'text-blue-800 dark:text-blue-300'}`}>
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
                                                    <button onClick={() => setIsRecommendOpen(true)} className={`font-semibold hover:underline focus:outline-none ${overdueTasks.length > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
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
                                                    <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Today's Tasks</h2>
                                                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">{finishedTasks.length}/{totalTodayTasks}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setIsPlanningSettingsOpen(true)}
                                                        className="flex-shrink-0 p-1.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-container-low)] rounded-full transition-colors"
                                                        aria-label="Planning Settings"
                                                    >
                                                        <SettingsHeaderIcon className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={handlePlanMyDay}
                                                        disabled={isPlanning}
                                                        className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold text-xs transition-colors ease-in-out bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-indigo-50 dark:disabled:bg-gray-700 disabled:text-indigo-300 dark:disabled:text-gray-500 disabled:cursor-not-allowed"
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
                                                </div>
                                            </div>
                                            <div className="w-full bg-[var(--color-surface-container-low)] rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {unfinishedTasks.length > 0 && (
                                                <section>
                                                    <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow overflow-hidden divide-y divide-[var(--color-border)]">
                                                        {unfinishedTasks.map(task => {
                                                            const listInfo = listInfoMap.get(task.category) || { icon: '📝', color: 'gray' };
                                                            const timeParts = task.startTime ? task.startTime.split(':').map(Number) : null;
                                                            const isOverdue = isTaskOverdue(task, currentTime);
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
                                                                            className="flex items-start justify-center w-full focus:outline-none rounded-md focus:ring-2 focus:ring-blue-300 "
                                                                            aria-label={`Set start time for ${task.title}`}
                                                                        >
                                                                            {task.startTime ? (
                                                                                <div className="flex">
                                                                                    <span className={`w-9 text-right text-3xl font-bold leading-none tracking-tight ${isOverdue ? 'text-[var(--color-functional-red)]' : 'text-[var(--color-text-primary)]'}`}>{displayHour}</span>
                                                                                    <div className={`flex flex-col items-start font-semibold leading-tight ml-0.5 text-[11px] mt-0.5 ${isOverdue ? 'text-[var(--color-functional-red)]' : 'text-[var(--color-text-secondary)]'}`}>
                                                                                        <span>{displayMinute}</span>
                                                                                        <span className="-mt-0.5">{displayPeriod}</span>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center justify-center h-[36px]">
                                                                                    <span className="font-semibold text-[var(--color-text-tertiary)] text-2xl tracking-widest">--</span>
                                                                                </div>
                                                                            )}
                                                                        </button>
                                                                         <div className="h-5 flex items-center">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleToggleTaskType(task.id); }}
                                                                                className="p-1 -m-1 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300"
                                                                                aria-label={`Toggle task type for ${task.title}. Current: ${task.type}`}
                                                                            >
                                                                                <LockIcon className={`w-3.5 h-3.5 transition-colors ${task.type === 'Fixed' ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-tertiary)]'}`} />
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
                                                        <h2 className="text-base font-bold text-[var(--color-text-primary)]">Finished Tasks ({finishedTasks.length})</h2>
                                                        <ChevronDownIcon className={`w-5 h-5 text-[var(--color-text-secondary)] transition-transform duration-300 ${isFinishedTasksVisible ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isFinishedTasksVisible ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                                                        <div className="overflow-hidden">
                                                            <div className="bg-[var(--color-surface-container)] rounded-xl card-shadow overflow-hidden divide-y divide-[var(--color-border)]">
                                                                {finishedTasks.map(task => {
                                                                    const listInfo = listInfoMap.get(task.category) || { icon: '📝', color: 'gray' };
                                                                    return (
                                                                        <div key={task.id as React.Key} className="flex items-start">
                                                                            <div className="w-20 shrink-0 flex flex-col items-center pt-3.5 pb-2">
                                                                                {task.completed_at && (
                                                                                    <div className="text-center">
                                                                                        <span className="text-[10px] font-medium text-[var(--color-text-secondary)]">done at</span>
                                                                                        <div className="flex items-start justify-center w-full mt-0.5">
                                                                                            {(() => {
                                                                                                const completedDate = new Date(task.completed_at);
                                                                                                let displayHour = completedDate.getHours() % 12;
                                                                                                if (displayHour === 0) displayHour = 12;
                                                                                                const displayMinute = String(completedDate.getMinutes()).padStart(2, '0');
                                                                                                const displayPeriod = completedDate.getHours() >= 12 ? 'pm' : 'am';
                                                                                                return (
                                                                                                    <div className="flex">
                                                                                                        <span className="text-3xl font-bold leading-none tracking-tight text-[var(--color-text-tertiary)]">{displayHour}</span>
                                                                                                        <div className="flex flex-col items-start font-semibold leading-tight ml-0.5 text-[11px] mt-0.5 text-[var(--color-text-tertiary)]">
                                                                                                            <span>{displayMinute}</span>
                                                                                                            <span className="-mt-0.5">{displayPeriod}</span>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })()}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
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
                                    currentTime={currentTime}
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
            <PlanningSettingsDrawer 
                isOpen={isPlanningSettingsOpen}
                onClose={() => setIsPlanningSettingsOpen(false)}
            />
             <ConfirmationModal
                isOpen={isAlgorithmChoiceOpen}
                onClose={() => setIsAlgorithmChoiceOpen(false)}
                onConfirm={() => handleChooseAlgorithmAndPlan('sequential')}
                onCancel={() => handleChooseAlgorithmAndPlan('weighted')}
                title="Choose Planning Algorithm"
                message="How would you like to plan your day?"
                confirmText="Sequential"
                cancelText="Weighted"
                confirmVariant="primary"
            />
        </MainLayout>
    );
};

export default TodayScreen;