
import React, { useState, useEffect, useRef } from 'react';

const ClockIcon: React.FC = () => (
    <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

interface DurationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDurationSelect: (duration: number) => void;
  initialDuration?: number;
}

const DurationPickerModal: React.FC<DurationPickerModalProps> = ({ isOpen, onClose, onDurationSelect, initialDuration }) => {
    const [duration, setDuration] = useState('30');
    const durationInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setDuration(String(initialDuration || 30));
        }
    }, [isOpen, initialDuration]);

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || /^\d*$/.test(value)) {
            setDuration(value);
        }
    };

    const handleBlur = () => {
        if (duration === '') setDuration('0');
    };

    const handleSave = () => {
        const finalDuration = parseInt(duration, 10);
        if (!isNaN(finalDuration)) {
            onDurationSelect(finalDuration);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="duration-picker-title"
        >
            <div
                className="absolute inset-0 bg-black/40 animate-page-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative w-full max-w-xs p-6 mx-4 bg-white dark:bg-gray-800 rounded-2xl modal-shadow transform transition-all duration-300 animate-card-fade-in">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <ClockIcon />
                    </div>
                    <h2 id="duration-picker-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        Set Duration
                    </h2>
                </div>

                <div className="flex items-center justify-center my-6 text-gray-800 dark:text-gray-200">
                     <input
                        ref={durationInputRef}
                        type="text"
                        inputMode="numeric"
                        value={duration}
                        onChange={handleDurationChange}
                        onBlur={handleBlur}
                        onFocus={(e) => e.target.select()}
                        className="w-28 text-center text-5xl font-bold bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 py-2"
                        maxLength={3}
                        pattern="\d*"
                    />
                    <span className="ml-3 text-lg text-gray-500 dark:text-gray-400 font-medium">minutes</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DurationPickerModal;