import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../icons/Logo';

interface OnboardingLayoutProps {
  imageSrc: string;
  title: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  nextPath: string;
  children?: React.ReactNode;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  imageSrc,
  title,
  description,
  currentStep,
  totalSteps,
  nextPath,
  children
}) => {
  const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="h-full w-full flex flex-col bg-[var(--color-background-primary)] text-[var(--color-text-primary)]">
      <div
        className="flex-shrink-0 px-6 pb-6 flex justify-between items-center"
        style={{ paddingTop: `calc(1.5rem + var(--status-bar-height, env(safe-area-inset-top)))` }}
      >
        <div className="text-[var(--color-primary-500)]">
          <Logo className="h-8 w-8" />
        </div>
        <Link to="/login" className="font-semibold text-[var(--color-primary-500)] hover:opacity-80 text-sm">
          Skip
        </Link>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center -mt-12">
        <img src={imageSrc} alt="Onboarding illustration" className="w-64 h-64 object-contain rounded-lg mb-8" />
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{title}</h1>
        <p className="mt-2 text-base text-[var(--color-text-secondary)] max-w-xs">{description}</p>
      </div>
      
      <div className="flex-shrink-0 p-8">
        {children ? (
          children
        ) : (
          <>
            <div className="flex justify-center items-center gap-2 mb-6">
              {dots.map(step => (
                <div
                  key={step}
                  className={`h-2 rounded-full transition-all duration-300 ${step === currentStep ? 'w-6 bg-[var(--color-primary-500)]' : 'w-2 bg-[var(--color-border)]'}`}
                />
              ))}
            </div>
            <Link to={nextPath} className="w-full flex justify-center items-center gap-2 rounded-[var(--border-radius-md)] px-4 py-3 font-medium text-base transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 bg-[var(--color-primary-500)] text-[var(--color-on-primary)] hover:opacity-90 focus:ring-[var(--color-primary-500)]">
              Continue
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingLayout;
