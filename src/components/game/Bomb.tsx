'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface BombProps {
  style: React.CSSProperties;
  onTap: () => void;
}

export function Bomb({ style, onTap }: BombProps) {
  const [isClicked, setIsClicked] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(true);
    onTap();
    
    // Reset click state after animation
    setTimeout(() => setIsClicked(false), 600);
  };

  return (
    <motion.div
      style={style}
      className="cursor-pointer select-none rounded-full overflow-hidden"
      onClick={handleClick}
      animate={{
        scale: isClicked ? [1, 1.2, 0] : [1, 1.05, 1],
        rotate: isClicked ? [0, 180, 360] : [0, 5, -5, 0],
      }}
      transition={{
        duration: isClicked ? 0.6 : 2,
        repeat: isClicked ? 0 : Infinity,
        ease: isClicked ? 'easeOut' : 'easeInOut',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Danger aura */}
      <motion.div
        className="absolute inset-0 bg-danger rounded-full opacity-30 blur-md"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Bomb SVG using actual asset */}
      <motion.div
        className="relative w-full h-full rounded-full"
        animate={{
          filter: isClicked 
            ? ['brightness(1) saturate(1)', 'brightness(2) saturate(2)', 'brightness(1) saturate(1)']
            : ['brightness(1) saturate(1)', 'brightness(1.2) saturate(1.3)', 'brightness(1) saturate(1)'],
        }}
        transition={{
          duration: isClicked ? 0.6 : 1.5,
          repeat: isClicked ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      >
        <Image
          src="/assets/bomb.svg"
          alt="Bomb"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Explosion effect when clicked - ABOVE everything */}
      {isClicked && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
          {/* Main explosion flash */}
          <motion.div
            className="absolute bg-white rounded-full"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200%',
              height: '200%',
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0.8, 0],
              scale: [0, 2, 4, 8],
            }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />

          {/* Explosion rings */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`ring-${i}`}
              className="absolute border-4 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${150 + i * 50}%`,
                height: `${150 + i * 50}%`,
                borderColor: i % 2 === 0 ? '#ff5b5b' : '#ffaa00',
              }}
              initial={{
                scale: 0,
                opacity: 1,
                borderWidth: 12 - i * 2,
              }}
              animate={{
                scale: [0, 1.2, 2.5, 4 + i * 0.5],
                opacity: [1, 0.8, 0.4, 0],
                borderWidth: [12 - i * 2, 6 - i, 0],
              }}
              transition={{
                duration: 1.0,
                delay: i * 0.05,
                ease: 'easeOut',
              }}
            />
          ))}
          
          {/* Fire particles */}
          {[...Array(16)].map((_, i) => (
            <motion.div
              key={`fire-${i}`}
              className="absolute w-6 h-6 rounded-full"
              style={{
                left: '50%',
                top: '50%',
                background: `linear-gradient(45deg, #ff5b5b, #ffaa00, #ff3333)`,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{
                scale: 0,
                x: 0,
                y: 0,
                opacity: 1,
              }}
              animate={{
                scale: [0, 1.5, 1, 0],
                x: [0, (Math.cos(i * 22.5 * Math.PI / 180) * 120)],
                y: [0, (Math.sin(i * 22.5 * Math.PI / 180) * 120)],
                opacity: [1, 0.9, 0.5, 0],
              }}
              transition={{
                duration: 1.0,
                delay: i * 0.02,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Debris particles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`debris-${i}`}
              className="absolute w-3 h-3 bg-gray-600 rounded-sm"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{
                scale: 0,
                x: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{
                scale: [0, 1.2, 0.8, 0],
                x: [0, (Math.cos(i * 18 * Math.PI / 180) * 150)],
                y: [0, (Math.sin(i * 18 * Math.PI / 180) * 150) + 30], // Add gravity effect
                rotate: [0, 360 * (i % 2 === 0 ? 1 : -1)],
              }}
              transition={{
                duration: 1.4,
                delay: i * 0.01,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Smoke effect */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`smoke-${i}`}
              className="absolute w-12 h-12 bg-gray-500 rounded-full opacity-60"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
              initial={{
                scale: 0,
                x: 0,
                y: 0,
                opacity: 0.6,
              }}
              animate={{
                scale: [0, 1.5 + i * 0.3, 3 + i * 0.4],
                x: [0, (Math.cos(i * 45 * Math.PI / 180) * 40)],
                y: [0, (Math.sin(i * 45 * Math.PI / 180) * 40) - 60], // Float upward
                opacity: [0.6, 0.4, 0],
              }}
              transition={{
                duration: 2.0,
                delay: 0.4 + i * 0.1,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}

      {/* Life lost popup */}
      {isClicked && (
        <motion.div
          className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-danger font-futuristic font-bold text-lg pointer-events-none"
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            y: [0, -10, -20, -30], 
            scale: [0, 1.3, 1, 1] 
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          -1 LIFE
        </motion.div>
      )}

      {/* Warning pulse */}
      <motion.div
        className="absolute inset-0 border-2 border-danger rounded-full opacity-0"
        animate={{
          opacity: [0, 1, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
