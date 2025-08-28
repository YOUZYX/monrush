'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          border: 'border-success-lime/50',
          bg: 'bg-success-lime/10',
          text: 'text-success-lime',
          shadow: 'shadow-neon-lime',
          icon: '✅',
        };
      case 'warning':
        return {
          border: 'border-yellow-500/50',
          bg: 'bg-yellow-500/10',
          text: 'text-yellow-400',
          shadow: 'shadow-yellow-500/30',
          icon: '⚠️',
        };
      case 'error':
        return {
          border: 'border-danger/50',
          bg: 'bg-danger/10',
          text: 'text-danger',
          shadow: 'shadow-neon-danger',
          icon: '❌',
        };
      default:
        return {
          border: 'border-electric-cyan/50',
          bg: 'bg-electric-cyan/10',
          text: 'text-electric-cyan',
          shadow: 'shadow-neon-cyan',
          icon: 'ℹ️',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <AnimatePresence>
      <motion.div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30"
        initial={{ scale: 0, opacity: 0, rotateX: -90 }}
        animate={{ 
          scale: 1, 
          opacity: 1, 
          rotateX: 0,
          y: [-10, 0, -5, 0],
        }}
        exit={{ 
          scale: 0, 
          opacity: 0, 
          rotateX: 90,
        }}
        transition={{ 
          duration: 0.5,
          ease: 'backOut',
          y: { duration: 0.8, ease: 'easeOut' },
        }}
      >
        <motion.div
          className={`
            bg-glass ${styles.bg} ${styles.border} ${styles.shadow}
            border backdrop-blur-md rounded-xl px-6 py-4 
            font-futuristic font-bold text-center min-w-[200px]
            pointer-events-auto
          `}
          animate={{
            boxShadow: [
              `0 0 0px ${styles.shadow.includes('cyan') ? 'rgba(40, 225, 255, 0)' : 
                         styles.shadow.includes('lime') ? 'rgba(138, 255, 122, 0)' : 
                         styles.shadow.includes('danger') ? 'rgba(255, 91, 91, 0)' : 
                         'rgba(255, 255, 0, 0)'}`,
              `0 0 20px ${styles.shadow.includes('cyan') ? 'rgba(40, 225, 255, 0.5)' : 
                          styles.shadow.includes('lime') ? 'rgba(138, 255, 122, 0.5)' : 
                          styles.shadow.includes('danger') ? 'rgba(255, 91, 91, 0.5)' : 
                          'rgba(255, 255, 0, 0.5)'}`,
              `0 0 0px ${styles.shadow.includes('cyan') ? 'rgba(40, 225, 255, 0)' : 
                         styles.shadow.includes('lime') ? 'rgba(138, 255, 122, 0)' : 
                         styles.shadow.includes('danger') ? 'rgba(255, 91, 91, 0)' : 
                         'rgba(255, 255, 0, 0)'}`,
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Icon */}
          <motion.div
            className="text-2xl mb-2"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 0.6,
              ease: 'easeInOut',
            }}
          >
            {styles.icon}
          </motion.div>

          {/* Message */}
          <motion.div
            className={`${styles.text} text-sm leading-tight`}
            animate={{
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {message}
          </motion.div>

          {/* Progress bar */}
          <div className="mt-3 w-full h-1 bg-charcoal/30 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${styles.text.replace('text-', 'bg-')} rounded-full`}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 3, ease: 'linear' }}
            />
          </div>

          {/* Close button */}
          <motion.button
            onClick={onClose}
            className={`absolute -top-2 -right-2 w-6 h-6 ${styles.bg} ${styles.border} border rounded-full flex items-center justify-center text-xs ${styles.text} hover:scale-110 transition-transform`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ×
          </motion.button>

          {/* Sparkle effects for success */}
          {type === 'success' && (
            <>
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-success-lime rounded-full"
                  style={{
                    left: `${20 + i * 12}%`,
                    top: `${10 + (i % 2) * 80}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </>
          )}

          {/* Error shake effect */}
          {type === 'error' && (
            <motion.div
              className="absolute inset-0"
              animate={{
                x: [0, -2, 2, -2, 2, 0],
              }}
              transition={{
                duration: 0.5,
                repeat: 2,
                ease: 'easeInOut',
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
