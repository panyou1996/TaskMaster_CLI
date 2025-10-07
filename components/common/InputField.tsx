
import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, id, type = 'text', ...props }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className="w-full px-4 py-2.5 border border-[var(--color-border)] rounded-[var(--border-radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent transition text-sm"
        {...props}
      />
    </div>
  );
};

export default InputField;