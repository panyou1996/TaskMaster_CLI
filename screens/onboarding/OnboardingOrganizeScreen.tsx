
import React from 'react';
import OnboardingLayout from '../../components/layouts/OnboardingLayout';

const OnboardingOrganizeScreen: React.FC = () => {
  return (
    <OnboardingLayout
      imageSrc="https://picsum.photos/seed/organize/300/300"
      title="Intuitive Organization"
      description="Manage tasks effortlessly with timeline views and simple list organization. Focus on what matters."
      currentStep={2}
      totalSteps={4}
      nextPath="/onboarding/journal"
    />
  );
};

export default OnboardingOrganizeScreen;
