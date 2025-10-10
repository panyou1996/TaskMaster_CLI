
import React from 'react';
import OnboardingLayout from '../../components/layouts/OnboardingLayout';

const OnboardingOrganizeScreen: React.FC = () => {
  return (
    <OnboardingLayout
      imageSrc="https://i.ibb.co/wJtW7pW/Checklist-pana.png"
      title="Intuitive Organization"
      description="Manage tasks effortlessly with timeline views and simple list organization. Focus on what matters."
      currentStep={2}
      totalSteps={4}
      nextPath="/onboarding/journal"
    />
  );
};

export default OnboardingOrganizeScreen;