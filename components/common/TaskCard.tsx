import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ClockIcon, FlagIcon, ChevronRightElegantIcon } from '../icons/Icons';
import { triggerHapticImpact } from '../../utils/permissions';

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

const minutesTo24HTime = (totalMinutes: number): string => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
        green: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
        red: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
        teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
        cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
        indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
        lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300',
        amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        fuchsia: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
        gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    };

    const checkmarkColorVariants = {
        yellow: 'bg-yellow-500 hover:bg-yellow-600',
        purple: 'bg-purple-500 hover:bg-purple-600',
        green: 'bg-green-500 hover:bg-green-600',
        blue: 'bg-blue-500 hover:bg-blue-600',
        pink: 'bg-pink-500 hover:bg-pink-600',
        red: 'bg-red-500 hover:bg-red-600',
        orange: 'bg-orange-500 hover:bg-orange-600',
        teal: 'bg-teal-500 hover:bg-teal-600',
        cyan: 'bg-cyan-500 hover:bg-cyan-600',
        indigo: 'bg-indigo-500 hover:bg-indigo-600',
        lime: 'bg-lime-500 hover:bg-lime-600',
        amber: 'bg-amber-500 hover:bg-amber-600',
        rose: 'bg-rose-500 hover:bg-rose-600',
        fuchsia: 'bg-fuchsia-500 hover:bg-fuchsia-600',
        gray: 'bg-gray-500 hover:bg-gray-600',
    };
    
    const pillColors = pillColorVariants[color as keyof typeof pillColorVariants] || pillColorVariants.gray;
    const checkmarkColorClass = checkmarkColorVariants[color as keyof typeof checkmarkColorVariants] || 'bg-blue-600 hover:bg-blue-700';

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
        ? 'bg-[var(--color-surface-container)] rounded-xl card-shadow border border-[var(--color-border)]' 
        : 'bg-[var(--color-surface-container)]';

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
                            className={`w-5 h-5 rounded-md ${checkmarkColorClass} flex items-center justify-center text-white shrink-0 transition-colors
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
                                    : `border-gray-400 dark:border-gray-500 hover:border-gray-500 dark:hover:border-gray-400`
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
                             <p className={`truncate text-lg font-semibold ${completed ? 'text-[var(--color-text-tertiary)] line-through' : 'text-[var(--color-text-primary)]'}`}>{title}</p>
                            {subtasks && subtasks.length > 0 && !completed && (
                                <span className="text-xs font-medium text-[var(--color-text-tertiary)] shrink-0">
                                    [{subtasks.filter(s => s.completed).length}/{subtasks.length}]
                                </span>
                            )}
                        </div>
                        <div className="flex items-center shrink-0 pt-0.5">
                            <button
                                // FIX: Removed 'as number' cast
                                onClick={(e) => { e.stopPropagation(); if (!completed) onToggleImportant?.(id); }}
                                className={`p-1 -m-1 rounded-full ${!completed ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : 'cursor-not-allowed'}`}
                                aria-label={important ? "Remove importance" : "Mark as important"}
                                disabled={completed}
                            >
                                <FlagIcon className={`w-4 h-4 transition-colors ${important ? (completed ? 'text-red-300 dark:text-red-700' : 'text-[var(--color-functional-red)]') : 'text-gray-300 dark:text-gray-600'}`} />
                            </button>
                        </div>
                    </div>
                    
                    {!completed && (
                        <div className="flex justify-between items-center mt-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md ${pillColors}`}>
                                    {categoryIcon && <span>{categoryIcon}</span>}
                                    <span className="font-medium">{category}</span>
                                </div>
                                {duration && (
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] font-medium">
                                        {endTime ? (
                                            <span>{duration}m &rarr; {endTime}</span>
                                        ) : (
                                            <span>{duration}m</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {subtasks && subtasks.length > 0 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggleSubtaskVisibility?.(); }}
                                    className="p-1.5 -m-1.5 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all shrink-0"
                                    aria-label={hideSubtasks ? "Expand subtasks" : "Collapse subtasks"}
                                >
                                    <ChevronRightElegantIcon className={`w-3.5 h-3.5 transition-transform duration-300 ${hideSubtasks ? '' : 'rotate-90'}`} />
                                </button>
                            )}
                        </div>
                    )}

                    <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${(!hideSubtasks && subtasks && subtasks.length > 0) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="mt-2 pt-2 border-t border-[var(--color-border)] space-y-1.5">
                                {subtasks?.map(sub => (
                                    <div key={sub.id} className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id={`subtask-${sub.id}`}
                                            checked={sub.completed}
                                            onChange={(e) => {
                                                e.stopPropagation();
                                                if (!completed) {
                                                    triggerHapticImpact();
                                                    onToggleSubtask?.(id, sub.id);
                                                }
                                            }}
                                            className="h-3.5 w-3.5 rounded-sm border-gray-400 dark:border-gray-500 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:focus:ring-offset-gray-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={completed}
                                        />
                                        <label 
                                            htmlFor={`subtask-${sub.id}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`text-sm ${completed ? 'cursor-not-allowed' : 'cursor-pointer'} ${sub.completed || completed ? 'text-[var(--color-text-tertiary)] line-through' : 'text-[var(--color-text-secondary)]'}`}>
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