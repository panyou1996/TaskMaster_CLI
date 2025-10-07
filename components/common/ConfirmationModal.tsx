import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'destructive';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'destructive',
}) => {
  if (!isOpen) return null;

  const confirmButtonClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    destructive: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center transition-all duration-300"
      aria-labelledby="confirmation-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-300 animate-page-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm p-6 mx-4 bg-white rounded-2xl modal-shadow transform transition-all duration-300 animate-card-fade-in">
        <h2 id="confirmation-title" className="text-xl font-bold text-gray-900 text-center">
          {title}
        </h2>
        <p className="mt-2 text-gray-600 text-center text-sm">{message}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`w-full px-4 py-3 font-semibold text-white rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClasses[confirmVariant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;