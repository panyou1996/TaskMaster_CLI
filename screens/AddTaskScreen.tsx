import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, TrashIcon, FlagIcon, ListCheckIcon, TagIcon, CalendarIcon, StarIcon, RefreshSpinnerIcon, ClockIcon, LockIcon, BellIcon, DurationIcon } from '../components/icons/Icons';
import { useData } from '../contexts/DataContext';
import { useKeyboardHeight } from '../utils/permissions';

export interface NewTaskData {
    title: string;
    list: string;
    isImportant: boolean;
    isToday: boolean;
    type: 'Fixed' | 'Flexible';
    dueDate: string;
    startDate: string;
    startTime: string;
    duration: string;
    notes: string;
    subtasks: { id: number; text: string; completed: boolean }[];
    reminder: number | null;
}

interface AddTaskScreenProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  onAddTask?: (taskData: NewTaskData) => Promise<void>;
}

const EmptySquareCheckIcon = () => (
    <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <rect x="4" y="4" width="16" height="16" rx="4" />
    </svg>
);

const SubtaskCircleIcon = () => (
    <svg className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="8" />
    </svg>
);

const formatChipDate = (dateString: string): string => {
    if (!dateString) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dateString.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays > 1 && diffDays <= 3) return `In ${diffDays} days`;
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1 && diffDays >= -3) return `${Math.abs(diffDays)} days ago`;
    
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

const reminderOptions = [
    { label: 'No notification', value: null },
    { label: 'On time', value: 0 },
    { label: '5 minutes before', value: 5 },
    { label: '10 minutes before', value: 10 },
    { label: '15 minutes before', value: 15 },
    { label: '30 minutes before', value: 30 },
    { label: '1 hour before', value: 60 },
];

const getReminderLabel = (value: number | null) => {
    const option = reminderOptions.find(o => o.value === value);
    return option ? option.label : '';
};


