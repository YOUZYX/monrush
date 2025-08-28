'use client';

import React, { useEffect, useRef } from 'react';
import { GameStateManager } from '@/lib/game-state';
import { GameCanvas } from '@/components/game/GameCanvas';
import { Header } from '@/components/layout/Header';
import { playMusic } from '@/lib/audio-manager';

export default function TestGamePage() {
  const gameManagerRef = useRef<GameStateManager | null>(null);
  const [isGameReady, setIsGameReady] = React.useState(false);

  // Handle navigation
  const handleNavigate = (page: string) => {
    switch(page) {
      case 'play':
        window.location.href = '/play';
        break;
      case 'how-to-play':
        window.location.href = '/how-to-play';
        break;
      case 'leaderboard':
        window.location.href = '/leaderboard';
        break;
      default:
        window.location.href = '/';
    }
  };

  useEffect(() => {
    // Initialize game manager
    const config = {
      screenWidth: 800,
      screenHeight: 600,
      objectSize: { x: 64, y: 64 },
    };

    gameManagerRef.current = new GameStateManager(config);
    
    // Initialize a test session
    const sessionId = 'test-session-' + Date.now();
    const seed = Date.now();
    
    gameManagerRef.current.initializeSession(sessionId, seed);
    setIsGameReady(true);

    // Start menu music
    playMusic.menu();

    return () => {
      gameManagerRef.current?.cleanup();
      playMusic.stop();
    };
  }, []);

  const startGame = () => {
    gameManagerRef.current?.startCountdown();
  };

  if (!isGameReady || !gameManagerRef.current) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-electric-cyan font-futuristic text-xl">
          Initializing game...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal">
      <Header currentPage="play" onNavigate={handleNavigate} />
      
      <div className="container mx-auto p-4 pt-24">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-futuristic font-bold text-electric-cyan mb-4">
            MonadRush - Phase 1 Test
          </h1>
          <button
            onClick={startGame}
            className="px-8 py-3 bg-electric-cyan text-charcoal font-futuristic font-bold rounded-lg hover:bg-electric-cyan/80 transition-colors"
          >
            START GAME
          </button>
        </div>
        
        <div className="w-full max-w-4xl mx-auto bg-ink rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <GameCanvas 
            gameManager={gameManagerRef.current}
            onGameEnd={(session) => {
              console.log('Game ended:', session);
            }}
          />
        </div>
        
        <div className="mt-4 text-center">
          <div className="text-soft-white/70 font-futuristic text-sm">
            <p>Phase 1 Complete: Offline game core with contract testing setup</p>
            <p>✅ All systems functional - Ready for Phase 2 (Auth & MGID)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
