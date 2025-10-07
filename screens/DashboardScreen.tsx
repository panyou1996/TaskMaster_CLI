
import React from 'react';
import { Link } from 'react-router-dom';

const CogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);


const DashboardScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col bg-gray-50 text-gray-900">
      <header className="flex-shrink-0 p-4 flex justify-between items-center border-b bg-white">
        <h1 className="text-xl font-bold text-gray-800">My Tasks</h1>
        <Link to="/settings" className="text-gray-600 hover:text-indigo-600">
          <CogIcon />
        </Link>
      </header>
      <main className="flex-grow p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-lg font-semibold text-gray-700">Welcome to TaskMaster!</h2>
        <p className="mt-2 text-gray-500">Your task list is currently empty.</p>
        <p className="mt-1 text-gray-500">Add a new task to get started.</p>
        <button className="mt-6 px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition">
            + Add Task
        </button>
      </main>
    </div>
  );
};

export default DashboardScreen;
