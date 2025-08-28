'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GameState } from '@/lib/game-logic';

interface HUDProps {
  gameState: GameState;
  isCountdown?: boolean;
  countdownTime?: number;
}

export function HUD({ gameState, isCountdown = false, countdownTime = 0 }: HUDProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeDisplay = () => {
    if (isCountdown) {
      const countdownSeconds = Math.ceil(countdownTime / 1000);
      return countdownSeconds <= 0 ? 'GO!' : countdownSeconds.toString();
    }
    return formatTime(gameState.timeLeft);
  };

  const getTimeColor = () => {
    if (isCountdown) return 'text-electric-cyan';
    if (gameState.timeLeft <= 10) return 'text-danger';
    if (gameState.timeLeft <= 30) return 'text-yellow-400';
    return 'text-electric-cyan';
  };

  const isLowLives = gameState.lives <= 2;
  const isLowTime = !isCountdown && gameState.timeLeft <= 20;

  return (
    <motion.div
      className="w-full bg-glass border-b border-purple-accent/30 backdrop-blur-sm p-4"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        {/* Score */}
        <motion.div
          className="flex flex-col items-center min-w-[80px]"
          whileHover={{ scale: 1.05 }}
          animate={{
            scale: gameState.score > 0 ? [1, 1.02, 1] : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-electric-cyan/60 font-futuristic mb-1">SCORE</div>
          <motion.div
            className="text-2xl font-futuristic font-bold text-electric-cyan"
            key={gameState.score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {gameState.score.toLocaleString()}
          </motion.div>
        </motion.div>

        {/* Streak */}
        <motion.div
          className="flex flex-col items-center min-w-[80px]"
          whileHover={{ scale: 1.05 }}
          animate={{
            scale: gameState.streak > 0 ? [1, 1.02, 1] : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-success-lime/60 font-futuristic mb-1">STREAK</div>
          <motion.div
            className="text-xl font-futuristic font-bold text-success-lime"
            key={gameState.streak}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {gameState.streak}
          </motion.div>
          {/* Streak progress to next combo level */}
          <div className="w-12 h-1 bg-charcoal/50 rounded-full overflow-hidden mt-1">
            <motion.div
              className="h-full bg-success-lime rounded-full"
              animate={{
                width: `${(gameState.streak % 5) * 20}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>

        {/* Combo */}
        <motion.div
          className="flex flex-col items-center min-w-[80px]"
          whileHover={{ scale: 1.05 }}
          animate={{
            scale: gameState.combo > 1 ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.2, repeat: gameState.combo > 1 ? Infinity : 0 }}
        >
          <div className="text-xs text-purple-accent/60 font-futuristic mb-1">COMBO</div>
          <motion.div
            className={`text-xl font-futuristic font-bold ${
              gameState.combo > 1 ? 'text-success-lime' : 'text-purple-accent'
            }`}
            key={gameState.combo}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {gameState.combo.toFixed(1)}x
          </motion.div>
        </motion.div>

        {/* Timer */}
        <motion.div
          className="flex flex-col items-center min-w-[100px]"
          whileHover={{ scale: 1.05 }}
          animate={{
            scale: isLowTime ? [1, 1.05, 1] : 1,
          }}
          transition={{ 
            duration: 0.5, 
            repeat: isLowTime ? Infinity : 0,
            repeatType: 'reverse',
          }}
        >
          <div className="text-xs text-electric-cyan/60 font-futuristic mb-1">
            {isCountdown ? 'STARTING' : 'TIME'}
          </div>
          <motion.div
            className={`text-2xl font-futuristic font-bold ${getTimeColor()}`}
            key={isCountdown ? countdownTime : Math.floor(gameState.timeLeft)}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {getTimeDisplay()}
          </motion.div>
          {!isCountdown && (
            <div className="w-20 h-1 bg-charcoal/50 rounded-full mt-1">
              <motion.div
                className={`h-full rounded-full transition-colors duration-300 ${
                  isLowTime ? 'bg-danger' : 'bg-electric-cyan'
                }`}
                animate={{ width: `${(gameState.timeLeft / 120) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}
        </motion.div>

        {/* Lives */}
        <motion.div
          className="flex flex-col items-center min-w-[80px]"
          whileHover={{ scale: 1.05 }}
          animate={{
            scale: isLowLives ? [1, 1.05, 1] : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-xs text-success-lime/60 font-futuristic mb-1">LIVES</div>
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                  i < gameState.lives
                    ? 'bg-success-lime border-success-lime shadow-neon-lime'
                    : 'bg-transparent border-charcoal'
                }`}
                initial={{ scale: 0 }}
                animate={{ 
                  scale: 1,
                }}
                transition={{ 
                  delay: i * 0.1, 
                  duration: 0.3,
                  ease: 'easeOut',
                }}
                whileHover={{ scale: 1.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Active effects bar */}
      {gameState.activeEffects.length > 0 && (
        <motion.div
          className="flex justify-center mt-3 pt-3 border-t border-purple-accent/20"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex space-x-2">
            {gameState.activeEffects.map((effect, i) => (
              <motion.div
                key={`${effect.type}-${i}`}
                className="bg-purple-accent/20 border border-purple-accent/40 rounded-lg px-3 py-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                layout
              >
                <div className="text-xs font-futuristic text-purple-accent text-center">
                  {effect.type.replace('-', ' ').toUpperCase()}
                </div>
                
                {/* Duration bar for timed effects */}
                {effect.duration > 0 && (
                  <div className="w-12 h-1 bg-charcoal/50 rounded-full overflow-hidden mt-1">
                    <motion.div
                      className="h-full bg-purple-accent rounded-full"
                      animate={{
                        width: `${(effect.duration / 5000) * 100}%`, // Assuming 5s max duration
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}