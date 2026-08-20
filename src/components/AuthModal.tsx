/**
 * Kirpi Task & Team Hub - NexaVerse Auth Modal Wrapper
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { AuthView } from './AuthView';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md font-sans overflow-y-auto">
      <div className="relative w-full max-w-4xl my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer border border-zinc-700"
          title="Kapat"
        >
          <X className="w-5 h-5" />
        </button>
        <AuthView onSuccess={onClose} isModal={true} />
      </div>
    </div>,
    document.body
  );
};
