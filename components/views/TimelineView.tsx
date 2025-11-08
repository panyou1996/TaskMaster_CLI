import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Task, TaskList } from '../../data/mockData';

// Helper functions for time conversion
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
const formatTo12Hour = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};


// Constants for timeline layout
const PIXELS_PER_HOUR = 80;
const START_HOUR = 7;
const END_HOUR = 22;

const colorVariants = {
    green: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', text: 'text-green-800 dark:text-green-300', subtext: 'text-green-600 dark:text-green-400' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-500', text: 'text-blue-800 dark:text-blue-300', subtext: 'text-blue-600 dark:text-blue-400' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-500', text: 'text-pink-800 dark:text-pink-300', subtext: 'text-pink-600 dark:text-pink-400' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-500', text: 'text-purple-800 dark:text-purple-300', subtext: 'text-purple-600 dark:text-purple-400' },
    yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-500', text: 'text-yellow-800 dark:text-yellow-300', subtext: 'text-yellow-600 dark:text-yellow-400' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', text: 'text-red-800 dark:text-red-300', subtext: 'text-red-600 dark:text-red-400' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-800 dark:text-orange-300', subtext: 'text-orange-600 dark:text-orange-400' },
    gray: { bg: 'bg-gray-100 dark:bg-gray-700', border: 'border-gray-500', text: 'text-gray-800 dark:text-gray-200', subtext: 'text-gray-600 dark:text-gray-400' },
};

// Clickable unscheduled task card
const UnscheduledTaskCard: React.FC<{ task: Task & { color?: string }; onClick: () => void; }> = ({ task, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-[var(--color-surface-container)] rounded-lg p-3 w-40 flex-shrink-0 card-shadow text-left cursor-pointer hover:bg-[var(--color-surface-container-low)] transition-colors border-l-4"
            style={{ borderColor: task.color }}
        >
            <p className="font-semibold text-sm truncate text-[var(--color-text-primary)]">{task.title}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{task.duration} min</p>
        </button>
    );
};

interface ScheduledTaskProps {
    task: Task;
    colors: { bg: string; border: string; text: string; subtext: string; };
    top: number;
    height: number;
    leftPercent: number;
    widthPercent: number;
    onShortPress: (task: Task) => void;
    onLongPress: (task: Task) => void;
    onTaskTimeChange: (taskId: number | string, newStartTime: string) => void;
    onComplete: (id: number | string) => void;
    onUncomplete: (id: number | string) => void;
    isCompleting: boolean;
    isUncompleting: boolean;
    isOverdue: boolean;
}

