import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'social';
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, ...props }) => {
  const baseStyles = "w-full flex justify-center items-center gap-2 rounded-[var(--border-radius-md)] px-4 py-2.5 font-[var(--font-weight-medium)] text-sm transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variantStyles = {
    primary: 'bg-[var(--color-primary-500)] text-[var(--color-on-primary)] hover:opacity-90 focus:ring-[var(--color-primary-500)]',
    secondary: 'bg-[var(--color-surface-container-low)] text-[var(--color-text-secondary)] hover:bg-gray-300 focus:ring-gray-400',
    social: 'bg-[var(--color-surface-container)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-gray-100 focus:ring-gray-300',
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;