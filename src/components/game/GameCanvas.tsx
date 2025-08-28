'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GameStateManager, GameSession } from '@/lib/game-state';
import { GameObject } from '@/lib/physics';
import { getGameModifiers } from '@/lib/game-logic';
import { MonadLogo } from './MonadLogo';
import { Glitch } from './Glitch';
import { GiftBox } from './GiftBox';
import { HUD } from './HUD';
import { Toast } from './Toast';
import { playSound, playMusic } from '@/lib/audio-manager';

interface GameCanvasProps {
  gameManager: GameStateManager;
  onGameEnd?: (session: GameSession) => void;
}

export function GameCanvas({ gameManager, onGameEnd }: GameCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [session, setSession] = React.useState<GameSession | null>(null);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  // Handle tap/click events
  const handleTap = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!session || session.state !== 'RUNNING') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    const hit = gameManager.handleTap(position);
    
    // Show feedback for successful taps
    if (hit) {
      // Visual feedback will be handled by individual components
    }
  }, [session, gameManager]);

  // Handle touch events for mobile
  const handleTouch = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!session || session.state !== 'RUNNING') return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const touch = event.touches[0];
    const position = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };

    const hit = gameManager.handleTap(position);
  }, [session, gameManager]);

  // Set up game manager event handlers
  useEffect(() => {
    gameManager.setEventHandlers(
      (state, session) => {
        setSession({ ...session });
        
        // Handle game state changes (but don't control music here)
        if (state === 'FINISHED') {
          playSound.gameOver();
          // Don't stop music here - let parent component handle music transitions
          
          if (onGameEnd) {
            onGameEnd(session);
          }
        }
      },
      (session) => {
        setSession({ ...session });

        // Play audio feedback based on session changes
        if (session.gameState.combo >= 5 && session.gameState.combo % 5 === 0) {
          playSound.comboMilestone(session.gameState.combo);
        }

        // Play time warning and switch to intense music when countdown gets low
        if (session.countdownTime <= 10 && session.countdownTime > 9) {
          playSound.timeWarning();
          // Switch to intense music for final countdown
          playMusic.intense();
          console.log('🎵 Switched to intense music for final countdown');
        }
      }
    );

    return () => {
      gameManager.cleanup();
      // Don't stop music here - let parent component handle music lifecycle
    };
  }, [gameManager, onGameEnd]);

  // Render falling objects
  const renderObjects = (objects: GameObject[]) => {
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
                highlighted={session ? getGameModifiers(session.gameState).logoHighlight : false}
                onTap={() => {
                  const hit = gameManager.handleTap(obj.position);
                  if (hit) playSound.logoTap();
                }}
              />
            );
          
          case 'glitch':
            return (
              <Glitch
                key={key}
                style={style}
                onTap={() => {
                  const hit = gameManager.handleTap(obj.position);
                  if (hit) playSound.glitchHit();
                }}
              />
            );
          
          case 'gift':
            return (
              <GiftBox
                key={key}
                style={style}
                cardType={obj.cardType}
                onTap={() => {
                  const hit = gameManager.handleTap(obj.position);
                  if (hit) playSound.giftOpen();
                }}
                onReveal={(cardType) => {
                  setToastMessage(`Magic Card: ${cardType.replace('-', ' ').toUpperCase()}`);
                  setTimeout(() => setToastMessage(null), 2000);
                  playSound.powerUp(); // Play power-up sound when card is revealed
                }}
              />
            );
          
          case 'bomb':
            return (
              <div
                key={key}
                style={{...style, cursor: 'pointer'}}
                className="bomb-object bg-red-500 rounded-full animate-pulse"
                onClick={() => {
                  const hit = gameManager.handleTap(obj.position);
                  if (hit) playSound.bombExplode();
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

    const display = gameManager.getCountdownDisplay();
    
    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-black/50 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="text-8xl font-futuristic font-bold text-electric-cyan"
          key={display}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {display}
        </motion.div>
      </motion.div>
    );
  };

  // Render pause overlay
  const renderPauseOverlay = () => {
    if (!session || session.state !== 'PAUSED') return null;

    return (
      <motion.div
        className="absolute inset-0 flex items-center justify-center bg-black/70 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="text-center">
          <h2 className="text-4xl font-futuristic font-bold text-soft-white mb-8">
            PAUSED
          </h2>
          <div className="space-y-4">
            <button
              onClick={() => gameManager.resumeGame()}
              className="px-8 py-3 bg-electric-cyan text-charcoal font-futuristic font-bold rounded-lg hover:bg-electric-cyan/80 transition-colors"
            >
              RESUME
            </button>
            <button
              onClick={() => {/* Handle quit */}}
              className="px-8 py-3 bg-danger text-soft-white font-futuristic font-bold rounded-lg hover:bg-danger/80 transition-colors block mx-auto"
            >
              QUIT
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  if (!session) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-soft-white font-futuristic">
          Initializing game...
        </div>
      </div>
    );
  }

  const modifiers = getGameModifiers(session.gameState);

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-gradient-to-b from-charcoal to-ink cursor-crosshair select-none"
      onClick={handleTap}
      onTouchStart={handleTouch}
      style={{
        filter: modifiers.slowMotion < 1 ? 'hue-rotate(30deg)' : 'none',
        transform: modifiers.timeFrozen ? 'hue-rotate(180deg)' : 'none',
        transition: 'filter 0.3s ease, transform 0.3s ease',
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-radial from-purple-accent/10 via-transparent to-transparent opacity-50" />
      
      {/* Game objects */}
      <div 
        className="absolute inset-0"
        style={{
          transform: modifiers.shrinkRay < 1 ? `scale(${modifiers.shrinkRay})` : 'none',
          transition: 'transform 0.3s ease',
        }}
      >
        {renderObjects(session.objects)}
      </div>

      {/* HUD */}
      <HUD gameState={session.gameState} />

      {/* Toast notifications */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Overlays */}
      {renderCountdown()}
      {renderPauseOverlay()}

      {/* Screen effects */}
      {modifiers.swarmActive && (
        <motion.div
          className="absolute inset-0 bg-success-lime/10 pointer-events-none"
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}

      {modifiers.timeFrozen && (
        <div className="absolute inset-0 border-4 border-electric-cyan animate-pulse-glow pointer-events-none" />
      )}
    </div>
  );
}
