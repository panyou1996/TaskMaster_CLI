import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { TodayIcon, ListsIcon, MomentsIcon, PlusIcon, AddTaskMenuIcon, AddListMenuIcon, AddMomentMenuIcon, MicrophoneIcon, SettingsIcon, NotebookPenIcon, AddNoteMenuIcon } from '../icons/Icons';
import { AddMomentScreen, NewMomentData } from '../../screens/AddMomentScreen';
import { takePhotoWithCapacitor, triggerHapticImpact, triggerHapticSelection } from '../../utils/permissions';
import { useData } from '../../contexts/DataContext';
import { Moment } from '../../data/mockData';
import AddTaskWithAIScreen from '../../screens/AddTaskWithAIScreen';
import AddListScreen, { NewListData } from '../../screens/AddListScreen';
import { useWebSpeech } from '../../hooks/useWebSpeech';
import { Capacitor } from '@capacitor/core';
import { ImpactStyle } from '@capacitor/haptics';

const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
    const commonClasses = "flex flex-col items-center justify-center gap-1 transition-colors duration-200";
    const activeClass = "text-[var(--color-primary-500)]";
    const inactiveClass = "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]";
    const location = useLocation();

    const handleClick = () => {
        if (location.pathname !== to) {
            triggerHapticSelection();
        }
    };

    return (
        <NavLink
            to={to}
            onClick={handleClick}
            className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}
        >
            {icon}
            <span className="text-xs font-medium">{label}</span>
        </NavLink>
    );
};

