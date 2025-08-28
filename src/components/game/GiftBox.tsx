'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface GiftBoxProps {
  style: React.CSSProperties;
  cardType?: string;
  onTap: () => void;
  onReveal: (cardType: string) => void;
}

const CARD_EFFECTS = {
  'time-freeze': { color: 'text-electric-cyan', name: 'Time Freeze' },
  'slow-motion': { color: 'text-purple-accent', name: 'Slow Motion' },
  'golden-monad': { color: 'text-yellow-400', name: 'Golden Monad' },
  'extra-time': { color: 'text-success-lime', name: 'Extra Time' },
  'logo-highlight': { color: 'text-electric-cyan', name: 'Logo Highlight' },
  'bomb-trap': { color: 'text-danger', name: 'Bomb Trap' },
  'shrink-ray': { color: 'text-purple-accent', name: 'Shrink Ray' },
  'monad-swarm': { color: 'text-success-lime', name: 'Monad Swarm' },
  'glitch-purge': { color: 'text-electric-cyan', name: 'Glitch Purge' },
} as const;

export function GiftBox({ style, cardType, onTap, onReveal }: GiftBoxProps) {
  const [isRevealed, setIsRevealed] = React.useState(false);
  const [isClicked, setIsClicked] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRevealed) return;
    
    setIsClicked(true);
    setIsRevealed(true);
    onTap();
    
    if (cardType) {
      onReveal(cardType);
    }
    
    // Reset click state after animation
    setTimeout(() => setIsClicked(false), 1000);
  };

  const cardEffect = cardType ? CARD_EFFECTS[cardType as keyof typeof CARD_EFFECTS] : null;

  return (
    <motion.div
      style={style}
      className="cursor-pointer select-none rounded-full overflow-hidden"
      onClick={handleClick}
      whileHover={!isRevealed ? { scale: 1.1, rotateY: 15 } : {}}
      whileTap={!isRevealed ? { scale: 0.95 } : {}}
    >
      {/* Mystery box state */}
      {!isRevealed && (
        <motion.div
          className="relative w-full h-full"
          animate={{
            rotateY: [0, 5, -5, 0],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Magical aura */}
          <motion.div
            className="absolute inset-0 bg-purple-accent rounded-full opacity-30 blur-sm"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Gift box image using actual SVG */}
          <div className="relative w-full h-full rounded-full overflow-hidden">
            <Image
              src="/assets/GiftBox.svg"
              alt="Gift Box"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Sparkles */}
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-accent rounded-full"
              style={{
                left: `${20 + i * 20}%`,
                top: `${10 + (i % 2) * 80}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Question mark overlay */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center text-soft-white text-2xl font-bold font-futuristic"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            ?
          </motion.div>
        </motion.div>
      )}

      {/* Revealed card state */}
      {isRevealed && cardEffect && (
        <motion.div
          className="relative w-full h-full flex flex-col items-center justify-center bg-glass border border-purple-accent/30 rounded-lg backdrop-blur-sm"
          initial={{ scale: 0, rotateY: 180 }}
          animate={{ 
            scale: 1, 
            rotateY: 0,
            boxShadow: [
              '0 0 0px rgba(122, 95, 255, 0)',
              '0 0 20px rgba(122, 95, 255, 0.5)',
              '0 0 0px rgba(122, 95, 255, 0)',
            ],
          }}
          transition={{ 
            duration: 0.6, 
            ease: 'backOut',
            boxShadow: { duration: 2, repeat: Infinity },
          }}
        >
          {/* Card name */}
          <div className={`text-xs font-futuristic font-bold text-center ${cardEffect.color}`}>
            {cardEffect.name}
          </div>

          {/* Activation effect */}
          {isClicked && (
            <motion.div
              className="absolute inset-0 bg-purple-accent rounded-lg"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 0.8, 0], 
                scale: [0, 1.5, 2],
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}
        </motion.div>
      )}

      {/* Reveal particles */}
      {isRevealed && isClicked && (
        <>
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-accent rounded-full"
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
                x: [0, (Math.cos(i * 30 * Math.PI / 180) * 60)],
                y: [0, (Math.sin(i * 30 * Math.PI / 180) * 60)],
              }}
              transition={{
                duration: 0.8,
                ease: 'easeOut',
              }}
            />
          ))}
        </>
      )}

      {/* Magic card popup */}
      {isRevealed && cardEffect && (
        <motion.div
          className={`absolute -top-10 left-1/2 transform -translate-x-1/2 font-futuristic font-bold text-sm pointer-events-none ${cardEffect.color}`}
          initial={{ opacity: 0, y: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 1, 0], 
            y: [0, -10, -15, -25], 
            scale: [0, 1.2, 1, 1] 
          }}
          transition={{ duration: 2, ease: 'easeOut' }}
        >
          {cardEffect.name.toUpperCase()}
        </motion.div>
      )}
    </motion.div>
  );
}