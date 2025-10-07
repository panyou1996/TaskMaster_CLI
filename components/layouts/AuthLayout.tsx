import React from 'react';
import Logo from '../icons/Logo';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children }) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 text-[var(--color-text-primary)]">
      <div className="w-full max-w-md bg-[var(--color-surface-container)] p-6 rounded-2xl card-shadow">
        <div className="text-center">
          <div className="flex justify-center mb-4 text-[var(--color-primary-500)]">
            <Logo className="h-12 w-12" />
          </div>
          <h1 className="text-3xl font-bold">TaskMaster</h1>
          <h2 className="text-2xl font-bold mt-6 text-[var(--color-text-primary)]">{title}</h2>
        </div>
        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;