
import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
);

interface SettingsLayoutProps {
  title: string;
  children: React.ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ title, children }) => {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col bg-[var(--color-background-primary)]">
      <header
        className="flex-shrink-0 p-4 flex items-center border-b border-[var(--color-border)] bg-[var(--color-surface-container)] sticky top-0"
        style={{ paddingTop: `calc(1rem + var(--status-bar-height, env(safe-area-inset-top)))` }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary-500)]">
          <BackIcon />
        </button>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] ml-2">{title}</h1>
      </header>
      <main className="flex-grow overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
};

export default SettingsLayout;
