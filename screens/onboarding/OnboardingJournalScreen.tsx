
import React from 'react';
import OnboardingLayout from '../../components/layouts/OnboardingLayout';

const OnboardingJournalScreen: React.FC = () => {
  return (
    <OnboardingLayout
      imageSrc="https://i.ibb.co/L8T7WnS/Journaling-pana.png"
      title="Moments Journal"
      description="Capture your thoughts and memories. Our journaling feature helps you keep a visual log of your personal journey."
      currentStep={3}
      totalSteps={4}
      nextPath="/onboarding/permissions"
    />
  );
};

export default OnboardingJournalScreen;