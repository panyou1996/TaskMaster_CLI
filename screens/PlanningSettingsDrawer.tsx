import React, { useState, useEffect } from 'react';
import usePlanningSettings, { PlanningSettings } from '../hooks/usePlanningSettings';
import { CheckIcon, CloseIcon } from '../components/icons/Icons';

interface PlanningSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TimeInput: React.FC<{ label: string; value: string; onChange: (value: string) => void; }> = ({ label, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
    </div>
);

const NumberInput: React.FC<{ label: string; value: number; onChange: (value: number) => void; unit: string; }> = ({ label, value, onChange, unit }) => (
    <div>
        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
        <div className="mt-1 relative rounded-md shadow-sm">
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 dark:text-gray-400 sm:text-sm">{unit}</span>
            </div>
        </div>
    </div>
);

const Toggle: React.FC<{ label: string; enabled: boolean; setEnabled: (enabled: boolean) => void; }> = ({ label, enabled, setEnabled }) => (
    <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
        >
            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    </div>
);

const PlanningSettingsDrawer: React.FC<PlanningSettingsDrawerProps> = ({ isOpen, onClose }) => {
    const [savedSettings, setSavedSettings] = usePlanningSettings();
    const [localSettings, setLocalSettings] = useState<PlanningSettings>(savedSettings);

    useEffect(() => {
        if (isOpen) {
            setLocalSettings(savedSettings);
        }
    }, [isOpen, savedSettings]);

    const handleSave = () => {
        setSavedSettings(localSettings);
        onClose();
    };

    const handleSettingChange = <K extends keyof PlanningSettings>(key: K, value: PlanningSettings[K]) => {
        setLocalSettings(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-end transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
            <div
                className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <div
                className={`w-full bg-gray-50 dark:bg-gray-900 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out transform ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="planning-settings-title"
            >
                <header className="pt-3 px-4 pb-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-3xl sticky top-0 z-10" style={{ paddingTop: `calc(0.75rem + var(--status-bar-height, env(safe-area-inset-top)))` }}>
                    <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
                    <div className="flex justify-between items-center h-8">
                        <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><CloseIcon /></button>
                        <h2 id="planning-settings-title" className="text-base font-bold text-gray-900 dark:text-gray-100">Planning Settings</h2>
                        <button onClick={handleSave} className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><CheckIcon /></button>
                    </div>
                </header>
                
                <div
                    className="p-4 space-y-6 overflow-y-auto max-h-[75vh] pb-24"
                    style={{ paddingBottom: `calc(6rem + env(safe-area-inset-bottom))` }}
                >
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-4">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Work & Rest Schedule</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <TimeInput label="Work Start" value={localSettings.workStartTime} onChange={v => handleSettingChange('workStartTime', v)} />
                            <TimeInput label="Work End" value={localSettings.workEndTime} onChange={v => handleSettingChange('workEndTime', v)} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <TimeInput label="Lunch Start" value={localSettings.lunchStartTime} onChange={v => handleSettingChange('lunchStartTime', v)} />
                            <TimeInput label="Lunch End" value={localSettings.lunchEndTime} onChange={v => handleSettingChange('lunchEndTime', v)} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <TimeInput label="Dinner Start" value={localSettings.dinnerStartTime} onChange={v => handleSettingChange('dinnerStartTime', v)} />
                            <TimeInput label="Dinner End" value={localSettings.dinnerEndTime} onChange={v => handleSettingChange('dinnerEndTime', v)} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-4">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Auto-Plan Rules</h3>
                        <NumberInput label="Task Gap" value={localSettings.taskGap} onChange={v => handleSettingChange('taskGap', v)} unit="min" />
                        <Toggle label="Allow Task Splitting" enabled={localSettings.allowTaskSplitting} setEnabled={v => handleSettingChange('allowTaskSplitting', v)} />
                    </div>

                     <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm space-y-3">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Planning Algorithm</h3>
                        <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                            <button type="button" onClick={() => handleSettingChange('algorithm', 'sequential')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${localSettings.algorithm === 'sequential' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Fastest</button>
                            <button type="button" onClick={() => handleSettingChange('algorithm', 'weighted')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${localSettings.algorithm === 'weighted' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Smartest</button>
                            <button type="button" onClick={() => handleSettingChange('algorithm', 'ask')} className={`w-1/3 py-1.5 text-sm font-semibold rounded-md transition-all ${localSettings.algorithm === 'ask' ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>Ask</button>
                        </div>
                         <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 px-1 min-h-[3rem]">
                            {localSettings.algorithm === 'sequential' && <p><strong>Fastest:</strong> Quickly fits tasks into available time slots. Best for speed.</p>}
                            {localSettings.algorithm === 'weighted' && <p><strong>Smartest:</strong> Considers task importance. May take longer to generate an optimal plan.</p>}
                            {localSettings.algorithm === 'ask' && <p><strong>Ask:</strong> Prompts you to choose an algorithm each time you plan.</p>}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default PlanningSettingsDrawer;
