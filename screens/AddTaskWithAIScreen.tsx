import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useData } from '../contexts/DataContext';
import { Task } from '../data/mockData';
import { RefreshSpinnerIcon, SparklesIcon, SendIcon, CloseIcon } from '../components/icons/Icons';

interface AddTaskWithAIScreenProps {
    isOpen: boolean;
    onClose: () => void;
    initialPrompt?: string;
}

const AddTaskWithAIScreen: React.FC<AddTaskWithAIScreenProps> = ({ isOpen, onClose, initialPrompt }) => {
    const { addTask, lists } = useData();
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const listNames = useMemo(() => lists.map(l => l.name), [lists]);
    const listColorMap = useMemo(() => new Map(lists.map(l => [l.name, l.color])), [lists]);

    useEffect(() => {
        if (isOpen) {
            setPrompt(initialPrompt || '');
            setError(null);
            setIsLoading(false);
            // Auto-focus the textarea when the modal opens
            setTimeout(() => {
                textareaRef.current?.focus();
                // If there's an initial prompt, move cursor to the end
                if (initialPrompt) {
                    textareaRef.current?.setSelectionRange(initialPrompt.length, initialPrompt.length);
                }
            }, 300);
        }
    }, [isOpen, initialPrompt]);

    const handleGenerateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
                contents: prompt,
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
            onClose();

        } catch (err) {
            console.error("Gemini task creation failed:", err);
            setError("Sorry, I couldn't understand that. Please try rephrasing your task.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}
             role="dialog" aria-modal="true" aria-labelledby="ai-task-title">
            <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300"
                 onClick={onClose} aria-hidden="true"/>
            <div className={`w-full bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="p-4 flex flex-col" style={{ paddingBottom: `calc(1rem + env(safe-area-inset-bottom))` }}>
                    <header className="flex-shrink-0 flex items-center justify-between pb-3">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-purple-500 dark:text-purple-400"/>
                            <h2 id="ai-task-title" className="text-lg font-bold text-gray-900 dark:text-white">Create Task with AI</h2>
                        </div>
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-800 dark:hover:text-white"><CloseIcon /></button>
                    </header>

                    <main className="flex-grow flex items-center justify-center min-h-[6rem]">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-300">
                                <RefreshSpinnerIcon/>
                                <span>Creating task...</span>
                            </div>
                        ) : error ? (
                             <p className="text-center text-red-500 dark:text-red-400 px-4">{error}</p>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 px-4">
                                Describe your task in plain language.
                            </p>
                        )}
                    </main>

                    <footer className="flex-shrink-0 mt-4">
                        <form onSubmit={handleGenerateTask}>
                            <div className="relative">
                                <textarea
                                    ref={textareaRef}
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleGenerateTask(e);
                                        }
                                    }}
                                    disabled={isLoading}
                                    placeholder="Type your task here..."
                                    rows={1}
                                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl py-3 pl-4 pr-14 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                                />
                                <button
                                    type="submit"
                                    disabled={!prompt.trim() || isLoading}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                                    aria-label="Generate Task"
                                >
                                    <SendIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        </form>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default AddTaskWithAIScreen;