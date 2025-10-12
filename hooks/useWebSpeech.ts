import { useState, useRef, useCallback } from 'react';

export const useWebSpeech = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    const start = useCallback((onResult: (result: string) => void, onEnd: () => void) => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Web Speech API is not supported by this browser.');
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onend = () => {
            setIsRecording(false);
            onEnd();
        };

        recognition.onresult = (event: any) => {
            console.log('onresult event:', event);
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            console.log('Updating transcript:', finalTranscript || interimTranscript);
            setTranscript(finalTranscript || interimTranscript);
            if (finalTranscript) {
                onResult(finalTranscript);
            }
        };

        recognition.start();
    }, []);

    const stop = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    return { isRecording, transcript, start, stop };
};