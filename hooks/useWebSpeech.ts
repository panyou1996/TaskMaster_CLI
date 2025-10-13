import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// Pass addDebugLog as a parameter to enable logging from the hook
export const useWebSpeech = (addDebugLog: (log: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const onEndRef = useRef<(result: string) => void>(() => {});
    const finalTranscriptAccumulatorRef = useRef('');

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
                    await SpeechRecognition.start({
                        language: 'zh-CN',
                        maxResults: 1,
                        prompt: 'Say something...',
                        partialResults: true,
                    });
                    
                    // Note: For Capacitor plugin, 'partialResults' is the main way to get live results.
                    // The final result is often delivered through the last partial result event
                    // before recognition stops. The `start` promise might not resolve with the final transcript
                    // in all implementations/platforms in the way web speech does. We will rely on the state
                    // managed by partialResults. The stop function will trigger the onEnd callback.
                    
                } catch (error: any) {
                    addDebugLog(`Native speech error: ${error.message}`);
                    onEndRef.current('');
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

            finalTranscriptAccumulatorRef.current = '';
            const recognition = new (window as any).webkitSpeechRecognition();
            recognitionRef.current = recognition;
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'zh-CN';

            recognition.onstart = () => {
                addDebugLog('Web Speech: onstart');
                setIsRecording(true);
            };

            recognition.onend = () => {
                addDebugLog('Web Speech: onend');
                setIsRecording(false);
                if (recognitionRef.current) {
                    onEndRef.current(finalTranscriptAccumulatorRef.current.trim());
                }
                recognitionRef.current = null;
            };

            recognition.onerror = (event: any) => {
                addDebugLog(`Web Speech: onerror - ${event.error}: ${event.message}`);
                // onEnd will be called automatically, which will call the onEndRef
            };
            
            recognition.onresult = (event: any) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                     if (event.results[i].isFinal) {
                        finalTranscriptAccumulatorRef.current += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                addDebugLog(`Web Speech onresult: final="${finalTranscriptAccumulatorRef.current}" interim="${interimTranscript}"`);
                setTranscript(finalTranscriptAccumulatorRef.current + interimTranscript);
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
            SpeechRecognition.stop()
              .then(() => {
                addDebugLog('Native speech stopped successfully.');
                onEndRef.current(transcript);
              })
              .catch(err => addDebugLog(`Native Speech: stop() error: ${err.message}`))
              .finally(() => {
                  setIsRecording(false);
                  setTranscript('');
                  SpeechRecognition.removeAllListeners();
              });
        } else {
            if (recognitionRef.current) {
                addDebugLog('Web Speech: stop() called.');
                recognitionRef.current.stop();
            } else {
                 addDebugLog('Web Speech: stop() called but no recognitionRef.');
            }
        }
    }, [addDebugLog, transcript]);

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
