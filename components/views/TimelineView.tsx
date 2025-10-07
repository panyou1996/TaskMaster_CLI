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

// Constants for timeline layout
const PIXELS_PER_HOUR = 80;
const START_HOUR = 7;
const END_HOUR = 22;

const colorVariants = {
    green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-800', subtext: 'text-green-600' },
    blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800', subtext: 'text-blue-600' },
    pink: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-800', subtext: 'text-pink-600' },
    purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-800', subtext: 'text-purple-600' },
    yellow: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-800', subtext: 'text-yellow-600' },
    red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-800', subtext: 'text-red-600' },
    orange: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800', subtext: 'text-orange-600' },
    gray: { bg: 'bg-gray-100', border: 'border-gray-500', text: 'text-gray-800', subtext: 'text-gray-600' },
};

// Clickable unscheduled task card
const UnscheduledTaskCard: React.FC<{ task: Task; onClick: () => void; }> = ({ task, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="bg-white rounded-lg p-3 w-40 flex-shrink-0 card-shadow text-left cursor-pointer hover:bg-gray-50 transition-colors border-l-4"
            style={{ borderColor: task.color }}
        >
            <p className="font-semibold text-sm truncate text-gray-800">{task.title}</p>
            <p className="text-xs text-gray-500">{task.duration} min</p>
        </button>
    );
};

interface ScheduledTaskProps {
    task: Task;
    colors: { bg: string; border: string; text: string; subtext: string; };
    top: number;
    height: number;
    onShortPress: (task: Task) => void;
    onLongPress: (task: Task) => void;
    // FIX: Changed id to allow string for temporary items
    onComplete: (id: number | string) => void;
    // FIX: Changed id to allow string for temporary items
    onUncomplete: (id: number | string) => void;
    isCompleting: boolean;
    isUncompleting: boolean;
}

