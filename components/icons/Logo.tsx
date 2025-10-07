
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-12 w-12" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default Logo;