import React from 'react';

const IllustrationContainer: React.FC<{ children: React.ReactNode; title: string; message: string; cta?: React.ReactNode }> = ({ children, title, message, cta }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 h-full animate-page-fade-in">
        <div className="w-40 h-40 text-gray-400">
            {children}
        </div>
        <h3 className="text-lg font-bold text-gray-800 mt-6">{title}</h3>
        <p className="text-gray-500 mt-1 max-w-xs">{message}</p>
        {cta && <div className="mt-6 w-full max-w-xs">{cta}</div>}
    </div>
);


export const EmptyTodayIllustration: React.FC<{ onAddTask: () => void }> = ({ onAddTask }) => (
    <IllustrationContainer
        title="Your day is clear!"
        message="Enjoy your free time, or add a new task to get started."
        cta={
            <button 
                onClick={onAddTask}
                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
                + Add Task
            </button>
        }
    >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 12.5L10.5 15L16 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M12 3V1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M12 22.5V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M21 12L22.5 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M1.5 12L3 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M19.0711 4.92896L20.1317 3.8683" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3.86816 20.1317L4.92883 19.0711" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M19.0711 19.0711L20.1317 20.1317" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M3.86816 3.8683L4.92883 4.92896" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
    </IllustrationContainer>
);

export const EmptyListsIllustration: React.FC<{ onAddList: () => void }> = ({ onAddList }) => (
     <IllustrationContainer
        title="No lists yet"
        message="Create a list to organize your tasks into projects or categories."
         cta={
            <button 
                onClick={onAddList}
                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
                + Create List
            </button>
        }
    >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 13V9.5C20 8.39543 19.1046 7.5 18 7.5H12L10.5 5.25H6C4.89543 5.25 4 6.14543 4 7.25V16.75C4 17.8546 4.89543 18.75 6 18.75H12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16.5 15.5V21.5M19.5 18.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </IllustrationContainer>
);

export const EmptyListDetailIllustration: React.FC<{ onAddTask: () => void }> = ({ onAddTask }) => (
    <IllustrationContainer
        title="List is empty"
        message="Add a task to this list to get started on your goals."
        cta={
            <button 
                onClick={onAddTask}
                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
                + Add Task
            </button>
        }
    >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.5 2.5H8.5C7.39543 2.5 6.5 3.39543 6.5 4.5V19.5C6.5 20.6046 7.39543 21.5 8.5 21.5H15.5C16.6046 21.5 17.5 20.6046 17.5 19.5V4.5C17.5 3.39543 16.6046 2.5 15.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.5 7.5H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.5 11.5H14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.5 15.5H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </IllustrationContainer>
);


export const EmptyCalendarIllustration: React.FC = () => (
     <IllustrationContainer
        title="No tasks scheduled"
        message="This day is free. Enjoy the calm or schedule a new task."
    >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3.5 8.5H20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8.5 3.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M15.5 3.5V5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19.5 20.5H4.5C3.94772 20.5 3.5 20.0523 3.5 19.5V6.5C3.5 5.94772 3.94772 5.5 4.5 5.5H19.5C20.0523 5.5 20.5 5.94772 20.5 6.5V19.5C20.5 20.0523 20.0523 20.5 19.5 20.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 12.5V14M12 15.5V14M12 14H13.5M12 14H10.5M14.25 11.75L15 11M14.25 16.25L15 17M9.75 11.75L9 11M9.75 16.25L9 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </IllustrationContainer>
);

export const EmptyMomentsIllustration: React.FC<{ onAddMoment: () => void }> = ({ onAddMoment }) => (
    <IllustrationContainer
        title="Capture a moment"
        message="Your journal is waiting for its first entry. Add a photo to begin."
        cta={
            <button 
                onClick={onAddMoment}
                className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
                + Add Moment
            </button>
        }
    >
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.5 21H4.5C3.94772 21 3.5 20.5523 3.5 20V4C3.5 3.44772 3.94772 3 4.5 3H19.5C20.0523 3 20.5 3.44772 20.5 4V20C20.5 20.5523 20.0523 21 19.5 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9.5" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M6.5 18L10.5 14L13.5 17L15.5 15L17.5 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </IllustrationContainer>
);