const ScheduledTask: React.FC<ScheduledTaskProps> = ({ task, colors, top, height, leftPercent, widthPercent, onShortPress, onLongPress, onTaskTimeChange, onComplete, onUncomplete, isCompleting, isUncompleting, isOverdue }) => {
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isClickRef = useRef(true);
    const interactionStartedOnButton = useRef(false);

    const fireworksData = [
        { color: 'blue', particles: 6, delay: 0 },
        { color: 'pink', particles: 6, delay: 0.1 },
        { color: 'yellow', particles: 6, delay: 0.2 },
    ];
    
    const cancelLongPress = useCallback(() => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        const targetEl = e.target as HTMLElement;
        interactionStartedOnButton.current = !!targetEl.closest('button');
        if (interactionStartedOnButton.current || e.button !== 0) {
            return;
        }
        isClickRef.current = true;
        cancelLongPress();
        if (!task.completed) {
             pressTimerRef.current = setTimeout(() => {
                isClickRef.current = false;
                onLongPress(task);
            }, 500);
        }
    }, [cancelLongPress, onLongPress, task]);
    
    const onPointerUp = useCallback(() => {
        cancelLongPress();
        if (isClickRef.current && !interactionStartedOnButton.current) {
            onShortPress(task);
        }
        interactionStartedOnButton.current = false;
        isClickRef.current = true;
    }, [cancelLongPress, onShortPress, task]);

    return (
        <div
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            className={`absolute rounded-lg p-2 overflow-hidden cursor-pointer select-none flex items-start gap-2 ${colors.bg} ${colors.border} ${isCompleting ? 'animate-card-fade-out' : ''}`}
            style={{
                top,
                height: Math.max(height, 20),
                left: `calc(3rem + (100% - 3rem) * ${leftPercent / 100})`,
                width: `calc((100% - 3rem) * ${widthPercent / 100} - 4px)`,
                borderLeftWidth: '4px',
                willChange: 'transform, opacity'
            }}
        >
            <div className="pt-0.5">
               {task.completed ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onUncomplete(task.id); }}
                        className={`w-4 h-4 rounded-full bg-[var(--color-primary-500)] flex items-center justify-center text-white shrink-0 hover:opacity-80 transition-opacity ${isUncompleting ? 'animate-uncheck' : ''}`}
                        aria-label="Mark task as incomplete"
                        disabled={isUncompleting}
                    >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>
                    </button>
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
                        className={`relative w-4 h-4 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center ${isCompleting ? 'animate-checkmark' : 'border-gray-400 hover:border-blue-500'}`}
                        aria-label="Mark task as complete"
                        disabled={isCompleting}
                    >
                         {isCompleting && (
                            <>
                                <svg className="w-2.5 h-2.5 text-white animate-checkmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>
                                <div className="fireworks-container">
                                    {fireworksData.map((set, setIndex) =>
                                        Array.from({ length: set.particles }).map((_, i) => (
                                            <div key={`${setIndex}-${i}`} className="rotator" style={{ transform: `rotate(${i * (360 / set.particles)}deg)` }}>
                                                <div className={`particle particle-${set.color}`} style={{ animationDelay: `${set.delay}s` }} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </button>
                )}
            </div>
            <div className="flex-grow min-w-0">
                <p className={`font-bold text-sm truncate ${isOverdue && !task.completed ? 'text-[var(--color-functional-red)]' : colors.text}`}>{task.title}</p>
                <p className={`text-xs ${isOverdue && !task.completed ? 'text-[var(--color-functional-red)]' : colors.subtext}`}>
                    {task.startTime && formatTo12Hour(task.startTime)} - {task.startTime && minutesToTime(timeToMinutes(task.startTime) + (task.duration || 30))}
                </p>
            </div>
        </div>
    );
};

interface TimelineViewProps {
    tasks: Task[];
    lists: TaskList[];
    currentTime: Date;
    onUnscheduledTaskClick: (task: Task) => void;
    onScheduledTaskShortPress: (task: Task) => void;
    onScheduledTaskLongPress: (task: Task) => void;
    onTaskTimeChange: (taskId: number | string, newStartTime: string) => void;
    onCompleteTask: (id: number | string) => void;
    onUncompleteTask: (id: number | string) => void;
    completingTaskId: number | string | null;
    uncompletingTaskId: number | string | null;
}

const isTaskOverdue = (task: Task, now: Date): boolean => {
    if (task.completed || !task.startTime || !task.duration) {
        return false;
    }
    const endMinutes = timeToMinutes(task.startTime) + task.duration;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return endMinutes < nowMinutes;
};


const TimelineView: React.FC<TimelineViewProps> = ({ 
    tasks, 
    lists, 
    currentTime, 
    onUnscheduledTaskClick,
    onScheduledTaskShortPress,
    onScheduledTaskLongPress,
    onTaskTimeChange,
    onCompleteTask,
    onUncompleteTask,
    completingTaskId,
    uncompletingTaskId
}) => {
    const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculatePosition = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();
            if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
                const totalMinutes = (currentHour * 60) + currentMinutes;
                const position = ((totalMinutes - (START_HOUR * 60)) / 60) * PIXELS_PER_HOUR;
                setCurrentTimePosition(position);
                return position;
            } else {
                setCurrentTimePosition(null);
                return null;
            }
        };

        const initialPosition = calculatePosition();
        if (initialPosition !== null && timelineContainerRef.current) {
             const scrollOffset = 40; 
            timelineContainerRef.current.scrollTo({
                top: initialPosition - scrollOffset,
                behavior: 'smooth'
            });
        }
        
        const intervalId = setInterval(calculatePosition, 60000); // Update every minute
        return () => clearInterval(intervalId);
    }, []);


    const listColorMap = useMemo(() => {
        return lists.reduce((acc, list) => {
            acc[list.name] = list.color;
            return acc;
        }, {} as { [key: string]: string });
    }, [lists]);

    const { unscheduledTasks, scheduledTasks } = useMemo(() => {
        const todayTasks = tasks.filter(t => t.today);
        return {
            unscheduledTasks: todayTasks.filter(t => !t.startTime && t.duration && !t.completed),
            scheduledTasks: todayTasks.filter(t => t.startTime),
        };
    }, [tasks]);

    const scheduledTasksWithLayout = useMemo(() => {
        const sortedTasks = scheduledTasks.sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!));
        if (sortedTasks.length === 0) return [];
        
        const collisionGroups: Task[][] = [];
        if (sortedTasks.length > 0) {
            collisionGroups.push([sortedTasks[0]]);
            let currentGroup = collisionGroups[0];
            let groupEndTime = timeToMinutes(sortedTasks[0].startTime!) + (sortedTasks[0].duration || 0);

            for (let i = 1; i < sortedTasks.length; i++) {
                const task = sortedTasks[i];
                const startTime = timeToMinutes(task.startTime!);
                if (startTime < groupEndTime) {
                    currentGroup.push(task);
                    groupEndTime = Math.max(groupEndTime, startTime + (task.duration || 0));
                } else {
                    currentGroup = [task];
                    collisionGroups.push(currentGroup);
                    groupEndTime = startTime + (task.duration || 0);
                }
            }
        }
        
        const allLayoutTasks: (Task & { layout: any })[] = [];

        for (const group of collisionGroups) {
            const columns: { lastEndTime: number }[] = [];
            group.forEach((task: Task & { _layout?: any }) => {
                let placed = false;
                const taskStartTime = timeToMinutes(task.startTime!);

                for (let i = 0; i < columns.length; i++) {
                    if (columns[i].lastEndTime <= taskStartTime) {
                        task._layout = { columnIndex: i };
                        columns[i].lastEndTime = taskStartTime + (task.duration || 0);
                        placed = true;
                        break;
                    }
                }

                if (!placed) {
                    const columnIndex = columns.length;
                    task._layout = { columnIndex };
                    columns.push({ lastEndTime: taskStartTime + (task.duration || 0) });
                }
            });

            const numColumns = columns.length;
            group.forEach((task: Task & { _layout?: any }) => {
                const { columnIndex } = task._layout;
                const colorName = listColorMap[task.category] || 'gray';
                let colors = colorVariants[colorName as keyof typeof colorVariants] || colorVariants.gray;
                const isOverdue = isTaskOverdue(task, currentTime);
                if (task.completed) {
                    colors = { bg: 'bg-gray-100 dark:bg-gray-800/50', border: 'border-gray-400 dark:border-gray-700', text: 'text-gray-500 dark:text-gray-400 line-through', subtext: 'text-gray-400 dark:text-gray-500' };
                }

                allLayoutTasks.push({
                    ...task,
                    layout: {
                        top: (timeToMinutes(task.startTime!) - (START_HOUR * 60)) / 60 * PIXELS_PER_HOUR,
                        height: (task.duration || 30) / 60 * PIXELS_PER_HOUR,
                        widthPercent: 100 / numColumns,
                        leftPercent: columnIndex * (100 / numColumns),
                        colors,
                        isOverdue,
                    }
                });
                delete task._layout;
            });
        }
        
        return allLayoutTasks;
    }, [scheduledTasks, listColorMap, currentTime]);

    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

    return (
        <div className="h-full flex flex-col bg-[var(--color-background-primary)]">
            <div className="flex-grow flex flex-col overflow-hidden">
                <section className="flex-shrink-0 py-4 px-6">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-3">Unscheduled</h2>
                    <div className="flex gap-3 overflow-x-auto pb-3 -mx-6 px-6">
                        {unscheduledTasks.length > 0 ? (
                            unscheduledTasks.map(task => (
                                <UnscheduledTaskCard key={task.id} task={{ ...task, color: listColorMap[task.category] }} onClick={() => onUnscheduledTaskClick(task)} />
                            ))
                        ) : (
                            <div className="w-full text-center py-4 bg-[var(--color-surface-container)] rounded-lg">
                                <p className="text-[var(--color-text-secondary)] font-semibold text-sm">No tasks to schedule</p>
                                <p className="text-[var(--color-text-tertiary)] text-xs mt-1 px-2">Add a duration to flexible tasks on your 'Today' list to see them here.</p>
                            </div>
                        )}
                    </div>
                </section>
                <section ref={timelineContainerRef} className="flex-grow overflow-y-auto relative">
                    <div className="relative h-full px-6" style={{ height: `${(END_HOUR - START_HOUR + 1) * PIXELS_PER_HOUR}px` }}>
                        {hours.map(hour => (
                            <div key={hour} className="absolute w-full flex items-center" style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR, left: 0, right: 0 }}>
                                <span className="text-xs text-[var(--color-text-tertiary)] w-12 text-right pr-2">{`${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 || hour === 24 ? 'am' : 'pm'}`}</span>
                                <div className="flex-grow border-t border-[var(--color-border)]"></div>
                            </div>
                        ))}
                        {scheduledTasksWithLayout.map((taskWithLayout) => (
                            <ScheduledTask
                                key={taskWithLayout.id}
                                task={taskWithLayout}
                                colors={taskWithLayout.layout.colors}
                                top={taskWithLayout.layout.top}
                                height={taskWithLayout.layout.height}
                                leftPercent={taskWithLayout.layout.leftPercent}
                                widthPercent={taskWithLayout.layout.widthPercent}
                                onShortPress={onScheduledTaskShortPress}
                                onLongPress={onScheduledTaskLongPress}
                                onTaskTimeChange={onTaskTimeChange}
                                onComplete={onCompleteTask}
                                onUncomplete={onUncompleteTask}
                                isCompleting={completingTaskId === taskWithLayout.id}
                                isUncompleting={uncompletingTaskId === taskWithLayout.id}
                                isOverdue={taskWithLayout.layout.isOverdue}
                            />
                        ))}
                        {currentTimePosition !== null && (
                            <div className="absolute left-12 right-0 flex items-center z-10 pointer-events-none" style={{ top: currentTimePosition }}>
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1"></div>
                                <div className="flex-grow h-px bg-red-500"></div>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TimelineView;
