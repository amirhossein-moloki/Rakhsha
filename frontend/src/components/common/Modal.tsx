import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="p-6 bg-black rounded-lg shadow-lg text-white border border-royal-red">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-300 hover:text-white">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
