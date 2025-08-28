'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { GameStateManager, GameSession } from '@/lib/game-state';
import { GameObject } from '@/lib/physics';
import { getGameModifiers } from '@/lib/game-logic';
import { playSound } from '@/lib/audio-manager';
import { MonadLogo } from './MonadLogo';
import { Glitch } from './Glitch';
import { GiftBox } from './GiftBox';
import { Bomb } from './Bomb';
import { Toast } from './Toast';

interface SimpleGameCanvasProps {
  gameManager: GameStateManager;
  session: GameSession | null;
  onGameEnd?: (session: GameSession) => void;
}

export default function SimpleGameCanvas({
  gameManager,
  session,
  onGameEnd
}: SimpleGameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const gameEndHandledRef = useRef<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showGlobalExplosion, setShowGlobalExplosion] = useState(false);
  const lastScoreRef = useRef(0);
  const lastComboRef = useRef(1);
  const lastStreakRef = useRef(0);

  // This component is now fully controlled by the `session` prop.
  // It receives all data from the parent and does not manage its own state.
  useEffect(() => {
    if (session) {
      // Update the objects to be rendered based on the session from props
      setObjects([...session.objects]);

      // Check for score milestones and combo achievements
      const currentScore = session.gameState.score;
      const currentCombo = session.gameState.combo;
      const currentStreak = session.gameState.streak;

      // Score milestone sounds (every 1000 points)
      if (Math.floor(currentScore / 1000) > Math.floor(lastScoreRef.current / 1000) && currentScore > 0) {
        console.log('🎵 Score milestone reached - playing milestone sound');
        playSound.comboMilestone(currentCombo);
      }

      // Combo milestone sounds (every 0.5 combo increase)
      if (currentCombo > lastComboRef.current && currentCombo > 1.0) {
        console.log('🎵 Combo increased - playing combo sound');
        playSound.comboMilestone(currentCombo);
      }

      // Update refs for next comparison
      lastScoreRef.current = currentScore;
      lastComboRef.current = currentCombo;
      lastStreakRef.current = currentStreak;

      // Handle the game end state when the session prop indicates it
      if (session.state === 'FINISHED' && session.id !== gameEndHandledRef.current) {
        console.log('🏁 Canvas - Game has ended, notifying parent component.');
        console.log('🎵 Game finished - playing game over sound');
        playSound.gameOver();
        gameEndHandledRef.current = session.id;
        onGameEnd?.(session);
      }
    }
  }, [session, onGameEnd]);

  const handleTap = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Allow taps only when the game is in the 'RUNNING' state
    if (!session || session.state !== 'RUNNING') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    // Delegate tap handling to the game manager via props
    gameManager.handleTap(position);
  }, [session, gameManager]);

  // Render falling objects using professional components
  const renderObjects = (objects: GameObject[]) => {
    if (!objects) return null;

    const modifiers = session ? getGameModifiers(session.gameState) : {
      slowMotion: 1.0,
      shrinkRay: 1.0,
      logoHighlight: false,
      timeFrozen: false,
      swarmActive: false,
    };

    return objects
      .filter(obj => obj.isActive)
      .map(obj => {
        const key = obj.id;
        const style = {
          position: 'absolute' as const,
          left: obj.position.x - obj.size.x / 2,
          top: obj.position.y - obj.size.y / 2,
          width: obj.size.x,
          height: obj.size.y,
        };

        switch (obj.type) {
          case 'logo':
            return (
              <MonadLogo
                key={key}
                style={style}
                highlighted={modifiers.logoHighlight}
                onTap={() => {
                  console.log('🎵 Logo tapped - playing tap sound');
                  playSound.logoTap();
                  gameManager.handleTap(obj.position);
                }}
              />
            );
          
          case 'glitch':
            return (
              <Glitch
                key={key}
                style={style}
                onTap={() => {
                  console.log('🎵 Glitch hit - playing glitch sound');
                  playSound.glitchHit();
                  gameManager.handleTap(obj.position);
                }}
              />
            );
          
          case 'gift':
            const cardType = (obj as GameObject & { cardType?: string }).cardType || 'unknown';
            return (
              <GiftBox
                key={key}
                style={style}
                cardType={cardType}
                onTap={() => {
                  console.log('🎵 Gift opened - playing gift sound');
                  playSound.giftOpen();
                  gameManager.handleTap(obj.position);
                  setToastMessage(`Magic Card: ${cardType.replace('-', ' ').toUpperCase()}`);
                  setTimeout(() => setToastMessage(null), 2000);
                }}
                onReveal={(cardType: string) => {
                  setToastMessage(`Magic Card: ${cardType.replace('-', ' ').toUpperCase()}`);
                  setTimeout(() => setToastMessage(null), 2000);
                }}
              />
            );
          
          case 'bomb':
            return (
              <Bomb
                key={key}
                style={style}
                onTap={() => {
                  console.log('🎵 Bomb exploded - playing bomb sound');
                  playSound.bombExplode();
                  gameManager.handleTap(obj.position);
                  // Show global explosion effect
                  setShowGlobalExplosion(true);
                  setTimeout(() => setShowGlobalExplosion(false), 1500);
                }}
              />
            );
          
          default:
            return null;
        }
      });
  };

  // Render countdown overlay
  const renderCountdown = () => {
    if (!session || session.state !== 'COUNTDOWN') return null;

    const countdownSeconds = Math.ceil(Math.max(0, session.countdownTime) / 1000);
    const displayText = countdownSeconds > 0 ? countdownSeconds.toString() : 'GO!';
    
    // Debug: Only log when countdown changes
    if (countdownSeconds !== Math.ceil(Math.max(0, session.countdownTime + 100) / 1000)) {
      console.log(`🕐 Countdown: ${displayText} (${session.countdownTime}ms remaining)`);
    }
    
    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center z-50 bg-ink/80 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          key={`countdown-${countdownSeconds}`}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-8xl font-futuristic font-bold text-electric-cyan neon-text"
        >
          {displayText}
        </motion.div>
      </motion.div>
    );
  };

  // Render pause overlay
  const renderPauseOverlay = () => {
    if (!session || session.state !== 'PAUSED') return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center z-50 bg-ink/80 pointer-events-none">
        <div className="text-center">
          <h2 className="text-4xl font-futuristic font-bold text-electric-cyan mb-4 neon-text">
            GAME PAUSED
          </h2>
          <p className="text-soft-white">
            Press Resume to continue
          </p>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full cursor-pointer overflow-hidden bg-gradient-to-b from-navy-900 to-ink"
      onClick={handleTap}
      style={{ userSelect: 'none' }}
    >
      {/* Game Objects */}
      {renderObjects(objects)}

      {/* Game State Overlays */}
      {renderCountdown()}
      {renderPauseOverlay()}

      {/* Toast Messages */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Game Effects */}
      {session && session.gameState.activeEffects.some(effect => effect.type === 'screen-shake') && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            x: [0, -2, 2, -2, 2, 0],
            y: [0, -1, 1, -1, 1, 0],
          }}
          transition={{ 
            duration: 0.3,
            repeat: 3,
            repeatType: 'loop'
          }}
        />
      )}

      {/* Slow Motion Effect */}
      {session && session.gameState.activeEffects.some(effect => effect.type === 'slow-motion') && (
        <div className="absolute inset-0 border-4 border-electric-cyan animate-pulse pointer-events-none" />
      )}

      {/* Freeze Effect */}
      {session && session.gameState.activeEffects.some(effect => effect.type === 'time-freeze') && (
        <div className="absolute inset-0 bg-sky-400/20 pointer-events-none" />
      )}

      {/* Global Explosion Effect */}
      {showGlobalExplosion && (
        <motion.div
          className="absolute inset-0 bg-orange-500/80 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5 }}
        />
      )}
    </div>
  );
}
