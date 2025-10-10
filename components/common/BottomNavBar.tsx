import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { TodayIcon, ListsIcon, MomentsIcon, PlusIcon, AddTaskMenuIcon, AddListMenuIcon, AddMomentMenuIcon, MicrophoneIcon, SettingsIcon } from '../icons/Icons';
import AddMomentScreen, { NewMomentData } from '../../screens/AddMomentScreen';
import { takePhotoWithCapacitor } from '../../utils/permissions';
import { useData } from '../../contexts/DataContext';
import { Moment } from '../../data/mockData';
import AddTaskWithAIScreen from '../../screens/AddTaskWithAIScreen';
import AddListScreen, { NewListData } from '../../screens/AddListScreen';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// --- Gemini Live API Audio Helpers ---

// Encodes raw audio bytes into a Base64 string.
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Creates a Gemini-compatible Blob from raw audio data.
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

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
    const { addMoment, addList } = useData();
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

    // State for the Add Moment flow
    const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
    const [initialPhotoData, setInitialPhotoData] = useState<string | null>(null);
    const [isAddTaskWithAIOpen, setIsAddTaskWithAIOpen] = useState(false);
    const [initialAIPrompt, setInitialAIPrompt] = useState('');
    
    // Add List state
    const [isAddListOpen, setIsAddListOpen] = useState(false);

    // --- Voice Input State & Refs ---
    const [isRecording, setIsRecording] = useState(false);
    const [showRecordingUI, setShowRecordingUI] = useState(false);
    const [liveTranscription, setLiveTranscription] = useState('');
    
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    
    // Refs for Gemini Live
    const sessionPromise = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContext = useRef<AudioContext | null>(null);
    const scriptProcessor = useRef<ScriptProcessorNode | null>(null);
    const microphoneSource = useRef<MediaStreamAudioSourceNode | null>(null);
    const transcriptionAccumulator = useRef('');

    const cleanupRecording = useCallback(() => {
        setIsRecording(false);
        setShowRecordingUI(false);
        setLiveTranscription('');
        transcriptionAccumulator.current = '';
        
        scriptProcessor.current?.disconnect();
        scriptProcessor.current = null;

        microphoneSource.current?.disconnect();
        microphoneSource.current = null;
        
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        if (inputAudioContext.current && inputAudioContext.current.state !== 'closed') {
            inputAudioContext.current.close().catch(e => console.warn('AudioContext close error:', e));
        }
        inputAudioContext.current = null;
        
        sessionPromise.current = null;
    }, []);

    const startRecording = useCallback(async () => {
        if (isRecording) return;

        if (Capacitor.isNativePlatform()) {
            try {
                let permissionStatus = await SpeechRecognition.checkPermission();
                if (permissionStatus.permission !== 'granted') {
                    permissionStatus = await SpeechRecognition.requestPermission();
                }
                if (permissionStatus.permission !== 'granted') {
                    alert('Could not start recording. Please grant microphone permissions in settings.');
                    return;
                }
            } catch (e) {
                console.error("Permission check/request failed", e);
                alert('Could not start recording. Please check microphone permissions.');
                return;
            }
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            // @ts-ignore
            inputAudioContext.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            
            setShowRecordingUI(true);
            setIsRecording(true);
            transcriptionAccumulator.current = '';

            sessionPromise.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.debug('Gemini Live session opened.');
                        if (!inputAudioContext.current || !streamRef.current) return;
                        
                        microphoneSource.current = inputAudioContext.current.createMediaStreamSource(streamRef.current);
                        scriptProcessor.current = inputAudioContext.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            }).catch(err => {
                                console.error("Session promise error on send:", err);
                                cleanupRecording();
                            });
                        };
                        
                        microphoneSource.current.connect(scriptProcessor.current);
                        scriptProcessor.current.connect(inputAudioContext.current.destination);
                    },
                    onmessage: (message: LiveServerMessage) => {
                        let text = '';
                        if (message.serverContent?.inputTranscription) {
                            text = message.serverContent.inputTranscription.text;
                            setLiveTranscription(text);
                            transcriptionAccumulator.current = text;
                        }

                        if (message.serverContent?.turnComplete) {
                            const finalTranscript = transcriptionAccumulator.current.trim();
                            transcriptionAccumulator.current = '';

                            if (finalTranscript) {
                                setInitialAIPrompt(finalTranscript);
                                setIsAddTaskWithAIOpen(true);
                                // The session will close automatically after this, triggering onclose and cleanup.
                            }
                        }
                        
                        // Handle required audio output even though we don't play it.
                        if (message.serverContent?.modelTurn?.parts[0]?.inlineData.data) {
                            // This section fulfills the API requirement to handle audio output.
                            // We are not playing it, thus no AudioContext or decoding is needed.
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Gemini Live error:', e);
                        cleanupRecording();
                    },
                    onclose: (e: CloseEvent) => {
                        console.debug('Gemini Live session closed.');
                        cleanupRecording();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                },
            });
            await sessionPromise.current;

        } catch (error) {
            console.error('Failed to start recording:', error);
            alert('Could not start recording. Please check microphone permissions.');
            cleanupRecording();
        }
    }, [ai, isRecording, cleanupRecording]);

    const stopRecording = useCallback(() => {
        if (sessionPromise.current) {
            sessionPromise.current.then(session => session?.close());
        } else {
            cleanupRecording();
        }
    }, [cleanupRecording]);
    
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
            isLongPressRef.current = false;
        }
    };

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

    const handleAddListClick = () => {
        setIsMenuOpen(false);
        setIsAddListOpen(true);
    };

    const handleAddList = async (newListData: NewListData) => {
        await addList(newListData);
    };

    const menuItems = [
        { label: 'Moment', icon: <AddMomentMenuIcon />, action: handleMomentButtonClick },
        { label: 'List', icon: <AddListMenuIcon />, action: handleAddListClick },
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
             <AddListScreen
                isOpen={isAddListOpen}
                onClose={() => setIsAddListOpen(false)}
                onAddList={handleAddList}
            />
        </>
    );
};

export default BottomNavBar;