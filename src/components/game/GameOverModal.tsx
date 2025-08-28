'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameSession } from '@/lib/game-state';
import { playSound } from '@/lib/audio-manager';

interface GameOverModalProps {
  isOpen: boolean;
  session: GameSession | null;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onShare?: () => void;
}

export function GameOverModal({ 
  isOpen, 
  session, 
  onPlayAgain, 
  onMainMenu, 
  onShare 
}: GameOverModalProps) {
  if (!session) return null;

  // Play game over sound when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🎵 Game over modal opened - playing game over sound');
      playSound.gameOver();
    }
  }, [isOpen]);

  const { gameState } = session;
  
  // Calculate statistics
  const totalTaps = session.actions?.length || 0;
  const logoTaps = session.actions?.filter(a => a.type === 'logo').length || 0;
  const glitchTaps = session.actions?.filter(a => a.type === 'glitch').length || 0;
  const bombTaps = session.actions?.filter(a => a.type === 'bomb').length || 0;
  const giftTaps = session.actions?.filter(a => a.type === 'gift').length || 0;
  const accuracy = totalTaps > 0 ? Math.round((logoTaps / totalTaps) * 100) : 0;

  // Twitter/X Share functionality
  const handleTwitterShare = () => {
    const gameUrl = "https://monrush.vercel.app";
    const performance = getPerformanceRating(gameState.score);
    
    // Create tweet text (max 200 chars)
    const tweetText = `🎮 Just scored ${gameState.score.toLocaleString()} in MonadRush! 🚀\n\n${performance.icon} ${performance.label}\n🔥 ${gameState.combo.toFixed(1)}x Max Combo\n⚡ ${gameState.streak} Longest Streak\n🎯 ${accuracy}% Accuracy\n\nCan you beat my score? ${gameUrl}`;
    
    // Encode for URL
    const encodedTweet = encodeURIComponent(tweetText);
    const twitterUrl = `https://x.com/intent/tweet?text=${encodedTweet}`;
    
    // Open in new Tab
    window.open(twitterUrl, '_blank');

  };
  
  // Game end reason
  const endReason = gameState.lives <= 0 ? 'Lives Depleted' : 'Time Up';
  const endReasonColor = gameState.lives <= 0 ? 'text-danger' : 'text-electric-cyan';
  
  // Performance rating
  const getPerformanceRating = (score: number) => {
    if (score >= 10000) return { label: 'LEGENDARY', color: 'text-yellow-400', icon: '👑' };
    if (score >= 7500) return { label: 'EXCELLENT', color: 'text-success-lime', icon: '🌟' };
    if (score >= 5000) return { label: 'GREAT', color: 'text-electric-cyan', icon: '⭐' };
    if (score >= 2500) return { label: 'GOOD', color: 'text-purple-accent', icon: '👍' };
    if (score >= 1000) return { label: 'FAIR', color: 'text-soft-white', icon: '✌️' };
    return { label: 'KEEP TRYING', color: 'text-danger', icon: '💪' };
  };
  
  const performance = getPerformanceRating(gameState.score);

  const stats = [
    { label: 'Final Score', value: gameState.score.toLocaleString(), color: 'text-electric-cyan', icon: '🎯' },
    { label: 'Best Combo', value: `${gameState.combo.toFixed(1)}x`, color: 'text-success-lime', icon: '🔥' },
    { label: 'Longest Streak', value: gameState.streak.toString(), color: 'text-purple-accent', icon: '⚡' },
    { label: 'Accuracy', value: `${accuracy}%`, color: accuracy >= 70 ? 'text-success-lime' : accuracy >= 50 ? 'text-electric-cyan' : 'text-danger', icon: '🎯' },
  ];

  const breakdown = [
    { label: 'Monad Logos Hit', value: logoTaps, color: 'text-electric-cyan' },
    { label: 'Glitches Hit', value: glitchTaps, color: 'text-danger' },
    { label: 'Bombs Hit', value: bombTaps, color: 'text-danger' },
    { label: 'Gift Boxes', value: giftTaps, color: 'text-purple-accent' },
    { label: 'Active Effects', value: gameState.activeEffects.length, color: 'text-success-lime' },
  ];

  function onLeaderboard(e: React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    // Navigate to leaderboard page
    if (typeof window !== 'undefined') {
      window.location.href = '/leaderboard';
    }
  }
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-glass border border-purple-accent/40 rounded-2xl p-8 w-full max-w-2xl backdrop-blur-lg shadow-2xl"
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 30,
              duration: 0.5 
            }}
          >
            {/* Header */}
            <motion.div
              className="text-center mb-8"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-4xl font-futuristic font-bold text-electric-cyan mb-2">
                GAME OVER
              </h1>
              <p className={`text-lg font-futuristic ${endReasonColor}`}>
                {endReason}
              </p>
            </motion.div>

            {/* Performance Rating */}
            <motion.div
              className="text-center mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
            >
              <div className={`text-6xl mb-2`}>
                {performance.icon}
              </div>
              <div className={`text-2xl font-futuristic font-bold ${performance.color}`}>
                {performance.label}
              </div>
            </motion.div>

            {/* Main Stats */}
            <motion.div
              className="grid grid-cols-2 gap-4 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="bg-charcoal/50 border border-purple-accent/20 rounded-lg p-4 text-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.1, type: 'spring', stiffness: 300 }}
                  whileHover={{ scale: 1.05, borderColor: 'rgba(122, 95, 255, 0.5)' }}
                >
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className={`text-2xl font-futuristic font-bold ${stat.color} mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-soft-white/60 text-sm font-futuristic">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Detailed Breakdown */}
            <motion.div
              className="mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              <h3 className="text-xl font-futuristic font-bold text-purple-accent mb-4 text-center">
                Game Breakdown
              </h3>
              <div className="bg-charcoal/30 border border-purple-accent/20 rounded-lg p-4">
                <div className="grid grid-cols-1 gap-2">
                  {breakdown.map((item, index) => (
                    <motion.div
                      key={item.label}
                      className="flex justify-between items-center py-2 border-b border-purple-accent/10 last:border-b-0"
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 1.2 + index * 0.1, duration: 0.3 }}
                    >
                      <span className="text-soft-white/80 font-futuristic">
                        {item.label}
                      </span>
                      <span className={`font-futuristic font-bold ${item.color}`}>
                        {item.value}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
            >
              <motion.button
                onClick={onPlayAgain}
                className="px-6 py-3 bg-electric-cyan text-charcoal font-futuristic font-bold rounded-lg hover:bg-electric-cyan/80 transition-all duration-300 shadow-neon-cyan text-sm sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                PLAY AGAIN
              </motion.button>

              <motion.button
                onClick={handleTwitterShare}
                className="px-6 py-3 bg-success-lime text-charcoal font-futuristic font-bold rounded-lg hover:bg-success-lime/80 transition-all duration-300 shadow-neon-lime text-sm sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                SHARE SCORE
              </motion.button>

              <motion.button
                onClick={onLeaderboard}
                className="px-6 py-3 bg-purple-accent text-soft-white font-futuristic font-bold rounded-lg hover:bg-purple-accent/80 transition-all duration-300 shadow-neon-purple text-sm sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                LEADERBOARD
              </motion.button>
            </motion.div>

            {/* Motivational Message */}
            <motion.div
              className="text-center mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0, duration: 0.5 }}
            >
              <p className="text-soft-white/60 font-futuristic text-sm">
                {gameState.score >= 5000 
                  ? "Outstanding performance! You're a MonadRush master!" 
                  : gameState.score >= 2500
                  ? "Great job! Keep practicing to reach new heights!"
                  : "Every master was once a beginner. Try again!"}
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
