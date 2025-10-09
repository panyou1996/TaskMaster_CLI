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
    className="flex justify-between items-center p-4 cursor-pointer rounded-lg hover:bg-[var(--color-surface-container-low)] transition-colors"
    role="switch"
    aria-checked={enabled}
    aria-label={label}
  >
    <div className="flex items-center gap-4">
        {icon && <div className="w-7 h-7 flex items-center justify-center bg-[var(--color-surface-container-low)] rounded-lg text-[var(--color-text-secondary)]">{icon}</div>}
        <div>
            <span className="font-medium text-[var(--color-text-primary)]">{label}</span>
            {description && <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">{description}</p>}
        </div>
    </div>
    <button
        aria-hidden="true"
        className={`relative inline-flex items-center h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-[var(--color-border)]'}`}
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
            <div className="bg-[var(--color-surface-container)] p-2 rounded-lg card-shadow divide-y divide-[var(--color-border)]">
                <SettingsToggleItem label="Task Reminders" enabled={taskReminders} setEnabled={handleTaskRemindersToggle} description="Get notified before a task is due." />
                <SettingsToggleItem label="Daily Summary" enabled={dailySummary} setEnabled={setDailySummary} description="Receive a summary of your tasks for the day."/>
                <SettingsToggleItem label="App Updates" enabled={appUpdates} setEnabled={setAppUpdates} description="Stay informed about new features and updates."/>
            </div>
             <div className="bg-[var(--color-surface-container)] p-2 rounded-lg card-shadow mt-6 divide-y divide-[var(--color-border)]">
                <SettingsToggleItem label="Sound" enabled={sound} setEnabled={setSound} icon={<SoundOnIcon />} />
                <SettingsToggleItem label="Vibrate" enabled={vibrate} setEnabled={setVibrate} icon={<VibrateIcon />} />
            </div>
        </SettingsLayout>
    );
};

export default NotificationSettingsScreen;