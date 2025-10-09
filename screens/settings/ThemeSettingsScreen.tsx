
import React, { useEffect } from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import useLocalStorage from '../../hooks/useLocalStorage';

export type Theme = 'Light' | 'Dark' | 'System';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';

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
            className={`cursor-pointer rounded-lg p-4 border-2 transition-all ${selected ? 'border-[var(--color-primary-500)]' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}
        >
            <div className={`w-full h-24 rounded-md flex flex-col p-2 justify-between ${visual.bg} ${visual.border} border`}>
                <div className={`w-3/4 h-2 rounded-sm ${selected ? 'bg-[var(--color-primary-500)]' : 'bg-gray-400'}`}></div>
                <div className={`w-1/2 h-2 rounded-sm ${selected ? 'bg-[var(--color-primary-200)]' : 'bg-gray-300'}`}></div>
            </div>
            <p className={`mt-3 text-center font-medium ${selected ? 'text-[var(--color-primary-500)]' : 'text-gray-700 dark:text-gray-300'}`}>{theme} Mode</p>
        </div>
    );
};

const FontSizeOption: React.FC<{
  size: FontSize;
  label: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ size, label, selected, onSelect }) => {
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-lg p-3 border-2 flex flex-col items-center justify-center transition-all h-24 ${selected ? 'border-[var(--color-primary-500)] bg-primary-100 dark:bg-primary-900/20' : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}`}
    >
      <div className={`font-semibold ${sizeClasses[size]}`}>Aa</div>
      <p className={`mt-2 text-center text-xs font-medium ${selected ? 'text-[var(--color-primary-500)]' : 'text-gray-700 dark:text-gray-300'}`}>{label}</p>
    </div>
  );
};


const ThemeSettingsScreen: React.FC = () => {
    const [theme, setTheme] = useLocalStorage<Theme>('app-theme', 'System');
    const [fontSize, setFontSize] = useLocalStorage<FontSize>('app-font-size', 'lg');

    // Theme effect
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

    // Font size effect
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg', 'font-size-xl');
        root.classList.add(`font-size-${fontSize}`);
    }, [fontSize]);


    return (
        <SettingsLayout title="App Theme">
            <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Appearance</h3>
                <div className="grid grid-cols-3 gap-4">
                    <ThemeOption theme="Light" selected={theme === 'Light'} onSelect={() => setTheme('Light')} />
                    <ThemeOption theme="Dark" selected={theme === 'Dark'} onSelect={() => setTheme('Dark')} />
                    <ThemeOption theme="System" selected={theme === 'System'} onSelect={() => setTheme('System')} />
                </div>
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Selecting 'System' will automatically switch the theme based on your device's settings.
                </p>
            </div>
            
            <div className="mt-10">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">Font Size</h3>
                <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                    <FontSizeOption size="sm" label="Small" selected={fontSize === 'sm'} onSelect={() => setFontSize('sm')} />
                    <FontSizeOption size="md" label="Medium" selected={fontSize === 'md'} onSelect={() => setFontSize('md')} />
                    <FontSizeOption size="lg" label="Default" selected={fontSize === 'lg'} onSelect={() => setFontSize('lg')} />
                    <FontSizeOption size="xl" label="Large" selected={fontSize === 'xl'} onSelect={() => setFontSize('xl')} />
                </div>
            </div>
        </SettingsLayout>
    );
};

export default ThemeSettingsScreen;