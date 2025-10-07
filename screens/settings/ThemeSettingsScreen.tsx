import React, { useEffect } from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import useLocalStorage from '../../hooks/useLocalStorage';

export type Theme = 'Light' | 'Dark' | 'System';

const ThemeOption: React.FC<{ theme: Theme; selected: boolean; onSelect: () => void; }> = ({ theme, selected, onSelect }) => {
    const themeVisuals = {
        Light: { bg: 'bg-white', text: 'text-gray-800', border: 'border-gray-300' },
        Dark: { bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-600' },
        System: { bg: 'bg-gradient-to-br from-white to-gray-800', text: 'text-gray-800', border: 'border-gray-400' },
    };
    const visual = themeVisuals[theme];
    
    return (
        <div 
            onClick={onSelect} 
            className={`cursor-pointer rounded-lg p-4 border-2 transition-all ${selected ? 'border-indigo-600' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}
        >
            <div className={`w-full h-24 rounded-md flex flex-col p-2 justify-between ${visual.bg} ${visual.border} border`}>
                <div className={`w-3/4 h-2 rounded-sm ${selected ? 'bg-indigo-400' : 'bg-gray-400'}`}></div>
                <div className={`w-1/2 h-2 rounded-sm ${selected ? 'bg-indigo-300' : 'bg-gray-300'}`}></div>
            </div>
            <p className={`mt-3 text-center font-medium ${selected ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-300'}`}>{theme} Mode</p>
        </div>
    );
};

const ThemeSettingsScreen: React.FC = () => {
    const [theme, setTheme] = useLocalStorage<Theme>('app-theme', 'System');

    useEffect(() => {
        const root = window.document.documentElement;
        const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (theme === 'Dark' || (theme === 'System' && isSystemDark)) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            if (theme === 'System') {
                root.classList.toggle('dark', e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);


    return (
        <SettingsLayout title="App Theme">
            <div className="grid grid-cols-3 gap-4">
                <ThemeOption theme="Light" selected={theme === 'Light'} onSelect={() => setTheme('Light')} />
                <ThemeOption theme="Dark" selected={theme === 'Dark'} onSelect={() => setTheme('Dark')} />
                <ThemeOption theme="System" selected={theme === 'System'} onSelect={() => setTheme('System')} />
            </div>
            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                Selecting 'System' will automatically switch the theme based on your device's settings.
            </p>
        </SettingsLayout>
    );
};

export default ThemeSettingsScreen;