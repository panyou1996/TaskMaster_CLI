import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import { TodayIcon, ListsIcon, MomentsIcon, PlusIcon, AddTaskMenuIcon, AddListMenuIcon, AddMomentMenuIcon, MicrophoneIcon, SettingsIcon } from '../icons/Icons';
import AddMomentScreen, { NewMomentData } from '../../screens/AddMomentScreen';
import { takePhotoWithCapacitor } from '../../utils/permissions';
import { useData } from '../../contexts/DataContext';
import { Moment } from '../../data/mockData';
import AddTaskWithAIScreen from '../../screens/AddTaskWithAIScreen';

// --- Web Speech API Setup ---
// Extend the Window interface for TypeScript
interface IWindow extends Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
const SpeechRecognition = (window as any as IWindow).SpeechRecognition || (window as any as IWindow).webkitSpeechRecognition;


const NavItem = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
    const commonClasses = "flex flex-col items-center justify-center gap-1 transition-colors duration-200";
    const activeClass = "text-[var(--color-primary-500)]";
    const inactiveClass = "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]";

    return (
        <NavLink
            to={to}
            className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}
        >
            {icon}
            <span className="text-xs font-medium">{label}</span>
        </NavLink>
    );
};

const BottomNavBar: React.FC = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { addMoment } = useData();

    // State for the Add Moment flow
    const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
    const [initialPhotoData, setInitialPhotoData] = useState<string | null>(null);
    const [isAddTaskWithAIOpen, setIsAddTaskWithAIOpen] = useState(false);
    const [initialAIPrompt, setInitialAIPrompt] = useState('');
    
    // --- Voice Input State & Refs ---
    const [isRecording, setIsRecording] = useState(false);
    const [showRecordingUI, setShowRecordingUI] = useState(false);
    const [liveTranscription, setLiveTranscription] = useState('');
    
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    const recognitionRef = useRef<any | null>(null);
    const finalTranscriptRef = useRef('');

    // --- Voice Input Logic using Web Speech API ---

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
        setTimeout(() => setShowRecordingUI(false), 300); // Allow for fade-out
    }, []);
    
    const startRecording = async () => {
        if (!SpeechRecognition) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        try {
            // Check for microphone permission implicitly by starting
            setShowRecordingUI(true);
            setIsRecording(true);
            finalTranscriptRef.current = '';
            setLiveTranscription('');

            recognitionRef.current = new SpeechRecognition();
            const rec = recognitionRef.current;
            rec.lang = 'zh-CN';
            rec.continuous = true;
            rec.interimResults = true;

            rec.onresult = (event: any) => {
                let interimTranscript = '';
                finalTranscriptRef.current = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscriptRef.current += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                setLiveTranscription(finalTranscriptRef.current + interimTranscript);
            };

            rec.onend = () => {
                stopRecording();
                const finalText = finalTranscriptRef.current.trim();
                if (finalText) {
                    setInitialAIPrompt(finalText);
                    setIsAddTaskWithAIOpen(true);
                }
                recognitionRef.current = null;
            };

            rec.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                if (event.error === 'not-allowed') {
                    alert('Microphone access was denied. Please allow it in your browser settings.');
                } else {
                    alert(`An error occurred during voice recognition: ${event.error}`);
                }
                stopRecording();
            };

            rec.start();

        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not start recording. Please check microphone permissions.');
            stopRecording();
        }
    };

    const handlePointerDown = () => {
        isLongPressRef.current = false;
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            if (isMenuOpen) setIsMenuOpen(false);
            startRecording();
        }, 250);
    };

    const handlePointerUp = () => {
        if(longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
        if (isLongPressRef.current) {
            stopRecording();
        } else {
            setIsMenuOpen(prev => !prev);
        }
        isLongPressRef.current = false;
    };

    const handlePointerLeave = () => {
        if (isRecording) {
            if(longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
            stopRecording();
        }
    };
    
    // --- End Voice Input Logic ---

    const handleMomentButtonClick = async () => {
        setIsMenuOpen(false); // Close the FAB menu immediately
        const photoDataUrl = await takePhotoWithCapacitor();
        if (photoDataUrl) {
            setInitialPhotoData(photoDataUrl);
            setIsAddMomentOpen(true);
        }
    };

    const handleAddTaskWithAI = () => {
        setIsMenuOpen(false);
        setIsAddTaskWithAIOpen(true);
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

    const menuItems = [
        { label: 'Moment', icon: <AddMomentMenuIcon />, action: handleMomentButtonClick },
        { label: 'List', icon: <AddListMenuIcon />, action: () => console.log('Add List') },
        { label: 'Task', icon: <AddTaskMenuIcon />, action: handleAddTaskWithAI },
    ];


    return (
        <>
            {/* Recording UI */}
            {showRecordingUI && (
                <>
                    <div className="fixed inset-0 bg-black/50 z-40 animate-page-fade-in backdrop-blur-sm" onClick={stopRecording} />
                    <div 
                        className="fixed left-1/2 -translate-x-1/2 w-40 h-40 bg-[var(--color-primary-500)]/40 rounded-full flex items-center justify-center animate-pulse-recording z-40 pointer-events-none"
                        style={{ bottom: `calc(1rem + env(safe-area-inset-bottom) - 2.5rem)` }}
                    />
                     <div
                        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50 transition-all duration-300 ease-out"
                        style={{ bottom: `calc(7rem + env(safe-area-inset-bottom))` }}
                    >
                        <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 text-white text-center text-base animate-page-fade-in min-h-[3.5rem] flex items-center justify-center">
                            <p>{liveTranscription || 'Listening...'}<span className="inline-block w-1 h-4 bg-white ml-1 animate-pulse"></span></p>
                        </div>
                    </div>
                </>
            )}

            {/* Backdrop & Floating Action Menu */}
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 ${isMenuOpen ? 'visible' : 'invisible'}`}
                aria-hidden="true"
            >
                {/* Clickable Overlay */}
                <div 
                    className={`absolute inset-0 bg-gray-900/30 backdrop-blur-sm transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsMenuOpen(false)}
                />

                {/* Menu Items */}
                <div
                    className="absolute bottom-[7rem] left-1/2 -translate-x-1/2 w-full flex flex-col items-center gap-4"
                    style={{ bottom: `calc(7rem + env(safe-area-inset-bottom))` }}
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

            {/* Main Navigation Bar */}
            <div
                className="fixed bottom-0 left-0 right-0 h-20 bg-[var(--color-surface-container)]/80 backdrop-blur-sm border-t border-[var(--color-border)] z-30"
                style={{ height: `calc(5rem + env(safe-area-inset-bottom))` }}
            >
                <div
                    className="grid grid-cols-5 items-center h-full max-w-sm mx-auto"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    <NavItem to="/today" icon={<TodayIcon />} label="Today" />
                    <NavItem to="/plan" icon={<ListsIcon />} label="Plan" />
                    
                    <div /> {/* Placeholder for FAB */}
                    
                    <NavItem to="/moments" icon={<MomentsIcon />} label="Moments" />
                    <NavItem to="/settings" icon={<SettingsIcon />} label="Settings" />
                </div>
            </div>

            {/* FAB Button - positioned independently */}
             <div
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
                style={{ bottom: `calc(1rem + env(safe-area-inset-bottom))` }}
             >
                <button
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
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
        </>
    );
};

export default BottomNavBar;