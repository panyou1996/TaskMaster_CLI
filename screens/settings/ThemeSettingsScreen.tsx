import React from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import { useData } from '../../contexts/DataContext';
import { triggerHapticSelection } from '../../utils/permissions';

export type Theme = 'Light' | 'Dark' | 'System';
export type FontSize = 'sm' | 'md' | 'lg' | 'xl';

const ThemeOption: React.FC<{ theme: Theme; selected: boolean; onSelect: () => void; }> = ({ theme, selected, onSelect }) => {
    const themeVisuals = {
        Light: { bg: 'bg-white', text: 'text-gray-800', border: 'border-gray-300' },
        Dark: { bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-600' },
        System: { bg: 'bg-gradient-to-br from-white to-gray-800', text: 'text-gray-800', border: 'border-gray-400' },
    };
    const visual = themeVisuals[theme];
    
    return (
        <div 
            onClick={() => { triggerHapticSelection(); onSelect(); }} 
            className={`cursor-pointer rounded-lg p-4 border-2 transition-all ${selected ? 'border-[var(--color-primary-500)]' : 'border-[var(--color-border)] hover:opacity-80'}`}
        >
            <div className={`w-full h-24 rounded-md flex flex-col p-2 justify-between ${visual.bg} ${visual.border} border`}>
                <div className={`w-3/4 h-2 rounded-sm ${selected ? 'bg-[var(--color-primary-500)]' : 'bg-gray-400'}`}></div>
                <div className={`w-1/2 h-2 rounded-sm ${selected ? 'bg-[var(--color-primary-200)]' : 'bg-gray-300'}`}></div>
            </div>
            <p className={`mt-3 text-center font-medium ${selected ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-secondary)]'}`}>{theme} Mode</p>
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
      onClick={() => { triggerHapticSelection(); onSelect(); }}
      className={`cursor-pointer rounded-lg p-3 border-2 flex flex-col items-center justify-center transition-all h-24 ${selected ? 'border-[var(--color-primary-500)] bg-primary-100 dark:bg-primary-900/20' : 'border-[var(--color-border)] hover:opacity-80'}`}
    >
      <div className={`font-semibold ${sizeClasses[size]}`}>Aa</div>
      <p className={`mt-2 text-center text-xs font-medium ${selected ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-secondary)]'}`}>{label}</p>
    </div>
  );
};


const ThemeSettingsScreen: React.FC = () => {
    const { theme, setTheme, fontSize, setFontSize } = useData();

    return (
        <SettingsLayout title="App Theme">
            <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 text-center">Appearance</h3>
                <div className="grid grid-cols-3 gap-4">
                    <ThemeOption theme="Light" selected={theme === 'Light'} onSelect={() => setTheme('Light')} />
                    <ThemeOption theme="Dark" selected={theme === 'Dark'} onSelect={() => setTheme('Dark')} />
                    <ThemeOption theme="System" selected={theme === 'System'} onSelect={() => setTheme('System')} />
                </div>
                <p className="mt-6 text-sm text-[var(--color-text-secondary)] text-center">
                    Selecting 'System' will automatically switch the theme based on your device's settings.
                </p>
            </div>
            
            <div className="mt-10">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 text-center">Font Size</h3>
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
