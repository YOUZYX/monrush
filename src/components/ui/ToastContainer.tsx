'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastMessage } from '@/hooks/useToast';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const getToastColors = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'bg-success-lime/90 border-success-lime/30 text-charcoal';
      case 'error':
        return 'bg-danger/90 border-danger/30 text-soft-white';
      case 'info':
        return 'bg-electric-cyan/90 border-electric-cyan/30 text-charcoal';
      default:
        return 'bg-success-lime/90 border-success-lime/30 text-charcoal';
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`px-4 py-3 border rounded-lg backdrop-blur-md shadow-lg pointer-events-auto ${getToastColors(toast.type)}`}
          >
            <div className="flex items-center justify-between space-x-3">
              <span className="font-futuristic text-sm">
                {toast.message}
              </span>
              <button
                onClick={() => onRemove(toast.id)}
                className="text-current opacity-60 hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
