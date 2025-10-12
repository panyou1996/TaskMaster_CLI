import { useState, useRef, useCallback } from 'react';

export const useWebSpeech = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    // FIX: Changed to take a single onEnd callback with the final result.
    const start = useCallback((onEnd: (result: string) => void) => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Web Speech API is not supported by this browser.');
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        // FIX: Changed language to en-US for consistency with native implementation.
        recognition.lang = 'en-US';

        let finalTranscriptAccumulator = '';

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onend = () => {
            setIsRecording(false);
            onEnd(finalTranscriptAccumulator.trim());
        };

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript_part = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscriptAccumulator += transcript_part;
                } else {
                    interimTranscript += transcript_part;
                }
            }
            setTranscript(finalTranscriptAccumulator + interimTranscript);
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
