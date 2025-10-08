import React, { useState, useRef, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
// FIX: The 'LiveSession' type is not exported from '@google/genai'. It has been removed.
import { GoogleGenAI, Type, LiveServerMessage, Modality, Blob } from "@google/genai";
import { TodayIcon, ListsIcon, FocusIcon, MomentsIcon, PlusIcon, AddTaskMenuIcon, AddListMenuIcon, AddMomentMenuIcon, MicrophoneIcon } from '../icons/Icons';
import AddMomentScreen, { NewMomentData } from '../../screens/AddMomentScreen';
import { takePhotoWithCapacitor } from '../../utils/permissions';
import { useData } from '../../contexts/DataContext';
import { Moment, Task } from '../../data/mockData';
import AddTaskWithAIScreen from '../../screens/AddTaskWithAIScreen';

// --- Audio Helper Functions for Gemini Live API ---
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

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
    const { addMoment, addTask, lists } = useData();
    const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

    // State for the Add Moment flow
    const [isAddMomentOpen, setIsAddMomentOpen] = useState(false);
    const [initialPhotoData, setInitialPhotoData] = useState<string | null>(null);
    const [isAddTaskWithAIOpen, setIsAddTaskWithAIOpen] = useState(false);
    
    // --- Voice Input State & Refs ---
    const [isRecording, setIsRecording] = useState(false);
    const [showRecordingUI, setShowRecordingUI] = useState(false);
    const [liveTranscription, setLiveTranscription] = useState('');
    
    // FIX: The `useRef` hook requires an initial value. It was called with 0 arguments.
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef(false);
    
    // FIX: The `LiveSession` type is not exported, so `any` is used as a replacement.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const transcriptionRef = useRef('');

    const listNames = useMemo(() => lists.map(l => l.name), [lists]);
    const listColorMap = useMemo(() => new Map(lists.map(l => [l.name, l.color])), [lists]);

    // --- Voice Input Logic ---

    const createTaskFromText = async (text: string) => {
        if (!text) return;
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const schema = {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING, description: "The main title of the task." },
                    list: { type: Type.STRING, description: `The category for the task. Must be one of: ${listNames.join(', ')}.` },
                    isImportant: { type: Type.BOOLEAN, description: "Whether the task is important." },
                    isToday: { type: Type.BOOLEAN, description: "Whether the task is for today." },
                    type: { type: Type.STRING, description: "The type of task, either 'Fixed' (has a specific time) or 'Flexible'.", enum: ['Fixed', 'Flexible'] },
                    dueDate: { type: Type.STRING, description: "The due date in YYYY-MM-DD format." },
                    startTime: { type: Type.STRING, description: "The start time in HH:MM (24-hour) format." },
                    duration: { type: Type.INTEGER, description: "The estimated duration of the task in minutes." },
                    notes: { type: Type.STRING, description: "Any additional notes or details." },
                },
                required: ["title", "list"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
                config: {
                    systemInstruction: `You are an intelligent task parser. Analyze the user's text and extract task details. Your response MUST be in JSON format and strictly adhere to the provided schema. The user's available task lists are: ${listNames.join(', ')}. If the user specifies a list that isn't in the available lists, or doesn't specify one, use '${listNames[0] || 'Personal'}' as the default. If the user mentions a time without a date, assume it's for today (${today}). Infer if the task is important or for today based on keywords. A task with a specific startTime is 'Fixed', otherwise it is 'Flexible'.`,
                    responseMimeType: "application/json",
                    responseSchema: schema,
                },
            });

            const parsed = JSON.parse(response.text);
            const chosenList = listNames.includes(parsed.list) ? parsed.list : (listNames[0] || 'Personal');

            const taskForContext: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed' | 'status'> = {
                title: parsed.title,
                category: chosenList,
                important: parsed.isImportant || false,
                today: parsed.isToday || !!parsed.startTime || false,
                type: parsed.startTime ? 'Fixed' : 'Flexible',
                dueDate: parsed.dueDate || undefined,
                startDate: parsed.startTime ? (parsed.dueDate || today) : undefined,
                startTime: parsed.startTime || undefined,
                time: parsed.startTime ? parsed.startTime : '--:--',
                duration: parsed.duration || undefined,
                notes: parsed.notes || undefined,
                subtasks: [],
                color: listColorMap.get(chosenList) || 'gray',
            };
            await addTask(taskForContext);
            alert(`Task created: ${parsed.title}`);

        } catch (err) {
            console.error("Gemini task creation from voice failed:", err);
            alert("Sorry, I couldn't understand that. Please try rephrasing your task.");
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        setTimeout(() => setShowRecordingUI(false), 300);
        setLiveTranscription('');

        streamRef.current?.getTracks().forEach(track => track.stop());
        sourceNodeRef.current?.disconnect();
        scriptProcessorRef.current?.disconnect();
        audioContextRef.current?.close();

        streamRef.current = null;
        scriptProcessorRef.current = null;
        sourceNodeRef.current = null;
        audioContextRef.current = null;

        sessionPromiseRef.current?.then(session => session.close());
        sessionPromiseRef.current = null;
    };
    
    const startRecording = async () => {
        try {
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            setShowRecordingUI(true);
            setIsRecording(true);
            transcriptionRef.current = '';
            setLiveTranscription('');

            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
            scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (sourceNodeRef.current && scriptProcessorRef.current && audioContextRef.current) {
                            sourceNodeRef.current.connect(scriptProcessorRef.current);
                            scriptProcessorRef.current.connect(audioContextRef.current.destination);
                        }
                    },
                    onmessage: (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            const newText = message.serverContent.inputTranscription.text;
                            transcriptionRef.current += newText;
                            setLiveTranscription(prev => prev + newText);
                        }
                        // Ignore audio output from the model as we only want transcription
                    },
                    onclose: async () => {
                        const finalText = transcriptionRef.current.trim();
                        if (finalText) {
                            await createTaskFromText(finalText);
                        }
                        transcriptionRef.current = ''; // Reset for next session
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        alert('Voice recognition failed. Please try again.');
                        stopRecording();
                    }
                },
                config: {
                    responseModalities: [Modality.AUDIO], // Required by API, but we will ignore the audio output
                    inputAudioTranscription: {},
                },
            });

            scriptProcessorRef.current.onaudioprocess = (event) => {
                const inputData = event.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromiseRef.current?.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            };

        } catch (err) {
            console.error('Failed to start recording:', err);
            alert('Could not access microphone. Please check permissions.');
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
            {showRecordingUI && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-page-fade-in backdrop-blur-sm">
                    <div className="w-40 h-40 bg-[var(--color-primary-500)]/50 rounded-full flex items-center justify-center animate-pulse-recording">
                        <MicrophoneIcon className="w-16 h-16 text-white" />
                    </div>
                </div>
            )}
             {showRecordingUI && (
                <div
                    className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50 transition-all duration-300 ease-out"
                    style={{ bottom: `calc(7rem + env(safe-area-inset-bottom))` }}
                >
                    <div className="bg-black/70 backdrop-blur-md rounded-xl p-4 text-white text-center text-sm animate-page-fade-in min-h-[3.5rem] flex items-center justify-center">
                        <p>{liveTranscription}<span className="inline-block w-1 h-4 bg-white ml-1 animate-pulse"></span></p>
                    </div>
                </div>
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
                    
                    <NavItem to="/focus" icon={<FocusIcon />} label="Focus" />
                    <NavItem to="/moments" icon={<MomentsIcon />} label="Moments" />
                </div>
            </div>

            {/* FAB Button - positioned independently */}
             <div
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transform -translate-x-[calc(50%-0px)]"
                style={{ bottom: `calc(1rem + env(safe-area-inset-bottom))` }}
             >
                <button
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    className={`w-16 h-16 bg-[var(--color-primary-500)] text-[var(--color-on-primary)] rounded-full flex items-center justify-center fab-shadow transform transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary-200)] ${isMenuOpen ? 'rotate-[-225deg]' : ''} ${isRecording ? 'animate-fab-pulse' : ''}`}
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                    aria-label={isMenuOpen ? "Close menu" : "Open menu"}
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
            />
        </>
    );
};

export default BottomNavBar;