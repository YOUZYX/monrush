'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface GlitchProps {
  style: React.CSSProperties;
  onTap: () => void;
}

export function Glitch({ style, onTap }: GlitchProps) {
  const [isClicked, setIsClicked] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(true);
    onTap();
    
    // Reset click state after animation
    setTimeout(() => setIsClicked(false), 500);
  };

  return (
    <motion.div
      style={style}
      className="cursor-pointer select-none rounded-full overflow-hidden"
      onClick={handleClick}
      animate={{
        x: isClicked ? [0, -2, 2, -1, 1, 0] : [0, -1, 1, 0],
        y: isClicked ? [0, 1, -1, 2, -2, 0] : [0, 0.5, -0.5, 0],
        filter: isClicked 
          ? ['hue-rotate(0deg)', 'hue-rotate(180deg)', 'hue-rotate(0deg)']
          : ['hue-rotate(0deg)', 'hue-rotate(20deg)', 'hue-rotate(0deg)'],
      }}
      transition={{
        duration: isClicked ? 0.5 : 2,
        repeat: isClicked ? 0 : Infinity,
        ease: 'easeInOut',
      }}
      whileHover={{ 
        scale: 1.1,
        filter: 'hue-rotate(45deg) saturate(1.5)',
      }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Danger aura */}
      <motion.div
        className="absolute inset-0 bg-danger rounded-full opacity-20 blur-sm"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* Main glitch image using actual SVG */}
      <motion.div
        className="relative w-full h-full rounded-full overflow-hidden"
        animate={{
          opacity: isClicked ? [1, 0.3, 1, 0.3, 1] : 1,
        }}
        transition={{
          duration: isClicked ? 0.3 : 0,
        }}
      >
        <Image
          src="/assets/Glitch.svg"
          alt="Glitch"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      {/* Glitch effect overlay */}
      <motion.div
        className="absolute inset-0 bg-danger opacity-0 mix-blend-multiply"
        animate={{
          opacity: isClicked ? [0, 0.8, 0, 0.5, 0] : [0, 0.1, 0],
        }}
        transition={{
          duration: isClicked ? 0.5 : 3,
          repeat: isClicked ? 0 : Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Shatter effect when clicked */}
      {isClicked && (
        <>
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 bg-danger"
              style={{
                left: '50%',
                top: '50%',
                clipPath: 'polygon(0% 0%, 100% 25%, 75% 100%, 25% 75%)',
              }}
              initial={{
                scale: 0,
                x: 0,
                y: 0,
                rotate: 0,
              }}
              animate={{
                scale: [0, 1, 0],
                x: [0, (Math.cos(i * 45 * Math.PI / 180) * 50)],
                y: [0, (Math.sin(i * 45 * Math.PI / 180) * 50)],
                rotate: [0, 360],
              }}
              transition={{
                duration: 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Life lost popup */}
      {isClicked && (
        <motion.div
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-danger font-futuristic font-bold text-lg pointer-events-none"
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            y: [0, -20, -40], 
            scale: [0, 1.2, 1] 
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          -1 LIFE
        </motion.div>
      )}

      {/* Static noise effect */}
      <motion.div
        className="absolute inset-0 opacity-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
        }}
        animate={{
          opacity: isClicked ? [0, 0.6, 0, 0.3, 0] : 0,
        }}
        transition={{
          duration: isClicked ? 0.5 : 0,
        }}
      />
    </motion.div>
  );
}