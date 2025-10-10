import React from 'react';
import SettingsLayout from '../../components/layouts/SettingsLayout';
import { useData, AppIconName } from '../../contexts/DataContext';
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

const AppIconOption: React.FC<{
  iconName: AppIconName;
  svg: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ iconName, svg, selected, onSelect }) => {
  return (
    <div onClick={() => { triggerHapticSelection(); onSelect(); }} className="cursor-pointer">
      <div className={`w-full aspect-square rounded-2xl flex items-center justify-center p-2 transition-all ${selected ? 'border-2 border-[var(--color-primary-500)] bg-primary-100 dark:bg-primary-900/20' : 'bg-[var(--color-surface-container-low)]'}`}>
        <img src={svg} alt={`${iconName} app icon`} className="w-12 h-12" />
      </div>
      <p className={`mt-2 text-center text-xs font-medium capitalize ${selected ? 'text-[var(--color-primary-500)]' : 'text-[var(--color-text-secondary)]'}`}>{iconName}</p>
    </div>
  );
};


const ThemeSettingsScreen: React.FC = () => {
    const { theme, setTheme, fontSize, setFontSize, appIcon, setAppIcon } = useData();
    
    const appIcons: Record<AppIconName, string> = {
        default: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%236D55A6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
        violet: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%238B5CF6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
        dusk: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%23F472B6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`,
        leaf: `data:image/svg+xml,<svg viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg' stroke='%2310B981' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><path d='M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9' /><path d='m9 12 2 2 4-4' /></svg>`
    };

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

            <div className="mt-10">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 text-center">App Icon</h3>
                <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
                    {Object.entries(appIcons).map(([name, svg]) => (
                        <AppIconOption
                            key={name}
                            iconName={name as AppIconName}
                            svg={svg}
                            selected={appIcon === name}
                            onSelect={() => setAppIcon(name as AppIconName)}
                        />
                    ))}
                </div>
            </div>
        </SettingsLayout>
    );
};

export default ThemeSettingsScreen;