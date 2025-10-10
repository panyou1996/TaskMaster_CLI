
import React from 'react';
import OnboardingLayout from '../../components/layouts/OnboardingLayout';

const OnboardingSyncScreen: React.FC = () => {
  return (
    <OnboardingLayout
      imageSrc="https://i.ibb.co/RHY7sB1/Cloud-sync-pana.png"
      title="Offline & Sync"
      description="Work seamlessly offline. Your data automatically syncs across all devices when you're back online."
      currentStep={1}
      totalSteps={4}
      nextPath="/onboarding/organize"
    />
  );
};

export default OnboardingSyncScreen;