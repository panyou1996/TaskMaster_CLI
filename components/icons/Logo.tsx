
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-12 w-12" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 12L11 14L15 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M20.625 10.375C21.3662 11.2386 21.75 12.3606 21.75 13.5C21.75 16.2614 19.5114 18.5 16.75 18.5H7.25C4.48858 18.5 2.25 16.2614 2.25 13.5C2.25 10.902 4.19522 8.79909 6.75 8.53125C7.03125 5.76983 9.51142 3.5 12.5 3.5C14.9438 3.5 17.0625 5.03125 17.8438 7.0625"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default Logo;
