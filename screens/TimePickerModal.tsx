import React, { useState, useEffect, useRef } from 'react';

interface TimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTimeSelect: (time: string) => void;
  initialTime?: string;
  onClearTime?: () => void;
}

const ClockIcon: React.FC = () => (
    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TimePickerModal: React.FC<TimePickerModalProps> = ({ isOpen, onClose, onTimeSelect, initialTime, onClearTime }) => {
    const [hour, setHour] = useState('09');
    const [minute, setMinute] = useState('00');
    const hourInputRef = useRef<HTMLInputElement>(null);
    const minuteInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
             if (initialTime) {
                const [initialH = '09', initialM = '00'] = initialTime.split(':');
                setHour(initialH);
                setMinute(initialM);
            } else {
                const now = new Date();
                setHour(String(now.getHours()).padStart(2, '0'));
                setMinute(String(now.getMinutes()).padStart(2, '0'));
            }
        }
    }, [isOpen, initialTime]);

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.slice(-2);
        if (value === '' || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 23)) {
            setHour(value);
            if (value.length === 2) {
                minuteInputRef.current?.focus();
                minuteInputRef.current?.select();
            }
        }
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.slice(-2);
        if (value === '' || (parseInt(value, 10) >= 0 && parseInt(value, 10) <= 59)) {
            setMinute(value);
        }
    };
    
    const handleBlur = (field: 'hour' | 'minute') => {
        if (field === 'hour') setHour(val => val.padStart(2, '0'));
        if (field === 'minute') setMinute(val => val.padStart(2, '0'));
    };

    const handleSave = () => {
        const finalHour = hour.padStart(2, '0');
        const finalMinute = minute.padStart(2, '0');
        onTimeSelect(`${finalHour}:${finalMinute}`);
    };

    const handleClear = () => {
        if (onClearTime) {
            onClearTime();
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="time-picker-title"
        >
            <div
                className="absolute inset-0 bg-black/40 animate-page-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative w-full max-w-xs p-6 mx-4 bg-white rounded-2xl modal-shadow transform transition-all duration-300 animate-card-fade-in">
                <div className="text-center">
                    <div className="flex justify-center mb-4">
                        <ClockIcon />
                    </div>
                    <h2 id="time-picker-title" className="text-xl font-bold text-gray-900">
                        Set Start Time
                    </h2>
                </div>
                
                <div className="flex items-center justify-center text-5xl font-bold my-6 text-gray-800">
                    <input
                        ref={hourInputRef}
                        type="text"
                        inputMode="numeric"
                        value={hour}
                        onChange={handleHourChange}
                        onBlur={() => handleBlur('hour')}
                        onFocus={(e) => e.target.select()}
                        className="w-20 text-center bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={2}
                        pattern="\d*"
                    />
                    <span className="mx-2">:</span>
                     <input
                        ref={minuteInputRef}
                        type="text"
                        inputMode="numeric"
                        value={minute}
                        onChange={handleMinuteChange}
                        onBlur={() => handleBlur('minute')}
                        onFocus={(e) => e.target.select()}
                        className="w-20 text-center bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={2}
                        pattern="\d*"
                    />
                </div>
                
                <div className="mt-6 space-y-3">
                    {initialTime && onClearTime && (
                        <button
                            onClick={handleClear}
                            className="w-full px-4 py-3 font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                        >
                            Unschedule
                        </button>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-3 font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
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
        </div>
    );
};

export default TimePickerModal;