const BottomNavBar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { addMoment, addList, addDebugLog } = useData();
    const navigate = useNavigate();

    const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
    const [initialPhotoData, setInitialPhotoData] = useState<string | null>(null);
    const [isAddTaskWithAIOpen, setIsAddTaskWithAIOpen] = useState(false);
    const [initialAIPrompt, setInitialAIPrompt] = useState('');
    
    const [isAddListOpen, setIsAddListOpen] = useState(false);

    const { isRecording, transcript, start, stop } = useWebSpeech(addDebugLog);
    
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);

    const handleFinalTranscript = useCallback((finalTranscript: string) => {
        addDebugLog(`Final transcript received: "${finalTranscript}"`);
        if (finalTranscript && isLongPressRef.current) {
            setInitialAIPrompt(finalTranscript);
            setIsAddTaskWithAIOpen(true);
        }
        // Reset the long-press flag only after its value has been checked.
        isLongPressRef.current = false;
    }, [addDebugLog]);

    useEffect(() => {
      const handleGlobalPointerUp = () => {
          addDebugLog(`global pointerup. isLongPressRef: ${isLongPressRef.current}`);
          if (isLongPressRef.current) {
              addDebugLog('-> Long press was active, stopping recording.');
              stop();
          }
          if (longPressTimerRef.current) {
              addDebugLog('-> Timer found, clearing (was a click or aborted long press).');
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
          }
          // Do not reset isLongPressRef here; it's handled by the final transcript callback.
      };
      window.addEventListener('pointerup', handleGlobalPointerUp);
      return () => { window.removeEventListener('pointerup', handleGlobalPointerUp); };
    }, [stop, addDebugLog]);
    
    const handlePointerDown = () => {
        addDebugLog(`pointerdown.`);
        isLongPressRef.current = false;
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }

        // For mobile web, we must start immediately on user gesture.
        // For native, we can wait for the timer.
        if (!Capacitor.isNativePlatform()) {
             start(handleFinalTranscript);
        }

        addDebugLog('starting long press timer (250ms)');
        longPressTimerRef.current = setTimeout(() => {
            addDebugLog('long press timer fired');
            isLongPressRef.current = true;
            longPressTimerRef.current = null;
            if (isMenuOpen) setIsMenuOpen(false);
            triggerHapticImpact(ImpactStyle.Medium);
            
            if (Capacitor.isNativePlatform()) {
                start(handleFinalTranscript);
            }
        }, 250);
    };

    const handlePointerUp = () => {
        addDebugLog(`pointerup (on button). Has timer: ${!!longPressTimerRef.current}`);
        if (longPressTimerRef.current) {
            // Timer was running, so it was a click.
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            
            if (!isLongPressRef.current) {
                addDebugLog('-> Click detected. Stopping recording (if any) and toggling menu.');
                if (isRecording) {
                    stop();
                }
                triggerHapticImpact();
                setIsMenuOpen(prev => !prev);
            }
        } else if (isLongPressRef.current) {
            // Timer already fired, so it was a long press. The global pointerup will handle it.
            // But as a fallback, we'll stop it here too.
            addDebugLog('-> Long press released on button. Stopping recording.');
            stop();
        }
    };

    const handleMomentButtonClick = async () => {
        triggerHapticImpact();
        setIsMenuOpen(false);
        const photoDataUrl = await takePhotoWithCapacitor();
        if (photoDataUrl) {
            setInitialPhotoData(photoDataUrl);
            setIsAddMomentOpen(true);
        }
    };

    const handleAddTaskWithAI = () => {
        triggerHapticImpact();
        setIsMenuOpen(false);
        setIsAddTaskWithAIOpen(true);
    };
    
    const handleAddNoteClick = () => {
        triggerHapticImpact();
        setIsMenuOpen(false);
        navigate('/notes/new');
    };

    const handleAddMoment = async (newMomentData: NewMomentData) => {
        const newMoment: Omit<Moment, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
            title: newMomentData.title,
            description: newMomentData.notes.substring(0, 50) + (newMomentData.notes.length > 50 ? '...' : ''),
            imageUrl: newMomentData.imageUrl,
            date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            notes: newMomentData.notes,
            tags: newMomentData.tags,
        };
        await addMoment(newMoment);
    };

    const handleAddListClick = () => {
        triggerHapticImpact();
        setIsMenuOpen(false);
        setIsAddListOpen(true);
    };

    const handleAddList = async (newListData: NewListData) => {
        await addList(newListData);
    };

    const menuItems = [
        { label: 'Moment', icon: <AddMomentMenuIcon />, action: handleMomentButtonClick },
        { label: 'Note', icon: <AddNoteMenuIcon />, action: handleAddNoteClick },
        { label: 'List', icon: <AddListMenuIcon />, action: handleAddListClick },
        { label: 'Task', icon: <AddTaskMenuIcon />, action: handleAddTaskWithAI },
    ];


    return (
        <>
            {isRecording && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 animate-page-fade-in backdrop-blur-sm" onClick={stop} />
                    <div 
                        className="fixed left-1/2 -translate-x-1/2 w-40 h-40 bg-[var(--color-primary-500)]/40 rounded-full flex items-center justify-center animate-pulse-recording z-40 pointer-events-none"
                        style={{ bottom: `calc(1rem + env(safe-area-inset-bottom, 0px) - 2.5rem)` }}
                    />
                     <div
                        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50 transition-all duration-300 ease-out"
                        style={{ bottom: `calc(7rem + env(safe-area-inset-bottom, 0px))` }}
                    >
                        <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 text-white text-center text-base animate-page-fade-in min-h-[3.5rem] flex items-center justify-center">
                            <p>{transcript || 'Listening...'}<span className="inline-block w-1 h-4 bg-white ml-1 animate-pulse"></span></p>
                        </div>
                    </div>
                </>
            )}
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 ${isMenuOpen ? 'visible' : 'invisible'}`}
                aria-hidden="true"
            >
                <div 
                    className={`absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsMenuOpen(false)}
                />
                <div
                    className="absolute w-full flex flex-col items-end gap-4 pr-6"
                    style={{ bottom: `calc(11rem + env(safe-area-inset-bottom, 0px))` }}
                >
                    {menuItems.map((item, index) => (
                        <div
                            key={item.label}
                            className={`transform transition-all duration-300 ease-out ${isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
                            style={{ transitionDelay: `${isMenuOpen ? (menuItems.length - 1 - index) * 40 : 0}ms` }}
                        >
                            <button
                                onClick={item.action}
                                className="flex w-32 items-center gap-3 rounded-full bg-[var(--color-surface-container)] px-4 py-3 card-shadow"
                            >
                                {item.icon}
                                <span className="font-semibold text-[var(--color-text-primary)] text-md">{item.label}</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <div
                className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--color-surface-container)]/80 backdrop-blur-sm border-t border-[var(--color-border)] z-30"
                style={{ height: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}
            >
                <div
                    className="grid grid-cols-5 items-center h-full max-w-sm mx-auto"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                    <NavItem to="/today" icon={<TodayIcon />} label="Today" />
                    <NavItem to="/plan" icon={<ListsIcon />} label="Plan" />
                    <NavItem to="/notes" icon={<NotebookPenIcon />} label="Notes" />
                    <NavItem to="/moments" icon={<MomentsIcon />} label="Moments" />
                    <NavItem to="/settings" icon={<SettingsIcon />} label="Settings" />
                </div>
            </div>
             <div
                className="fixed right-6 z-50"
                style={{ bottom: `calc(6rem + env(safe-area-inset-bottom, 0px))` }}
             >
                <button
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'none' }}
                    className={`w-16 h-16 bg-[var(--color-primary-500)] text-[var(--color-on-primary)] rounded-full flex items-center justify-center fab-shadow transform transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-200)] ${isMenuOpen ? 'rotate-[-225deg]' : ''} ${isRecording ? 'animate-fab-pulse' : ''}`}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                    aria-label={isMenuOpen ? "Close menu" : (isRecording ? "Stop recording" : "Open menu or long-press to record")}
                >
                    {isRecording ? <MicrophoneIcon className="w-8 h-8"/> : <PlusIcon />}
                </button>
            </div>
            <AddMomentScreen
                isOpen={isAddMomentOpen}
                onClose={() => setIsAddMomentOpen(false)}
                onAddMoment={handleAddMoment}
                initialImage={initialPhotoData}
            />
            <AddTaskWithAIScreen
                isOpen={isAddTaskWithAIOpen}
                onClose={() => setIsAddTaskWithAIOpen(false)}
                initialPrompt={initialAIPrompt}
            />
             <AddListScreen
                isOpen={isAddListOpen}
                onClose={() => setIsAddListOpen(false)}
                onAddList={handleAddList}
            />
        </>
    );
};

export default BottomNavBar;