const ScheduledTask: React.FC<ScheduledTaskProps> = ({ task, colors, top, height, onShortPress, onLongPress, onComplete, onUncomplete, isCompleting, isUncompleting }) => {
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

        if (interactionStartedOnButton.current || e.button !== 0) return;

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
            className={`absolute right-0 rounded-lg p-2 overflow-hidden cursor-pointer select-none flex items-start gap-2 ${colors.bg} ${colors.border} ${isCompleting ? 'animate-card-fade-out' : ''}`}
            style={{ top, height: Math.max(height, 20), left: '3rem', borderLeftWidth: '4px', willChange: 'transform, opacity' }}
        >
            <div className="pt-0.5">
                {task.completed ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); onUncomplete(task.id); }}
                        className={`w-4.5 h-4.5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 hover:bg-blue-700 transition-colors
                            ${isUncompleting ? 'animate-uncheck' : ''}
                        `}
                        aria-label="Mark task as incomplete"
                        disabled={isUncompleting}
                    >
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>
                    </button>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); onComplete(task.id); }}
                        className={`relative w-4.5 h-4.5 rounded-full border-2 shrink-0 transition-colors flex items-center justify-center
                            ${isCompleting
                                ? 'animate-checkmark' 
                                : 'border-gray-400 hover:border-blue-500'
                            }
                        `}
                        aria-label="Mark task as complete"
                        disabled={isCompleting}
                    >
                        {isCompleting && (
                            <>
                                <svg className="w-2.5 h-2.5 text-white animate-checkmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" />
                                </svg>
                                <div className="fireworks-container">
                                    {fireworksData.map((set, setIndex) =>
                                        Array.from({ length: set.particles }).map((_, i) => (
                                            <div
                                                key={`${setIndex}-${i}`}
                                                className="rotator"
                                                style={{ transform: `rotate(${i * (360 / set.particles)}deg)` }}
                                            >
                                                <div 
                                                    className={`particle particle-${set.color}`}
                                                    style={{ animationDelay: `${set.delay}s` }}
                                                />
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
                <p className={`font-bold text-sm truncate ${colors.text}`}>{task.title}</p>
                <p className={`text-xs ${colors.subtext}`}>{task.startTime} - {minutesToTime(timeToMinutes(task.startTime!) + (task.duration || 30))}</p>
            </div>
        </div>
    );
};

interface TimelineViewProps {
  tasks: Task[];
  lists: TaskList[];
  onUnscheduledTaskClick: (task: Task) => void;
  onScheduledTaskShortPress: (task: Task) => void;
  onScheduledTaskLongPress: (task: Task) => void;
  onCompleteTask: (taskId: number | string) => void;
  onUncompleteTask: (taskId: number | string) => void;
  completingTaskId: number | string | null;
  uncompletingTaskId: number | string | null;
}

const TimelineView: React.FC<TimelineViewProps> = ({
    tasks,
    lists,
    onUnscheduledTaskClick,
    onScheduledTaskShortPress,
    onScheduledTaskLongPress,
    onCompleteTask,
    onUncompleteTask,
    completingTaskId,
    uncompletingTaskId,
}) => {
    const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);
    const timelineContainerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const calculatePosition = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinutes = now.getMinutes();

            if (currentHour >= START_HOUR && currentHour <= END_HOUR) {
                const totalMinutes = currentHour * 60 + currentMinutes;
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
            const scrollOffset = 40; // pixels from the top
            timelineContainerRef.current.scrollTo({
                top: initialPosition - scrollOffset,
                behavior: 'smooth'
            });
        }

        const intervalId = setInterval(calculatePosition, 60000);

        return () => clearInterval(intervalId);
    }, []);

    const listColorMap = useMemo(() => {
        return lists.reduce((acc, list) => {
            acc[list.name] = list.color;
            return acc;
        }, {} as Record<string, string>);
    }, [lists]);

    const { unscheduledTasks, scheduledTasks } = useMemo(() => {
        const todayTasks = tasks.filter(t => t.today);
        return {
            unscheduledTasks: todayTasks.filter(t => !t.startTime && t.duration && !t.completed),
            scheduledTasks: todayTasks.filter(t => t.startTime),
        };
    }, [tasks]);

    const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i + START_HOUR);

    return (
        <div className="h-full flex flex-col bg-gray-50">
            <div className="flex-grow flex flex-col overflow-hidden">
                <section className="flex-shrink-0 py-4 px-6">
                    <h2 className="text-lg font-bold text-gray-800 mb-3">Unscheduled</h2>
                    <div className="flex gap-3 overflow-x-auto pb-3 -mx-6 px-6">
                        {unscheduledTasks.length > 0 ? (
                            unscheduledTasks.map(task => 
                                <UnscheduledTaskCard 
                                    key={task.id} 
                                    task={{...task, color: listColorMap[task.category]}}
                                    onClick={() => onUnscheduledTaskClick(task)}
                                />
                            )
                        ) : (
                            <div className="w-full text-center py-4 bg-gray-100 rounded-lg">
                                <p className="text-gray-600 font-semibold text-sm">No tasks to schedule</p>
                                <p className="text-gray-500 text-xs mt-1 px-2">Add a duration to flexible tasks on your 'Today' list to see them here.</p>
                            </div>
                        )}
                    </div>
                </section>

                <section
                    ref={timelineContainerRef}
                    className="flex-grow overflow-y-auto relative"
                >
                    <div className="relative h-full px-6" style={{ height: (END_HOUR - START_HOUR + 1) * PIXELS_PER_HOUR }}>
                        {hours.map(hour => (
                            <div key={hour} className="absolute w-full flex items-center" style={{ top: (hour - START_HOUR) * PIXELS_PER_HOUR, left: 0, right: 0 }}>
                                <span className="text-xs text-gray-400 w-12 text-right pr-2">{`${hour % 12 === 0 ? 12 : hour % 12}${hour < 12 || hour === 24 ? 'am' : 'pm'}`}</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>
                        ))}
                        
                        {scheduledTasks.map(task => {
                            const startMinutes = timeToMinutes(task.startTime!);
                            const top = ((startMinutes - (START_HOUR * 60)) / 60) * PIXELS_PER_HOUR;
                            const height = ((task.duration || 30) / 60) * PIXELS_PER_HOUR;
                            const colorName = listColorMap[task.category] || 'gray';
                            let colors = colorVariants[colorName as keyof typeof colorVariants] || colorVariants.gray;

                            if (task.completed) {
                                colors = {
                                    bg: 'bg-gray-100',
                                    border: 'border-gray-400',
                                    text: 'text-gray-500 line-through',
                                    subtext: 'text-gray-400'
                                };
                            }
                            
                            return (
                                <ScheduledTask
                                    key={task.id}
                                    task={task}
                                    colors={colors}
                                    top={top}
                                    height={height}
                                    onShortPress={onScheduledTaskShortPress}
                                    onLongPress={onScheduledTaskLongPress}
                                    onComplete={onCompleteTask}
                                    onUncomplete={onUncompleteTask}
                                    isCompleting={completingTaskId === task.id}
                                    isUncompleting={uncompletingTaskId === task.id}
                                />
                            );
                        })}

                        {currentTimePosition !== null && (
                            <div 
                                className="absolute left-12 right-0 flex items-center z-10 pointer-events-none" 
                                style={{ top: currentTimePosition }}
                            >
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-1" />
                                <div className="flex-grow h-px bg-red-500" />
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TimelineView;
