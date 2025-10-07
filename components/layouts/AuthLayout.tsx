import React from 'react';
import Logo from '../icons/Logo';

interface AuthLayoutProps {
  title: string;
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children }) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gray-50 text-gray-900">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl card-shadow">
        <div className="text-center">
          <div className="flex justify-center mb-4 text-indigo-600">
            <Logo className="h-16 w-16" />
          </div>
          <h1 className="text-4xl font-bold">TaskMaster</h1>
          <h2 className="text-3xl font-bold mt-8 text-gray-900">{title}</h2>
        </div>
        <div className="mt-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;