const AddTaskScreen: React.FC<AddTaskScreenProps> = ({ isOpen, onClose, initialDate, onAddTask }) => {
    const { lists: userLists } = useData();
    const listOptions = userLists.map(l => l.name);
    const keyboardHeight = useKeyboardHeight();

    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [subtasks, setSubtasks] = useState<{ id: number; text: string; completed: boolean }[]>([]);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [category, setCategory] = useState('');
    const [isImportant, setIsImportant] = useState(false);
    const [isToday, setIsToday] = useState(false);
    const [taskType, setTaskType] = useState<'Fixed' | 'Flexible'>('Flexible');
    const [dueDate, setDueDate] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [duration, setDuration] = useState('');
    const [reminder, setReminder] = useState<number | null>(null);
    
    const [activeInput, setActiveInput] = useState<'title' | 'notes' | null>(null);
    const [isSubtaskSectionVisible, setIsSubtaskSectionVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activePopover, setActivePopover] = useState<string | null>(null);
    const [popoverPosition, setPopoverPosition] = useState<React.CSSProperties>({});
    
    const titleInputRef = useRef<HTMLInputElement>(null);
    const notesInputRef = useRef<HTMLTextAreaElement>(null);
    const newSubtaskInputRef = useRef<HTMLInputElement>(null);
    const calendarIconRef = useRef<HTMLDivElement>(null);
    const startTimeIconRef = useRef<HTMLDivElement>(null);
    const durationIconRef = useRef<HTMLDivElement>(null);
    const listIconRef = useRef<HTMLDivElement>(null);
    const reminderIconRef = useRef<HTMLDivElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const prevIsOpen = useRef(isOpen);

    const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), []);
    const isTodayLocked = useMemo(() => dueDate === todayStr, [dueDate, todayStr]);

    useEffect(() => {
        if (isTodayLocked) {
            setIsToday(true);
        }
    }, [isTodayLocked]);


    const resetState = useCallback(() => {
        setTitle('');
        setNotes('');
        setSubtasks([]);
        setNewSubtaskText('');
        setIsImportant(false);
        setIsToday(false);
        setTaskType('Flexible');
        setDueDate('');
        setStartDate('');
        setStartTime('');
        setDuration('');
        setReminder(null);
        setActiveInput(null);
        setActivePopover(null);
        setIsSubtaskSectionVisible(false);
        setError(null);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (isOpen && !prevIsOpen.current) {
            resetState();
            setCategory(listOptions.length > 0 ? listOptions[0] : '');
            if (initialDate) {
                setDueDate(initialDate);
                if (initialDate === todayStr) {
                    setIsToday(true);
                }
            }
        }
        prevIsOpen.current = isOpen;
    }, [isOpen, initialDate, listOptions, resetState, todayStr]);
    
    const handlePopoverToggle = useCallback((popoverName: string, ref: React.RefObject<HTMLDivElement>) => {
        if (activePopover === popoverName) {
            setActivePopover(null);
            return;
        }

        if (ref.current) {
            const iconRect = ref.current.getBoundingClientRect();
            const popoverWidth = 224; 
            const popoverHeight = 250;
            const margin = 8;

            let pos: React.CSSProperties = { position: 'fixed' };

            // Vertical positioning
            if (iconRect.bottom + popoverHeight > window.innerHeight && iconRect.top > popoverHeight) {
                pos.bottom = window.innerHeight - iconRect.top + margin;
            } else {
                pos.top = iconRect.bottom + margin;
            }

            // Horizontal positioning
            if (iconRect.right - popoverWidth < 0) {
                 pos.left = iconRect.left;
            } else {
                 pos.left = iconRect.right - popoverWidth;
            }

            setPopoverPosition(pos);
        }
        setActivePopover(popoverName);
    }, [activePopover]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (cardRef.current && !cardRef.current.contains(target)) {
                 setActiveInput(null);
            }
            if (activePopover && cardRef.current && !cardRef.current.contains(target)) {
                 const popovers = document.querySelectorAll('.popover-content');
                 let clickedInsidePopover = false;
                 popovers.forEach(p => {
                     if (p.contains(target)) clickedInsidePopover = true;
                 });
                 if (!clickedInsidePopover) {
                    setActivePopover(null);
                 }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activePopover]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Task name is required."); return; }
        if (!category) { setError("Please select a list."); return; }

        setLoading(true);
        setError(null);

        try {
            if (onAddTask) {
                await onAddTask({
                    title, list: category, isImportant, isToday, notes: notes,
                    subtasks: isSubtaskSectionVisible ? subtasks.filter(s => s.text.trim()) : [],
                    dueDate, type: taskType,
                    startDate: taskType === 'Fixed' && startTime ? (startDate || new Date().toISOString().substring(0, 10)) : '',
                    startTime: taskType === 'Fixed' ? startTime : '',
                    duration: duration, 
                    reminder: reminder,
                });
            }
            onClose();
        } catch (err) {
            setError('Failed to save the task. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleAddSubtask = () => {
        if (newSubtaskText.trim()) {
            setSubtasks([...subtasks, { id: Date.now(), text: newSubtaskText, completed: false }]);
            setNewSubtaskText('');
            setTimeout(() => newSubtaskInputRef.current?.focus(), 0);
        }
    };

    const handleToggleToday = () => {
        if (isTodayLocked) return;
        setIsToday(prev => !prev);
    };

    const PopoverPortal: React.FC<{children: React.ReactNode}> = ({ children }) => {
        if (!activePopover) return null;
        return createPortal(children, document.body);
    };

    return createPortal(
        <>
            <div
              className={`fixed inset-0 z-50 grid place-items-center p-4 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}
              style={{ paddingBottom: `max(1rem, ${keyboardHeight}px)` }}
            >
                <div className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} aria-hidden="true" />
                
                <form onSubmit={handleSubmit} className={`w-full max-w-sm bg-transparent transition-transform duration-300 ease-out transform ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`} style={{ paddingBottom: `env(safe-area-inset-bottom)` }}>
                    <div ref={cardRef} className="bg-[var(--color-surface-container)] rounded-xl card-shadow p-4 overflow-y-auto max-h-[75vh]">
                        {error && <p className="text-[var(--color-functional-red)] text-sm text-center mb-2">{error}</p>}
                        
                        <div className="flex items-start gap-3">
                            <div><EmptySquareCheckIcon /></div>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-grow">
                                        <input ref={titleInputRef} type="text" value={title} onChange={e => setTitle(e.target.value)} onFocus={() => setActiveInput('title')} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); notesInputRef.current?.focus(); }}} placeholder="New To-Do" className="w-full text-base font-semibold text-[var(--color-text-primary)] placeholder-[var(--color-text-primary)] focus:outline-none bg-transparent" />
                                        <textarea ref={notesInputRef} value={notes} onChange={e => setNotes(e.target.value)} onFocus={() => setActiveInput('notes')} placeholder="Notes" rows={1} className="w-full text-sm mt-1 text-[var(--color-text-secondary)] placeholder-[var(--color-text-secondary)] focus:outline-none resize-none bg-transparent" />
                                    </div>
                                    <div className="flex items-start pt-1 shrink-0">
                                        <div className="flex flex-col items-center w-[50px]">
                                            <button type="button" title="Mark as Important" onClick={() => setIsImportant(p => !p)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isImportant ? 'text-red-600 bg-red-100 dark:bg-red-900/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                                <FlagIcon className="w-5 h-5" />
                                            </button>
                                            <span className="text-[10px] font-medium text-center text-[var(--color-text-tertiary)] mt-1 leading-tight">Important</span>
                                        </div>
                                        <div className="flex flex-col items-center w-[50px]">
                                            <button type="button" title={isTodayLocked ? "Due today" : "Toggle Today"} onClick={handleToggleToday} className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isToday ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'} ${isTodayLocked ? 'opacity-70 cursor-default' : ''}`}>
                                                <StarIcon className="w-5 h-5" />
                                            </button>
                                            <span className="text-[10px] font-medium text-center text-[var(--color-text-tertiary)] mt-1 leading-tight">Today</span>
                                        </div>
                                    </div>
                                </div>
                                {isSubtaskSectionVisible && (
                                    <div className="mt-2 space-y-1.5 pt-2 border-t border-[var(--color-border)]">
                                        {subtasks.map((sub) => (
                                            <div key={sub.id} className="flex items-start gap-2 group">
                                                <SubtaskCircleIcon />
                                                <input type="text" value={sub.text} onChange={e => { const newText = e.target.value; setSubtasks(subs => subs.map(s => s.id === sub.id ? { ...s, text: newText } : s)); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }} className="w-full text-sm text-[var(--color-text-primary)] focus:outline-none bg-transparent" />
                                                <button type="button" onClick={() => setSubtasks(subs => subs.filter(s => s.id !== sub.id))} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-functional-red)] opacity-0 group-hover:opacity-100"><TrashIcon /></button>
                                            </div>
                                        ))}
                                        <div className="flex items-start gap-2">
                                            <SubtaskCircleIcon />
                                            <input ref={newSubtaskInputRef} type="text" value={newSubtaskText} onChange={e => setNewSubtaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }} placeholder="Add item" className="w-full text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-secondary)] focus:outline-none bg-transparent" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                             <div className="flex items-center gap-2 flex-wrap min-w-0 mb-3 min-h-[1.75rem]">
                                {duration && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)] text-xs font-semibold animate-page-fade-in"><DurationIcon className="w-3.5 h-3.5" /><span>{duration} min</span></div>)}
                                {reminder !== null && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-semibold animate-page-fade-in"><BellIcon className="w-3.5 h-3.5" /><span className="truncate">{getReminderLabel(reminder)}</span></div>)}
                                {startTime && taskType === 'Fixed' && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-semibold animate-page-fade-in"><ClockIcon className="w-3.5 h-3.5" /><span className="truncate">Starts {formatChipDate(startDate || todayStr)}, {new Date('1970-01-01T' + startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>)}
                                {dueDate && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)] text-xs font-semibold animate-page-fade-in"><span>Due {formatChipDate(dueDate)}</span></div>)}
                                {category && (<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs font-semibold animate-page-fade-in"><span>{category}</span></div>)}
                             </div>
                             <div className="flex items-start justify-around">
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <button type="button" title={taskType === 'Fixed' ? "Set as Flexible" : "Set as Fixed"} onClick={() => setTaskType(p => p === 'Fixed' ? 'Flexible' : 'Fixed')} className={`p-2 rounded-full transition-colors ${taskType === 'Fixed' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><LockIcon className="w-5 h-5" /></button>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Fixed</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center" ref={durationIconRef}>
                                    <button type="button" title="Set Duration" onClick={() => handlePopoverToggle('duration', durationIconRef)} className={`p-2 rounded-full transition-colors ${duration ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><DurationIcon className="w-5 h-5" /></button>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Duration</span>
                                </div>
                                {taskType === 'Fixed' && (
                                    <div className="flex flex-col items-center flex-1 min-w-0 text-center" ref={startTimeIconRef}>
                                        <button type="button" title="Set Start Date" onClick={() => handlePopoverToggle('startTime', startTimeIconRef)} className={`p-2 rounded-full transition-colors ${startTime ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><ClockIcon className="w-5 h-5" /></button>
                                        <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Start</span>
                                    </div>
                                )}
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center" ref={calendarIconRef}>
                                    <button type="button" title="Set Due Date" onClick={() => handlePopoverToggle('dueDate', calendarIconRef)} className={`p-2 rounded-full transition-colors ${dueDate ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><CalendarIcon className="w-5 h-5" /></button>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Due</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center" ref={listIconRef}>
                                    <button type="button" title="Select List" onClick={() => handlePopoverToggle('list', listIconRef)} className={`p-2 rounded-full transition-colors ${category ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><TagIcon className="w-5 h-5" /></button>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">List</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center">
                                    <button type="button" title="Add Subtasks" onClick={() => setIsSubtaskSectionVisible(p => !p)} className={`p-2 rounded-full transition-colors ${isSubtaskSectionVisible ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><ListCheckIcon className="w-5 h-5" /></button>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Subs</span>
                                </div>
                                <div className="flex flex-col items-center flex-1 min-w-0 text-center" ref={reminderIconRef}>
                                    <button type="button" title="Set Reminder" onClick={() => handlePopoverToggle('reminder', reminderIconRef)} className={`p-2 rounded-full transition-colors ${reminder !== null ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}><BellIcon className="w-5 h-5" /></button>
                                    <span className="text-[9px] text-[var(--color-text-tertiary)] mt-1 leading-tight">Alert</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={loading || !title.trim()} className="px-6 py-3 bg-[var(--color-primary-500)] text-white font-bold rounded-xl fab-shadow hover:opacity-90 transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                            {loading && <RefreshSpinnerIcon />}
                            <span>{loading ? 'Saving...' : 'Create Task'}</span>
                        </button>
                    </div>
                </form>
            </div>
            <PopoverPortal>
                {activePopover === 'duration' && (<div className="popover-content w-56 bg-[var(--color-surface-container)] rounded-lg modal-shadow p-3 z-[60] animate-page-fade-in" style={popoverPosition}><div><label className="text-xs font-medium text-[var(--color-text-secondary)]">Duration (minutes)</label><input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 30" className="w-full mt-1 p-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"/></div></div>)}
                {activePopover === 'startTime' && (<div className="popover-content w-56 bg-[var(--color-surface-container)] rounded-lg modal-shadow p-3 z-[60] animate-page-fade-in space-y-3" style={popoverPosition}><div><label className="text-xs font-medium text-[var(--color-text-secondary)]">Start Date</label><input type="date" value={startDate || todayStr} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"/></div><div><label className="text-xs font-medium text-[var(--color-text-secondary)]">Start Time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full mt-1 p-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"/></div></div>)}
                {activePopover === 'dueDate' && (<div className="popover-content w-56 bg-[var(--color-surface-container)] rounded-lg modal-shadow p-3 z-[60] animate-page-fade-in" style={popoverPosition}><div><label className="text-xs font-medium text-[var(--color-text-secondary)]">Due Date</label><input type="date" value={dueDate} onChange={e => { setDueDate(e.target.value); }} className="w-full mt-1 p-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary-500)] bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]"/></div></div>)}
                {activePopover === 'list' && (<div className="popover-content w-48 bg-[var(--color-surface-container)] rounded-lg modal-shadow p-2 z-[60] animate-page-fade-in max-h-48 overflow-y-auto" style={popoverPosition}>{listOptions.map(listName => (<button key={listName} type="button" onClick={() => { setCategory(listName); setActivePopover(null); }} className={`w-full text-left px-3 py-2 text-sm rounded-md flex justify-between items-center ${category === listName ? 'bg-primary-100 text-[var(--color-primary-500)]' : 'hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]'}`}><span>{listName}</span>{category === listName && <CheckIcon className="w-4 h-4" />}</button>))}</div>)}
                {activePopover === 'reminder' && (<div className="popover-content w-48 bg-[var(--color-surface-container)] rounded-lg modal-shadow p-2 z-[60] animate-page-fade-in max-h-48 overflow-y-auto" style={popoverPosition}>{reminderOptions.map(option => (<button key={option.label} type="button" onClick={() => { setReminder(option.value); setActivePopover(null); }} className={`w-full text-left px-3 py-2 text-sm rounded-md flex justify-between items-center ${reminder === option.value ? 'bg-primary-100 text-[var(--color-primary-500)]' : 'hover:bg-[var(--color-surface-container-low)] text-[var(--color-text-primary)]'}`}><span>{option.label}</span>{reminder === option.value && <CheckIcon className="w-4 h-4" />}</button>))}</div>)}
            </PopoverPortal>
        </>,
        document.body
    );
};

export default AddTaskScreen;