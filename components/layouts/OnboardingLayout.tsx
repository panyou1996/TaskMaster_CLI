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
    <div className="h-full w-full flex flex-col bg-gray-50 text-gray-900">
      <div className="flex-shrink-0 p-6 flex justify-between items-center">
        <div className="text-indigo-600">
          <Logo className="h-8 w-8" />
        </div>
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 text-sm">
          Skip
        </Link>
      </div>
      
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center -mt-12">
        <img src={imageSrc} alt="Onboarding illustration" className="w-64 h-64 object-cover rounded-lg mb-8" />
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-base text-gray-700 max-w-xs">{description}</p>
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
                  className={`h-2 rounded-full transition-all duration-300 ${step === currentStep ? 'w-6 bg-indigo-600' : 'w-2 bg-gray-300'}`}
                />
              ))}
            </div>
            <Link to={nextPath} className="w-full flex justify-center items-center gap-2 rounded-xl px-4 py-3 font-medium text-base transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500">
              Continue
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default OnboardingLayout;