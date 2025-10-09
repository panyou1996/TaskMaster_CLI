import React, { useState } from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import { CheckIcon, SoundOnIcon, VibrateIcon } from '../../components/icons/Icons';
import { useData } from '../../contexts/DataContext';
import useLocalStorage from '../../hooks/useLocalStorage';
import { checkAndRequestNotificationPermission } from '../../utils/permissions';
import { LocalNotifications } from '@capacitor/local-notifications';

const SettingsToggleItem: React.FC<{
  label: string;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  description?: string;
  icon?: React.ReactNode;
}> = ({ label, enabled, setEnabled, description, icon }) => (
  <div 
    onClick={() => setEnabled(!enabled)}
    className="flex justify-between items-center p-4 cursor-pointer rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
  >
    <div className="flex items-center gap-4">
        {icon && <div className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300">{icon}</div>}
        <div>
            <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
            {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
        </div>
    </div>
    <button
        aria-hidden="true"
        className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'}`}
    >
        <span className={`inline-block w-5 h-5 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

const NotificationSettingsScreen: React.FC = () => {
    const { rescheduleAllNotifications } = useData();
    const [taskReminders, setTaskReminders] = useLocalStorage('notifications_taskReminders', true);
    const [dailySummary, setDailySummary] = useState(false);
    const [appUpdates, setAppUpdates] = useState(true);
    const [sound, setSound] = useState(true);
    const [vibrate, setVibrate] = useState(true);

    const handleTaskRemindersToggle = async (enabled: boolean) => {
        if (enabled) {
            const permissionGranted = await checkAndRequestNotificationPermission();
            if (permissionGranted) {
                setTaskReminders(true);
                // Re-enable and schedule all notifications
                rescheduleAllNotifications();
            } else {
                setTaskReminders(false); // Keep it off if permission was denied
            }
        } else {
            setTaskReminders(false);
            // Cancel all pending notifications
            const pending = await LocalNotifications.getPending();
            if (pending.notifications.length > 0) {
                await LocalNotifications.cancel(pending);
            }
        }
    };


    return (
        <SettingsLayout title="Notifications">
            <div className="bg-white dark:bg-gray-800 p-2 rounded-lg card-shadow divide-y divide-gray-100 dark:divide-gray-700">
                <SettingsToggleItem label="Task Reminders" enabled={taskReminders} setEnabled={handleTaskRemindersToggle} description="Get notified before a task is due." />
                <SettingsToggleItem label="Daily Summary" enabled={dailySummary} setEnabled={setDailySummary} description="Receive a summary of your tasks for the day."/>
                <SettingsToggleItem label="App Updates" enabled={appUpdates} setEnabled={setAppUpdates} description="Stay informed about new features and updates."/>
            </div>
             <div className="bg-white dark:bg-gray-800 p-2 rounded-lg card-shadow mt-6 divide-y divide-gray-100 dark:divide-gray-700">
                <SettingsToggleItem label="Sound" enabled={sound} setEnabled={setSound} icon={<SoundOnIcon />} />
                <SettingsToggleItem label="Vibrate" enabled={vibrate} setEnabled={setVibrate} icon={<VibrateIcon />} />
            </div>
        </SettingsLayout>
    );
};

export default NotificationSettingsScreen;