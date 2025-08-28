'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface MonadLogoProps {
  style: React.CSSProperties;
  highlighted?: boolean;
  onTap: () => void;
}

export function MonadLogo({ style, highlighted = false, onTap }: MonadLogoProps) {
  const [isClicked, setIsClicked] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(true);
    onTap();
    
    // Reset click state after animation
    setTimeout(() => setIsClicked(false), 300);
  };

  return (
    <motion.div
      style={style}
      className={`cursor-pointer select-none ${
        highlighted ? 'animate-pulse-glow' : ''
      }`}
      onClick={handleClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      animate={{
        scale: isClicked ? [1, 1.3, 0] : 1,
        rotate: isClicked ? [0, 180, 360] : 0,
      }}
      transition={{
        duration: isClicked ? 0.3 : 0.2,
        ease: 'easeOut',
      }}
    >
      {/* Glow effect for highlighted logos */}
      {highlighted && (
        <motion.div
          className="absolute inset-0 bg-electric-cyan rounded-full opacity-30 blur-md"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      
      {/* Main logo using actual SVG */}
      <motion.div
        className="relative w-full h-full"
        animate={{
          filter: highlighted 
            ? ['brightness(1) saturate(1)', 'brightness(1.3) saturate(1.5)', 'brightness(1) saturate(1)']
            : 'brightness(1) saturate(1)',
        }}
        transition={{
          duration: highlighted ? 1 : 0,
          repeat: highlighted ? Infinity : 0,
          ease: 'easeInOut',
        }}
      >
        <Image
          src="/assets/Monad_logo_tap.svg"
          alt="Monad Logo"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Click effect particles */}
      {isClicked && (
        <>
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-electric-cyan rounded-full"
              style={{
                left: '50%',
                top: '50%',
              }}
              initial={{
                scale: 0,
                x: 0,
                y: 0,
              }}
              animate={{
                scale: [0, 1, 0],
                x: [0, (Math.cos(i * 60 * Math.PI / 180) * 40)],
                y: [0, (Math.sin(i * 60 * Math.PI / 180) * 40)],
              }}
              transition={{
                duration: 0.5,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Score popup */}
      {isClicked && (
        <motion.div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-electric-cyan font-futuristic font-bold text-lg pointer-events-none"
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            y: [0, -20, -40], 
            scale: [0, 1.2, 1] 
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          +10
        </motion.div>
      )}
    </motion.div>
  );
}