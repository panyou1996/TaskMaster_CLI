import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ClockIcon, FlagIcon, ChevronRightElegantIcon } from '../icons/Icons';

interface Subtask {
    id: number;
    text: string;
    completed: boolean;
}

interface TaskCardProps {
    // FIX: Changed id to allow string for temporary items
    id: number | string;
    time?: string;
    startTime?: string;
    duration?: number;
    type?: string;
    title: string;
    category: string;
    color?: string;
    categoryIcon?: string;
    completed: boolean;
    important?: boolean;
    subtasks?: Subtask[];
    // FIX: Changed id to allow string for temporary items
    onComplete?: (id: number | string) => void;
    // FIX: Changed id to allow string for temporary items
    onUncomplete?: (id: number | string) => void;
    isCompleting?: boolean;
    isUncompleting?: boolean;
    isJustUncompleted?: boolean;
    onUncompleteAnimationEnd?: () => void;
    // FIX: Changed taskId to allow string for temporary items
    onToggleSubtask?: (taskId: number | string, subtaskId: number) => void;
    // FIX: Changed id to allow string for temporary items
    onToggleImportant?: (id: number | string) => void;
    // FIX: Added onToggleToday to support PlanScreen
    onToggleToday?: (id: number | string) => void;
    onClick?: () => void;
    onToggleSubtaskVisibility?: () => void;
    hideSubtasks?: boolean;
    variant?: 'card' | 'list';
}

