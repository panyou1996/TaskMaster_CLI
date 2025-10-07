import React from 'react';

interface GrowingPlantProps {
  plantType: string | null;
  isGrown: boolean;
  className?: string;
}

const GrowingPlant: React.FC<GrowingPlantProps> = ({ plantType, isGrown, className }) => {
  if (!plantType) return null;

  const symbolId = `#plant-${plantType}-${isGrown ? 'grown' : 'seed'}`;

  return (
    <div className={className}>
      <svg 
        className={`w-full h-full object-contain ${isGrown ? 'animate-plant-grow' : ''}`}
        aria-label={isGrown ? `A grown ${plantType}` : `A ${plantType} seedling`}
      >
        <use href={symbolId} />
      </svg>
    </div>
  );
};

export default GrowingPlant;