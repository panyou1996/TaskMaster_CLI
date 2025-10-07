import { useState, useRef, useCallback, useEffect } from 'react';

interface UseCountdownProps {
  initialSeconds: number;
  onComplete?: () => void;
}

const useCountdown = ({ initialSeconds, onComplete }: UseCountdownProps) => {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<number | null>(null);
  const endTimeRef = useRef<number | null>(null);

  const animate = useCallback((timestamp: number) => {
    if (endTimeRef.current === null) return;

    const remaining = endTimeRef.current - timestamp;
    if (remaining <= 0) {
      setSecondsRemaining(0);
      setIsActive(false);
      onComplete?.();
    } else {
      setSecondsRemaining(Math.ceil(remaining / 1000));
      timerRef.current = requestAnimationFrame(animate);
    }
  }, [onComplete]);

  const start = useCallback(() => {
    if (!isActive) {
      setIsActive(true);
      endTimeRef.current = performance.now() + secondsRemaining * 1000;
      timerRef.current = requestAnimationFrame(animate);
    }
  }, [isActive, secondsRemaining, animate]);

  const pause = useCallback(() => {
    if (isActive && timerRef.current) {
      setIsActive(false);
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
      // Accurately set remaining seconds on pause
      if (endTimeRef.current) {
        const timeleft = Math.round((endTimeRef.current - performance.now()) / 1000);
        setSecondsRemaining(timeleft > 0 ? timeleft : 0);
      }
      endTimeRef.current = null;
    }
  }, [isActive]);

  const reset = useCallback(() => {
    pause();
    setSecondsRemaining(initialSeconds);
  }, [pause, initialSeconds]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
      }
    };
  }, []);

  // This effect now correctly resets the timer ONLY when the task/initialSeconds changes.
  // It no longer incorrectly triggers on pause.
  useEffect(() => {
    setSecondsRemaining(initialSeconds);
  }, [initialSeconds]);

  return { secondsRemaining, isActive, start, pause, reset };
};

export default useCountdown;