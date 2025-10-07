
import React, { useState } from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import { CheckIcon } from '../../components/icons/Icons';

const SettingsToggleItem: React.FC<{
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  description?: string;
}> = ({ label, enabled, setEnabled, description }) => (
  <div 
    onClick={() => setEnabled(!enabled)}
    className="flex justify-between items-center p-4 cursor-pointer rounded-lg hover:bg-gray-50 transition-colors"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
  >
    <div>
      <span className="font-medium text-gray-800">{label}</span>
      {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
    </div>
    {enabled && (
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
            <CheckIcon className="w-4 h-4 text-blue-600" />
        </div>
    )}
  </div>
);

const NotificationSettingsScreen: React.FC = () => {
    const [taskReminders, setTaskReminders] = useState(true);
    const [dailySummary, setDailySummary] = useState(false);
    const [appUpdates, setAppUpdates] = useState(true);
    const [sound, setSound] = useState(true);
    const [vibrate, setVibrate] = useState(true);

    return (
        <SettingsLayout title="Notifications">
            <div className="bg-white p-2 rounded-lg card-shadow divide-y divide-gray-100">
                <SettingsToggleItem label="Task Reminders" enabled={taskReminders} setEnabled={setTaskReminders} description="Get notified before a task is due." />
                <SettingsToggleItem label="Daily Summary" enabled={dailySummary} setEnabled={setDailySummary} description="Receive a summary of your tasks for the day."/>
                <SettingsToggleItem label="App Updates" enabled={appUpdates} setEnabled={setAppUpdates} description="Stay informed about new features and updates."/>
            </div>
             <div className="bg-white p-2 rounded-lg card-shadow mt-6 divide-y divide-gray-100">
                <SettingsToggleItem label="Sound" enabled={sound} setEnabled={setSound} />
                <SettingsToggleItem label="Vibrate" enabled={vibrate} setEnabled={setVibrate} />
            </div>
        </SettingsLayout>
    );
};

export default NotificationSettingsScreen;
