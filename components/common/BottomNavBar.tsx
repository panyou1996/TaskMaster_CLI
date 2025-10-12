import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TodayIcon, ListsIcon, MomentsIcon, PlusIcon, AddTaskMenuIcon, AddListMenuIcon, AddMomentMenuIcon, MicrophoneIcon, SettingsIcon } from '../icons/Icons';
import { AddMomentScreen, NewMomentData } from '../../screens/AddMomentScreen';
import { takePhotoWithCapacitor, triggerHapticImpact, triggerHapticSelection } from '../../utils/permissions';
import { useData } from '../../contexts/DataContext';
import { Moment } from '../../data/mockData';
import AddTaskWithAIScreen from '../../screens/AddTaskWithAIScreen';
import AddListScreen, { NewListData } from '../../screens/AddListScreen';
import { App as CapacitorApp } from '@capacitor/app';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
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
    const { addMoment, addList } = useData();

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

    const { isRecording: isWebRecording, transcript: webTranscript, start: startWebSpeech, stop: stopWebSpeech } = useWebSpeech();

    const cleanupRecording = useCallback(() => {
        setIsRecording(false);
        setShowRecordingUI(false);
        setLiveTranscription('');
        if (Capacitor.isNativePlatform()) {
            SpeechRecognition.removeAllListeners();
        }
    }, []);

    const startRecording = useCallback(async () => {
      if (isRecording) return;

      if (Capacitor.isNativePlatform()) {
          try {
              const available = await SpeechRecognition.available();
              if (!available) {
                  alert('Speech recognition is not available on this device.');
                  return;
              }

              const permissionStatus = await SpeechRecognition.requestPermissions();
              if (permissionStatus.speechRecognition !== 'granted') {
                  alert('Microphone permission is required for speech recognition.');
                  return;
              }

              setShowRecordingUI(true);
              setIsRecording(true);
              setLiveTranscription('');

              SpeechRecognition.addListener('partialResults', (data: any) => {
                  if (data.matches && data.matches.length > 0) {
                      setLiveTranscription(data.matches[0]);
                  }
              });

              const result = await SpeechRecognition.start({
                  language: 'zh-CN',
                  maxResults: 1,
                  prompt: 'Say something...',
                  partialResults: true,
              });
              
              if (result && result.matches && result.matches.length > 0) {
                const finalTranscript = result.matches[0].trim();
                if (finalTranscript) {
                    setInitialAIPrompt(finalTranscript);
                    setIsAddTaskWithAIOpen(true);
                }
              }

          } catch (error: any) {
              console.error('Speech recognition error:', error);
          } finally {
              cleanupRecording();
          }
      } else {
          // Web-based speech recognition
          setShowRecordingUI(true);
          startWebSpeech(
            (finalTranscript) => {
              // This single callback is executed when recognition ends.
              cleanupRecording(); // Hide the "Listening..." UI first.
              
              // If we got a result, open the AI modal.
              if (finalTranscript) {
                setInitialAIPrompt(finalTranscript);
                setIsAddTaskWithAIOpen(true);
              }
            }
          );
      }
    }, [isRecording, cleanupRecording, startWebSpeech]);

    const stopRecording = useCallback(() => {
        if (Capacitor.isNativePlatform()) {
            if (isRecording) {
                SpeechRecognition.stop();
            }
        } else {
            stopWebSpeech();
        }
    }, [isRecording, stopWebSpeech]);

    useEffect(() => {
        if (isWebRecording) {
            setIsRecording(true);
        } else {
            setIsRecording(false);
        }
    }, [isWebRecording]);

    useEffect(() => {
        setLiveTranscription(webTranscript);
    }, [webTranscript]);

    // Effect to handle app going to the background
    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const handleAppStateChange = ({ isActive }: { isActive: boolean }) => {
            if (!isActive && isRecording) {
                // App is going to the background, stop any active recording.
                stopRecording();
            }
        };

        const listenerPromise = CapacitorApp.addListener('appStateChange', handleAppStateChange);

        return () => {
            listenerPromise.then(listener => listener.remove());
        };
    }, [isRecording, stopRecording]);

    useEffect(() => {
      const handleGlobalPointerUp = () => {
          // If a long press was in progress, stop it.
          if (isLongPressRef.current) {
              stopRecording();
          }
          
          // If a long press was about to start (timer running), cancel it.
          if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
          }

          // Always reset the long press flag on pointer up.
          isLongPressRef.current = false;
      };

      // Only listen for the 'up' event globally. This is robust against animations
      // and the user dragging their finger off the button while still holding.
      window.addEventListener('pointerup', handleGlobalPointerUp);

      return () => {
          window.removeEventListener('pointerup', handleGlobalPointerUp);
      };
    }, [stopRecording]);
    
    const handlePointerDown = () => {
        isLongPressRef.current = false;
        // Clear any lingering timer, just in case.
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
        }
        longPressTimerRef.current = setTimeout(() => {
            isLongPressRef.current = true;
            longPressTimerRef.current = null; // Timer has fired, no need to clear it on pointer up
            if (isMenuOpen) setIsMenuOpen(false);
            
            triggerHapticImpact(ImpactStyle.Medium);

            startRecording();
        }, 250);
    };

    const handlePointerUp = () => {
        // If the timer is still running, it means it was a short press (a "click").
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            
            // We can be sure it's not a long press, so toggle the menu.
            if (!isLongPressRef.current) {
                triggerHapticImpact();
                setIsMenuOpen(prev => !prev);
            }
        }
        // If it was a long press (timer is null, isLongPressRef is true), 
        // the global `pointerup` listener handles `stopRecording`.
        // We do nothing here for that case.
    };

    const handleMomentButtonClick = async () => {
        triggerHapticImpact();
        setIsMenuOpen(false); // Close the FAB menu immediately
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
                        style={{ bottom: `calc(1rem + env(safe-area-inset-bottom, 0px) - 2.5rem)` }}
                    />
                     <div
                        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-50 transition-all duration-300 ease-out"
                        style={{ bottom: `calc(7rem + env(safe-area-inset-bottom, 0px))` }}
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
                    style={{ bottom: `calc(7rem + env(safe-area-inset-bottom, 0px))` }}
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
                style={{ height: `calc(5rem + env(safe-area-inset-bottom, 0px))` }}
            >
                <div
                    className="grid grid-cols-5 items-center h-full max-w-sm mx-auto"
                    style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
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
                style={{ bottom: `calc(1rem + env(safe-area-inset-bottom, 0px))` }}
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