const timeToMinutes = (timeStr: string): number => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
};
const minutesToTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`;
};

const TaskCard: React.FC<TaskCardProps> = ({ 
    id, 
    startTime,
    duration, 
    type, 
    title, 
    category, 
    color = 'gray', 
    categoryIcon,
    completed,
    important,
    subtasks,
    onComplete,
    onUncomplete,
    isCompleting = false,
    isUncompleting = false,
    isJustUncompleted = false,
    onUncompleteAnimationEnd,
    onToggleSubtask,
    onClick,
    onToggleImportant,
    onToggleSubtaskVisibility,
    hideSubtasks = false,
    variant = 'card',
}) => {
    
    const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isClickRef = useRef(true);

    const pillColorVariants = {
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-800' },
        green: { bg: 'bg-green-100', text: 'text-green-800' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-800' },
        pink: { bg: 'bg-pink-100', text: 'text-pink-800' },
        red: { bg: 'bg-red-100', text: 'text-red-800' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-800' },
        gray: { bg: 'bg-gray-100', text: 'text-gray-700' },
    };

    const borderColorVariants = {
        yellow: { border: 'border-yellow-500', hover: 'hover:border-yellow-600' },
        purple: { border: 'border-purple-500', hover: 'hover:border-purple-600' },
        green: { border: 'border-green-500', hover: 'hover:border-green-600' },
        blue: { border: 'border-blue-500', hover: 'hover:border-blue-600' },
        pink: { border: 'border-pink-500', hover: 'hover:border-pink-600' },
        red: { border: 'border-red-500', hover: 'hover:border-red-600' },
        orange: { border: 'border-orange-500', hover: 'hover:border-orange-600' },
        gray: { border: 'border-gray-400', hover: 'hover:border-gray-500' },
    };
    
    const pillColors = pillColorVariants[color as keyof typeof pillColorVariants] || pillColorVariants.gray;
    
    const fireworksData = [
        { color: 'blue', particles: 6, delay: 0 },
        { color: 'pink', particles: 6, delay: 0.1 },
        { color: 'yellow', particles: 6, delay: 0.2 },
    ];
    
    const endTime = useMemo(() => {
        if (startTime && duration) {
            const startMins = timeToMinutes(startTime);
            const endMins = startMins + duration;
            return minutesToTime(endMins);
        }
        return null;
    }, [startTime, duration]);

    useEffect(() => {
        if (isJustUncompleted) {
          const timer = setTimeout(() => {
            onUncompleteAnimationEnd?.();
          }, 500); // Must match animation duration
          return () => clearTimeout(timer);
        }
    }, [isJustUncompleted, onUncompleteAnimationEnd]);

    const cancelLongPress = useCallback(() => {
        if (pressTimerRef.current) {
            clearTimeout(pressTimerRef.current);
            pressTimerRef.current = null;
        }
    }, []);

    const onPointerDown = useCallback((e: React.PointerEvent) => {
        const targetEl = e.target as HTMLElement;
        if (targetEl.closest('button, input[type="checkbox"]') || e.button !== 0) {
            return;
        }
        isClickRef.current = true;
        cancelLongPress();
    }, [cancelLongPress]);

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        cancelLongPress();
        const targetEl = e.target as HTMLElement;
        if (isClickRef.current && !targetEl.closest('button, input[type="checkbox"]')) {
            onClick?.();
        }
    }, [cancelLongPress, onClick]);

    const containerClasses = variant === 'card' 
        ? 'bg-white rounded-xl card-shadow border border-gray-100' 
        : 'bg-white';

    const contentClasses = variant === 'card' ? 'p-3' : 'py-3 pr-3';

    return (
        <div 
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={cancelLongPress}
            onPointerCancel={cancelLongPress}
            onContextMenu={(e) => e.preventDefault()}
            className={`${containerClasses} select-none 
                ${!completed ? 'cursor-pointer' : ''}
                ${isCompleting ? 'animate-card-fade-out' : ''}
                ${isJustUncompleted ? 'animate-card-fade-in' : ''}
            `}
        >
            <div className={`flex items-start gap-3 ${contentClasses}`}>
                <div className="pt-1 shrink-0">
                    {completed ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUncomplete?.(id); }}
                            className={`w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white shrink-0 hover:bg-blue-700 transition-colors
                                ${isUncompleting ? 'animate-uncheck' : ''}
                            `}
                            aria-label="Mark task as incomplete"
                            disabled={isUncompleting}
                        >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M5 13l4 4L19 7" /></svg>
                        </button>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onComplete?.(id); }}
                            className={`relative w-5 h-5 rounded-md border-2 shrink-0 transition-colors flex items-center justify-center
                                ${isCompleting 
                                    ? 'animate-checkmark' 
                                    : `border-${color}-400 hover:border-${color}-500`
                                }
                            `}
                            aria-label="Mark task as complete"
                            disabled={isCompleting}
                        >
                            {isCompleting && (
                                <>
                                    <svg className="w-3 h-3 text-white animate-checkmark-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <div className="flex justify-between items-start gap-2">
                        <div className="flex-grow flex items-baseline gap-2 min-w-0">
                             <p className={`truncate text-lg font-semibold ${completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{title}</p>
                            {subtasks && subtasks.length > 0 && !completed && (
                                <span className="text-xs font-medium text-gray-400 shrink-0">
                                    [{subtasks.filter(s => s.completed).length}/{subtasks.length}]
                                </span>
                            )}
                        </div>
                        <div className="flex items-center shrink-0 pt-0.5">
                            <button
                                // FIX: Removed 'as number' cast
                                onClick={(e) => { e.stopPropagation(); if (!completed) onToggleImportant?.(id); }}
                                className={`p-1 -m-1 rounded-full ${!completed ? 'hover:bg-red-50' : 'cursor-not-allowed'}`}
                                aria-label={important ? "Remove importance" : "Mark as important"}
                                disabled={completed}
                            >
                                <FlagIcon className={`w-4 h-4 transition-colors ${important ? (completed ? 'text-red-300' : 'text-red-500') : 'text-gray-300'}`} />
                            </button>
                        </div>
                    </div>
                    
                    {!completed && (
                        <div className="flex justify-between items-center mt-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${pillColors.bg} ${pillColors.text}`}>
                                    {categoryIcon && <span>{categoryIcon}</span>}
                                    <span className="font-medium">{category}</span>
                                </div>
                                {endTime && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-medium">
                                        <span>{duration}m &rarr; {endTime}</span>
                                    </div>
                                )}
                            </div>
                            {subtasks && subtasks.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleSubtaskVisibility?.(); }}
                                    className="p-1.5 -m-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all shrink-0"
                                    aria-label={hideSubtasks ? "Expand subtasks" : "Collapse subtasks"}
                                >
                                    <ChevronRightElegantIcon className={`w-3.5 h-3.5 transition-transform duration-300 ${hideSubtasks ? '' : 'rotate-90'}`} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${(!hideSubtasks && subtasks && subtasks.length > 0) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="mt-2 pt-2 border-t border-gray-200/60 space-y-1.5">
                                {subtasks?.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`subtask-${sub.id}`}
                                            checked={sub.completed}
                                            onChange={(e) => { e.stopPropagation(); !completed && onToggleSubtask?.(id, sub.id); }}
                                            className="h-3.5 w-3.5 rounded-sm border-gray-400 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={completed}
                                        />
                                        <label 
                                            htmlFor={`subtask-${sub.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`text-sm ${completed ? 'cursor-not-allowed' : 'cursor-pointer'} ${sub.completed || completed ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                            {sub.text}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskCard;
