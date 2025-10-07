import React, { useState, useEffect, useRef } from 'react';
import { Task } from '../../data/mockData';
import Button from '../common/Button';
import useCountdown from '../../hooks/useCountdown';
import DynamicBackground from './DynamicBackground';
import GrowingPlant from './GrowingPlant';
import { quotes } from '../../data/quotes';
import { SoundOnIcon } from '../icons/Icons';

interface FocusSessionProps {
  task?: Task;
  onComplete: () => void;
  plantType: string | null;
}

const sounds = [
  { name: 'Rain', file: '/audio/rain.mp3' },
  { name: 'Forest', file: '/audio/forest.mp3' },
  { name: 'Waves', file: '/audio/waves.mp3' },
  { name: 'Café', file: '/audio/cafe.mp3' },
];

const PlayIcon: React.FC = () => <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"></path></svg>;
const PauseIcon: React.FC = () => <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z"></path></svg>;
const StopIcon: React.FC = () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 5.5A.5.5 0 016 5h8a.5.5 0 01.5.5v8a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5v-8z"></path></svg>;
const RefreshIcon: React.FC = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.18-3.185m-3.181-4.995l-3.182-3.182a8.25 8.25 0 00-11.664 0l-3.18 3.185" /></svg>

const FocusSession: React.FC<FocusSessionProps> = ({ task, onComplete, plantType }) => {
    const initialSeconds = (task?.duration || 25) * 60;
    const { secondsRemaining, isActive, start, pause, reset } = useCountdown({ 
        initialSeconds,
        onComplete 
    });

    const [quote, setQuote] = useState<string | null>(null);
    const [currentSound, setCurrentSound] = useState<string | null>(null);
    const [isSoundMenuOpen, setIsSoundMenuOpen] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setQuote(randomQuote);
    }, [task]); 

    useEffect(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        const playAudio = () => {
            audioEl.play().catch(e => console.error("Audio play failed:", e));
        };

        audioEl.pause();
        audioEl.removeEventListener('canplay', playAudio);

        if (currentSound) {
            audioEl.src = currentSound;
            audioEl.load();
            audioEl.addEventListener('canplay', playAudio);
        } else {
            audioEl.src = '';
        }

        return () => {
          if (audioEl) {
            audioEl.removeEventListener('canplay', playAudio);
          }
        };
    }, [currentSound]);
    
    useEffect(() => {
      return () => {
        const audioEl = audioRef.current;
        if (audioEl) {
            audioEl.pause();
            audioEl.src = '';
        }
      }
    }, []);

    const handleSoundSelect = (file: string | null) => {
        setCurrentSound(file);
        setIsSoundMenuOpen(false);
    };

    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    const circumference = 2 * Math.PI * 48;
    const progress = initialSeconds > 0 ? secondsRemaining / initialSeconds : 0;
    const strokeDashoffset = circumference * (1 - progress);
    
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 relative overflow-hidden">
            <DynamicBackground />
            <audio ref={audioRef} loop />

            <div className="z-10 flex flex-col justify-end min-h-[8rem]">
                <p className="text-xl font-medium text-[var(--color-primary-500)] mb-2">{task ? task.title : 'Break Time'}</p>
                <div className="min-h-[3rem] flex items-center justify-center">
                    {quote && (
                        <div className="px-6 animate-quote-fade">
                            <p className="text-lg font-medium text-gray-600 italic">"{quote}"</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center my-4 z-10">
                <svg className="absolute w-full h-full" viewBox="0 0 100 100">
                    <circle className="text-gray-300/50" strokeWidth="4" stroke="currentColor" fill="transparent" r="48" cx="50" cy="50" />
                    <circle
                        className="text-[var(--color-primary-500)]"
                        style={{ transition: 'stroke-dashoffset 1s linear' }}
                        strokeWidth="4"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="48"
                        cx="50"
                        cy="50"
                        transform="rotate(-90 50 50)"
                    />
                </svg>
                <div className="z-10">
                    <h2 className="text-6xl md:text-7xl font-bold text-gray-800 tabular-nums tracking-tighter">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </h2>
                </div>
            </div>

            <div className="flex items-center gap-6 z-10">
                 <Button variant="secondary" className="!w-auto !px-6 !py-3 disabled:opacity-50" onClick={reset} disabled={!isActive && secondsRemaining === initialSeconds}>
                    <RefreshIcon/>
                 </Button>
                <button 
                    className="w-20 h-20 bg-[var(--color-primary-500)] text-white rounded-full flex items-center justify-center fab-shadow transform hover:scale-105 transition-transform"
                    onClick={isActive ? pause : start}
                >
                    {isActive ? <PauseIcon/> : <PlayIcon/>}
                </button>
                 <Button variant="secondary" className="!w-auto !px-6 !py-3" onClick={onComplete}>
                    <StopIcon/>
                 </Button>
            </div>

            <GrowingPlant 
                plantType={plantType}
                isGrown={false}
                className="absolute bottom-6 left-6 w-16 h-16 z-20 opacity-80"
            />
            
            <div className="absolute bottom-6 right-6 z-20">
                <div className="relative">
                    <button
                        onClick={() => setIsSoundMenuOpen(!isSoundMenuOpen)}
                        className="p-3 bg-white/50 backdrop-blur-sm rounded-full text-gray-700 hover:bg-white/80 transition-colors"
                        aria-haspopup="true"
                        aria-expanded={isSoundMenuOpen}
                    >
                        <SoundOnIcon className="w-6 h-6" />
                    </button>

                    {isSoundMenuOpen && (
                        <div className="absolute bottom-full right-0 mb-2 w-36 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-2 space-y-1 animate-page-fade-in">
                            {sounds.map(sound => (
                                <button
                                    key={sound.name}
                                    onClick={() => handleSoundSelect(sound.file)}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${currentSound === sound.file ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-200/50'}`}
                                >
                                    {sound.name}
                                </button>
                            ))}
                            <div className="border-t border-gray-900/10 my-1"/>
                            <button
                                onClick={() => handleSoundSelect(null)}
                                className={`w-full text-left px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!currentSound ? 'bg-gray-200 text-gray-800' : 'text-gray-700 hover:bg-gray-200/50'}`}
                            >
                                Mute
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FocusSession;