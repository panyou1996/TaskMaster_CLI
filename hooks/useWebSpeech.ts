import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// Pass addDebugLog as a parameter to enable logging from the hook
export const useWebSpeech = (addDebugLog: (log: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const onEndRef = useRef<(result: string) => void>(() => {});

    const start = useCallback((onEnd: (result: string) => void) => {
        onEndRef.current = onEnd;

        if (Capacitor.isNativePlatform()) {
            // NATIVE PLATFORM LOGIC
            (async () => {
                try {
                    addDebugLog('Native Speech: Checking availability.');
                    const available = await SpeechRecognition.available();
                    if (!available) {
                        alert('Speech recognition is not available on this device.');
                        return;
                    }

                    addDebugLog('Native Speech: Checking permissions.');
                    let permissionStatus = await SpeechRecognition.checkPermissions();
                    if (permissionStatus.speechRecognition !== 'granted') {
                        addDebugLog('Native Speech: Requesting permissions.');
                        permissionStatus = await SpeechRecognition.requestPermissions();
                    }
                    
                    if (permissionStatus.speechRecognition !== 'granted') {
                        alert('Microphone permission is required for speech recognition.');
                        return;
                    }
                    
                    setIsRecording(true);
                    setTranscript('Listening...');

                    SpeechRecognition.addListener('partialResults', (data: any) => {
                        if (data.matches && data.matches.length > 0) {
                            addDebugLog(`Native partial: "${data.matches[0]}"`);
                            setTranscript(data.matches[0]);
                        }
                    });

                    addDebugLog('Native Speech: Starting recognition.');
                    const result = await SpeechRecognition.start({
                        language: 'zh-CN',
                        maxResults: 1,
                        prompt: 'Say something...',
                        partialResults: true,
                    });
                    
                    let finalTranscript = '';
                    if (result && result.matches && result.matches.length > 0) {
                        finalTranscript = result.matches[0].trim();
                    }
                    addDebugLog(`Native Speech: Final transcript: "${finalTranscript}"`);
                    onEndRef.current(finalTranscript);

                } catch (error: any) {
                    addDebugLog(`Native speech error: ${error.message}`);
                    onEndRef.current('');
                } finally {
                    addDebugLog('Native Speech: Cleaning up.');
                    setIsRecording(false);
                    setTranscript('');
                    SpeechRecognition.removeAllListeners();
                }
            })();

        } else {
            // WEB PLATFORM LOGIC
            if (recognitionRef.current) {
                addDebugLog('Web Speech: start() called while already active.');
                return;
            }
            if (!('webkitSpeechRecognition' in window)) {
                addDebugLog('Web Speech API not supported.');
                alert('Web Speech API is not supported by this browser.');
                return;
            }

            const recognition = new (window as any).webkitSpeechRecognition();
            recognitionRef.current = recognition;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'zh-CN';

            let finalTranscriptAccumulator = '';

            recognition.onstart = () => {
                addDebugLog('Web Speech: onstart');
                setIsRecording(true);
            };

            recognition.onend = () => {
                addDebugLog('Web Speech: onend');
                setIsRecording(false);
                if (recognitionRef.current) {
                    onEndRef.current(finalTranscriptAccumulator.trim());
                }
                recognitionRef.current = null;
            };

            recognition.onerror = (event: any) => {
                addDebugLog(`Web Speech: onerror - ${event.error}: ${event.message}`);
                // onEnd will be called automatically, which will call the onEndRef
            };
            
            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                finalTranscriptAccumulator = ''; // Start from scratch
                for (let i = 0; i < event.results.length; ++i) {
                     if (event.results[i].isFinal) {
                        finalTranscriptAccumulator += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                addDebugLog(`Web Speech onresult: final="${finalTranscriptAccumulator}" interim="${interimTranscript}"`);
                setTranscript(finalTranscriptAccumulator + interimTranscript);
            };

            try {
                recognition.start();
                addDebugLog('Web Speech: recognition.start() called.');
            } catch (e: any) {
                addDebugLog(`Web Speech: recognition.start() failed: ${e.message}`);
            }
        }
    }, [addDebugLog]);

    const stop = useCallback(() => {
        if (Capacitor.isNativePlatform()) {
            addDebugLog('Native Speech: stop() called.');
            SpeechRecognition.stop().catch(err => addDebugLog(`Native Speech: stop() error: ${err.message}`));
        } else {
            if (recognitionRef.current) {
                addDebugLog('Web Speech: stop() called.');
                recognitionRef.current.stop();
            } else {
                 addDebugLog('Web Speech: stop() called but no recognitionRef.');
            }
        }
    }, [addDebugLog]);

    // Cleanup listeners on unmount
    useEffect(() => {
        return () => {
            if (Capacitor.isNativePlatform()) {
                SpeechRecognition.removeAllListeners();
            } else if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    return { isRecording, transcript, start, stop };
};
