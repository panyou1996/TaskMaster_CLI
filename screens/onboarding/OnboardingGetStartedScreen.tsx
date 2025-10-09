

import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';

const OnboardingGetStartedScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-between p-8 bg-[var(--color-background-primary)] text-[var(--color-text-primary)] text-center">
      <div/>
      <div className="w-full">
        <img src="https://picsum.photos/seed/start/400/300" alt="Get started illustration" className="w-full max-w-xs mx-auto rounded-lg mb-10" />
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">You're All Set!</h1>
        <p className="mt-4 text-[var(--color-text-secondary)] max-w-xs mx-auto">
          Start mastering your tasks and organizing your life today.
        </p>
      </div>
      <div className="w-full space-y-4">
        <Link to="/login">
            <Button variant="primary">Log In</Button>
        </Link>
        <Link to="/signup">
            <Button variant="secondary">Sign Up</Button>
        </Link>
      </div>
    </div>
  );
};

export default OnboardingGetStartedScreen;