import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../../components/icons/Logo';
import Button from '../../components/common/Button';

const OnboardingWelcomeScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-8 bg-gray-50 text-gray-900 text-center">
      <div />
      <div>
        <div className="flex justify-center mb-6 text-indigo-600">
          <Logo className="h-20 w-20" />
        </div>
        <h1 className="text-4xl font-bold text-gray-800">TaskMaster</h1>
        <p className="mt-4 text-base text-gray-700 max-w-xs">
          Organize your life, one task at a time.
        </p>
        <img src="https://picsum.photos/seed/welcome/400/300" alt="Welcome illustration" className="w-full max-w-xs mx-auto rounded-lg mt-10" />
      </div>
      <div className="w-full">
        <Link to="/onboarding/sync">
          <Button variant="primary">Get Started</Button>
        </Link>
      </div>
    </div>
  );
};

export default OnboardingWelcomeScreen;