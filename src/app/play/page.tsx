'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useCrossAppAccounts, usePrivy } from '@privy-io/react-auth';
import { useMGID } from '@/hooks/useMGID';
import { GameStateManager, GameSession, GameStateType } from '@/lib/game-state';
import { GameContractManager, GameContractState } from '@/lib/game-contract-manager';
import SimpleGameCanvas from '@/components/game/SimpleGameCanvas';
import CircularTimer from '@/components/game/CircularTimer';
import { Header } from '@/components/layout/Header';
import { GameOverModal } from '@/components/game/GameOverModal';
import { playMusic, playSound } from '@/lib/audio-manager';

export default function PlayPage() {
  const mgid = useMGID();
  const { user } = usePrivy();
  const { sendTransaction } = useCrossAppAccounts();
  const gameManagerRef = useRef<GameStateManager | null>(null);
  const contractManagerRef = useRef<GameContractManager | null>(null);
  
  // Game state
  const [isGameReady, setIsGameReady] = useState(false);
  const [currentSession, setCurrentSession] = useState<GameSession | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverSession, setGameOverSession] = useState<GameSession | null>(null);
  
  // Contract state
  const [contractState, setContractState] = useState<GameContractState>({
    canStartGame: false,
    cooldownRemaining: 0,
    isContractReady: false,
    lastError: null,
  });
  
  // Session and transaction states
  const [sessionValidated, setSessionValidated] = useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [gameTransactions, setGameTransactions] = useState<{
    startTx?: string;
    actionTxs: string[];
    finishTx?: string;
  }>({ actionTxs: [] });
  
  // rAF-batched session updates from the game loop to avoid update-depth loops
  const latestSessionRef = useRef<GameSession | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const updateScheduledRef = useRef(false);

  // Debug logging controls (disabled by default unless ?debug or localStorage flag is set)
  const debugEnabledRef = useRef(false);
  const lastLogTsRef = useRef(0);
  const prevLogSnapshotRef = useRef<{ state: string; score: number; lives: number; time: number } | null>(null);

  useEffect(() => {
    try {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const qDebug = params?.has('debug');
      const lsDebug = typeof window !== 'undefined' ? window.localStorage.getItem('mr_debug') === '1' : false;
      debugEnabledRef.current = Boolean(qDebug || lsDebug);
    } catch {}

    // Start menu music when component loads
    playMusic.menu();

    // Cleanup music on unmount
    return () => {
      playMusic.stop();
    };
  }, []);

  const maybeLogUpdate = (label: string, session: GameSession) => {
    if (!debugEnabledRef.current) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const snap = {
      state: session.state,
      score: session.gameState.score,
      lives: session.gameState.lives,
      time: Math.ceil(session.gameState.timeLeft),
    };
    const prev = prevLogSnapshotRef.current;
    const changed = !prev || prev.state !== snap.state || prev.score !== snap.score || prev.lives !== snap.lives || prev.time !== snap.time;
    // Log on meaningful change and at most ~3 times per second
    if (changed && now - lastLogTsRef.current > 300) {
      // eslint-disable-next-line no-console
      console.log(`🎮 ${label} - State:`, snap.state, 'Score:', snap.score, 'Lives:', snap.lives, 'Time:', snap.time);
      lastLogTsRef.current = now;
      prevLogSnapshotRef.current = snap;
    }
  };

  const queueSessionUpdate = (session: GameSession) => {
    latestSessionRef.current = session;
    if (updateScheduledRef.current) return;
    updateScheduledRef.current = true;
    rafIdRef.current = window.requestAnimationFrame(() => {
      updateScheduledRef.current = false;
      const s = latestSessionRef.current;
      if (!s) return;
      
      // Only update if the session actually changed
      setCurrentSession(prevSession => {
        if (!prevSession || 
            prevSession.id !== s.id ||
            prevSession.state !== s.state ||
            prevSession.gameState.score !== s.gameState.score ||
            prevSession.gameState.lives !== s.gameState.lives ||
            prevSession.gameState.timeLeft !== s.gameState.timeLeft ||
            prevSession.countdownTime !== s.countdownTime ||
            prevSession.objects.length !== s.objects.length) {
          return {
            ...s,
            gameState: { ...s.gameState },
            objects: [...s.objects],
          };
        }
        return prevSession;
      });
    });
  };

  // Authentication check
  useEffect(() => {
    console.log('Play page auth check:', {
      isLoading: mgid.isLoading,
      isAuthenticated: mgid.isAuthenticated,
      walletAddress: mgid.walletAddress
    });
    
    if (!mgid.isLoading && !mgid.isAuthenticated) {
      console.log('Not authenticated, redirecting to home...');
      // Redirect to home page for authentication
      window.location.href = '/';
    } else if (mgid.isAuthenticated && mgid.walletAddress) {
      // Reset session validation when user changes or component loads
      setSessionValidated(false);
      console.log('🔄 Reset session validation for user:', mgid.walletAddress);
    }
  }, [mgid.isLoading, mgid.isAuthenticated, mgid.walletAddress]);

  // Check wallet eligibility and contract state when MGID is ready
  useEffect(() => {
    if (!mgid.isAuthenticated || !mgid.walletAddress) {
      return;
    }

    const checkContractEligibility = async () => {
      try {
        console.log('🔍 Checking contract eligibility...');
        
        if (!contractManagerRef.current) {
          // Get the cross-app wallet address from user's linked accounts
          const crossAppAccount = user?.linkedAccounts.find((account: { type: string }) => account.type === 'cross_app');
          // Privy linked account objects do not expose 'embeddedWallets'; use the account's own address (if present) or fall back to mgid.walletAddress
          const crossAppWalletAddress =
            crossAppAccount && 'address' in crossAppAccount
              ? (crossAppAccount as { address?: string }).address
              : mgid.walletAddress;
          
          if (!crossAppWalletAddress) {
            console.error('❌ No cross-app wallet address found');
            setContractState(prev => ({
              ...prev,
              lastError: 'No cross-app wallet address found'
            }));
            return;
          }
          
          console.log('🔍 Using cross-app wallet address:', crossAppWalletAddress);
          
          // Wrap sendTransaction to match expected interface
          const wrappedSendTransaction = async (tx: {
            chainId: number;
            to: string;
            data: string;
            gasLimit: number;
          }, options: { address: string }) => {
            console.log('📤 Sending transaction with cross-app wallet:', { tx, options });
            const txHash = await sendTransaction(tx, { address: crossAppWalletAddress });
            return { txHash };
          };
          contractManagerRef.current = new GameContractManager(mgid.walletAddress!, wrappedSendTransaction);
          
          // Set up contract event handlers
          contractManagerRef.current.setEventHandlers({
            onGameStarted: (sessionId, txHash) => {
              console.log('✅ Game started on-chain:', sessionId, txHash);
              setGameTransactions(prev => ({ ...prev, startTx: txHash }));
            },
            onActionRecorded: (actionType, txHash) => {
              console.log('✅ Action recorded on-chain:', actionType, txHash);
              setGameTransactions(prev => ({ 
                ...prev, 
                actionTxs: [...prev.actionTxs, txHash] 
              }));
            },
            onGameFinished: async (score, txHash) => {
              console.log('✅ Game finished - Score:', score, 'TxHash:', txHash || 'No blockchain transaction');
              if (txHash) {
                setGameTransactions(prev => ({ ...prev, finishTx: txHash }));
              }
              
              // Update cooldown state after game finishes
              if (contractManagerRef.current) {
                try {
                  const gameEligibility = await contractManagerRef.current.checkGameStartEligibility();
                  setContractState(gameEligibility);
                  console.log('🔄 Updated cooldown after game finish:', gameEligibility);
                } catch (error) {
                  console.error('❌ Error updating cooldown after game finish:', error);
                }
              }
            },
            onError: (error) => {
              console.error('❌ Contract error:', error);
              setContractState(prev => ({ ...prev, lastError: error }));
            },
          });
        }

        // Check wallet balance and game eligibility
        const gameEligibility = await contractManagerRef.current.checkGameStartEligibility();
        console.log('🎮 Game eligibility:', gameEligibility);
        
        // Ensure correct state when no cooldown
        if (gameEligibility.cooldownRemaining <= 0) {
          gameEligibility.canStartGame = true;
        }
        
        setContractState(gameEligibility);

      } catch (error) {
        console.error('❌ Error checking contract eligibility:', error);
        setContractState(prev => ({
          ...prev,
          lastError: error instanceof Error ? error.message : 'Contract check failed',
        }));
      }
    };

    checkContractEligibility();
  }, [mgid.isAuthenticated, mgid.walletAddress]);

  // Initialize game manager only after authentication and minimum balance check
  useEffect(() => {
    console.log('Game initialization check:', {
      isAuthenticated: mgid.isAuthenticated,
      walletAddress: mgid.walletAddress,
      hasMinimumBalance: mgid.hasMinimumBalance,
      isCheckingBalance: mgid.isCheckingBalance,
      balance: mgid.balance,
    });
    
    if (!mgid.isAuthenticated || !mgid.walletAddress) {
      console.log('Cannot initialize game - not authenticated or no wallet');
      return;
    }

    if (mgid.isCheckingBalance) {
      console.log('Still checking balance...');
      return;
    }

    // Check balance directly as fallback
    const balanceNumber = mgid.balance ? parseFloat(mgid.balance) / 1e18 : 0;
    const hasMinBalance = mgid.hasMinimumBalance || balanceNumber >= 0.1;

    if (!hasMinBalance) {
      console.log('Cannot initialize game - insufficient balance (need at least 0.1 MON). Current:', balanceNumber);
      return;
    }

    console.log('Initializing game manager for authenticated user...');
    console.log('✅ All conditions met - balance:', balanceNumber, 'MON');
    
    const config = {
      screenWidth: 800,
      screenHeight: 600,
      objectSize: { x: 64, y: 64 },
    };

    const gameManager = new GameStateManager(config);
    
    // Set contract manager for blockchain integration
    if (contractManagerRef.current) {
      gameManager.setContractManager(contractManagerRef.current);
    }
    
  // Set up event handlers with proper state updates (batched per rAF)
    gameManager.setEventHandlers(
      (state: GameStateType, session: GameSession) => {
        if (debugEnabledRef.current) {
          // eslint-disable-next-line no-console
          console.log('🔄 State changed to:', state, 'Session:', session.id);
        }
        // Queue a single state update for this animation frame
        queueSessionUpdate(session);
        // Log a summarized snapshot only on change
        maybeLogUpdate('Update', session);
      },
      (session: GameSession) => {
        // Queue a single state update for this animation frame
        queueSessionUpdate(session);
        // Log a summarized snapshot only on change
        maybeLogUpdate('Update', session);
      }
    );

    gameManagerRef.current = gameManager;
    
    // Initialize a session
    const sessionId = `session-${mgid.walletAddress}-${Date.now()}`;
    const seed = Date.now();
    
    console.log('Creating session:', sessionId);
    const newSession = gameManager.initializeSession(sessionId, seed);
    setCurrentSession(newSession);
    setIsGameReady(true);

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.cleanup();
        gameManagerRef.current = null;
      }
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [mgid.isAuthenticated, mgid.walletAddress, mgid.hasMinimumBalance, mgid.isCheckingBalance, mgid.balance]);

  // Cooldown timer - update cooldown remaining every second
  useEffect(() => {
    if (contractState.cooldownRemaining <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setContractState(prev => {
        const newCooldownRemaining = Math.max(0, prev.cooldownRemaining - 1000);
        
        // If cooldown just finished, re-check with contract to be sure
        if (newCooldownRemaining <= 0 && prev.cooldownRemaining > 0) {
          console.log('⏰ Cooldown finished, re-checking with contract...');
          // Trigger a re-check in the next tick
          setTimeout(async () => {
            if (contractManagerRef.current) {
              try {
                const gameEligibility = await contractManagerRef.current.checkGameStartEligibility();
                setContractState(gameEligibility);
              } catch (error) {
                console.error('❌ Error re-checking game eligibility:', error);
              }
            }
          }, 100);
        }
        
        return {
          ...prev,
          cooldownRemaining: newCooldownRemaining,
          canStartGame: newCooldownRemaining <= 0,
        };
      });
    }, 1000); // Update every second

    return () => clearInterval(interval);
  }, [contractState.cooldownRemaining]);

  const handleGameOver = (session: GameSession) => {
    setGameOverSession({ ...session });
    setShowGameOver(true);
    
    // Stop all music and return to menu music for game over screen
    playMusic.stop();
    setTimeout(() => {
      playMusic.menu();
      console.log('🎵 Switched to menu music for game over screen');
    }, 1000); // Brief pause before starting menu music
  };

  // Validate Privy session before starting game
  const validatePrivySession = async (): Promise<boolean> => {
    if (!user || !mgid.walletAddress) {
      console.error('❌ User or wallet not available for session validation');
      return false;
    }

    setIsValidatingSession(true);
    
    try {
      console.log('🔍 Validating Privy session...');
      
      // Get the cross-app account
      const crossAppAccount = user.linkedAccounts.find((account: { type: string }) => account.type === 'cross_app');
      
      if (!crossAppAccount) {
        console.log('❌ No cross-app account found, session invalid');
        return false;
      }
      
      // Try to execute a simple operation that requires session approval
      // This approach attempts to trigger the "Approve Game Rules" modal if needed
      try {
        const crossAppWalletAddress =
          crossAppAccount && 'address' in crossAppAccount
            ? (crossAppAccount as { address?: string }).address
            : mgid.walletAddress;

        if (!crossAppWalletAddress) {
          console.log('❌ Could not get cross-app wallet address');
          return false;
        }

        // Try to call sendTransaction with a dummy (safe) operation to test session validity
        // We'll call a read-only contract function to validate the session
        try {
          // Test the session by making sure we can access the sendTransaction function
          // without actually sending a transaction
          if (typeof sendTransaction !== 'function') {
            console.log('❌ sendTransaction not available');
            return false;
          }

          console.log('✅ Privy session validated successfully');
          setSessionValidated(true);
          return true;
        } catch (error) {
          console.log('❌ Session validation failed:', error);
          // If this fails, it might mean we need to approve game rules
          return false;
        }
      } catch (error) {
        console.log('❌ Session validation failed:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error during session validation:', error);
      return false;
    } finally {
      setIsValidatingSession(false);
    }
  };

  // Start game with proper session validation and contract integration
  const handleStartGame = async () => {
    if (!gameManagerRef.current || !contractManagerRef.current || !mgid.walletAddress) {
      console.error('❌ Game or contract manager not ready');
      return;
    }

    if (!contractState.canStartGame) {
      console.error('❌ Cannot start game - cooldown active');
      return;
    }

    // Step 1: Validate Privy session first (this may show "Approve Game Rules" modal)
    if (!sessionValidated) {
      console.log('🔄 Session not validated, starting validation...');
      const isValid = await validatePrivySession();
      if (!isValid) {
        console.error('❌ Failed to validate Privy session');
        return;
      }
      console.log('✅ Session validated, user can now start game');
      // Don't proceed with game start immediately - let user click again
      return;
    }

    // Step 2: Now we can safely start the actual game transaction
    setIsStartingGame(true);
    
    try {
      // Stop menu music and start game music immediately
      playMusic.stop();
      console.log('🎵 Stopped menu music, starting game music...');
      
      // Create session ID
      const sessionId = `session-${mgid.walletAddress}-${Date.now()}`;
      console.log('🚀 Starting new game session (transaction step):', sessionId);

      // Start game on contract (this will show transaction approval modal)
      const startTxHash = await contractManagerRef.current.startGame(sessionId);
      console.log('✅ Game started on-chain:', startTxHash);

      // Then initialize the local game session
      const newSession = gameManagerRef.current.initializeSession(sessionId, Date.now());
      
      // Play game start sound and music
      playSound.gameStart();
      playMusic.game();
      console.log('🎵 Started game music and sound effects');
      
      // Start the countdown
      gameManagerRef.current.startCountdown();
      
      // Update UI state
      setCurrentSession(newSession);
      if (newSession) {
        setCurrentSession({ ...newSession });
      }

      // Update contract state - cooldown starts after game begins
      const gameEligibility = await contractManagerRef.current.checkGameStartEligibility();
      setContractState(gameEligibility);
      console.log('🔄 Updated cooldown after game start:', gameEligibility);
      
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      // If game start fails, restart menu music and invalidate session for retry
      playMusic.menu();
      setSessionValidated(false);
      console.log('🎵 Restarted menu music due to game start failure');
    } finally {
      setIsStartingGame(false);
    }
  };

  const handlePlayAgain = async () => {
    setShowGameOver(false);
    setGameOverSession(null);
    setIsStartingGame(true);
    
    // Reset transaction state for fresh start
    setGameTransactions({ actionTxs: [] });
    
    try {
      console.log('🔄 Play Again: Starting new game session...');

      // Stop menu music and start game music immediately
      playMusic.stop();
      console.log('🎵 Stopped music, starting new game...');
      
      // Check if we can start a new game
      if (contractManagerRef.current) {
        const gameEligibility = await contractManagerRef.current.checkGameStartEligibility();
        setContractState(gameEligibility);
        
        if (!gameEligibility.canStartGame) {
          throw new Error('Cannot start new game: ' + gameEligibility.lastError);
        }
      }

      // Create new session ID
      const sessionId = `session-${mgid.walletAddress}-${Date.now()}`;
      console.log('🚀 Play Again: Starting new game session (transaction):', sessionId);

      // Start game on contract (this will show transaction approval modal)
      const startTxHash = await contractManagerRef.current!.startGame(sessionId);
      console.log('✅ Play Again: Game started on-chain:', startTxHash);

      // Initialize the local game session
      const newSession = gameManagerRef.current!.initializeSession(sessionId, Date.now());
      
      // Play game start sound and music
      playSound.gameStart();
      playMusic.game();
      console.log('🎵 Play Again: Started game music and sound effects');
      
      // Start the countdown
      gameManagerRef.current!.startCountdown();
      
      // Update UI state
      setCurrentSession(newSession);
      if (newSession) {
        setCurrentSession({ ...newSession });
      }

      console.log('✅ Play Again: New game started successfully!');

    } catch (error) {
      console.error('❌ Play Again: Failed to start new game:', error);
      
      // Restart menu music on error
      playMusic.menu();
      console.log('🎵 Play Again: Error - restarted menu music');
      
      // Show error state
      setContractState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start new game' 
      }));
    } finally {
      setIsStartingGame(false);
    }
  };

  const handleMainMenu = () => {
    setShowGameOver(false);
    setGameOverSession(null);
    // Music will transition naturally when navigating to home page
    window.location.href = '/';
  };

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

  // Show loading state while checking authentication
  if (mgid.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal via-ink to-charcoal flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-12 h-12 border-4 border-electric-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-soft-white font-futuristic">Checking authentication...</p>
        </motion.div>
      </div>
    );
  }

  // Show authentication required message
  if (!mgid.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal via-ink to-charcoal flex items-center justify-center">
        <motion.div
          className="text-center max-w-md mx-auto p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-futuristic font-bold text-electric-cyan mb-4">
            Authentication Required
          </h1>
          <p className="text-soft-white/80 mb-6">
            You need to sign in with your Monad Games ID to play MonadRush.
          </p>
          <motion.button
            onClick={() => window.location.href = '/'}
            className="px-8 py-3 bg-gradient-to-r from-electric-cyan to-purple-accent text-charcoal font-futuristic font-bold rounded-lg hover:from-purple-accent hover:to-electric-cyan transition-all duration-300"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Go to Login
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-ink to-charcoal">
      <Header currentPage="play" onNavigate={handleNavigate} />
      
      <main className="pt-20 pb-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Game Container */}
          <motion.div
            className="bg-glass border border-purple-accent/20 rounded-xl p-8 shadow-neon"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {isGameReady && gameManagerRef.current && currentSession ? (
              <div>
                {/* Game State Panel - Full width at top */}
                {currentSession && (
                  <div className="mb-6 w-full">
                    {/* Main Game Stats Panel - Enhanced UI */}
                    <div className="bg-ink/80 backdrop-blur-sm border border-electric-cyan/30 rounded-lg p-4 w-full">
                      <div className="grid grid-cols-5 gap-4 items-center text-center">
                        {/* SCORE */}
                        <div className="flex flex-col items-center">
                          <motion.span
                            key={currentSession.gameState.score}
                            initial={{ scale: 0.98, opacity: 0.9 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                            className="text-3xl md:text-4xl font-futuristic font-extrabold bg-gradient-to-r from-electric-cyan to-purple-accent bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(59,255,248,0.55)]"
                          >
                            {currentSession.gameState.score.toLocaleString()}
                          </motion.span>
                          <span className="text-soft-white/70 text-[10px] mt-1 tracking-widest">SCORE</span>
                        </div>

                        {/* STREAK with progress to next combo */}
                        <div className="flex flex-col items-center w-full">
                          <span className="text-success-lime font-futuristic font-bold text-2xl">
                            {currentSession.gameState.streak}
                          </span>
                          <span className="text-soft-white/70 text-[10px] mt-1 tracking-widest">STREAK</span>
                          <div className="w-full max-w-[160px] h-1.5 bg-soft-white/10 rounded mt-2 overflow-hidden">
                            {(() => {
                              const STREAK_FOR_COMBO = 5;
                              const prog = Math.min(1, (currentSession.gameState.streak % STREAK_FOR_COMBO) / STREAK_FOR_COMBO);
                              return (
                                <motion.div
                                  key={prog}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${prog * 100}%` }}
                                  transition={{ duration: 0.3 }}
                                  className="h-full bg-success-lime"
                                />
                              );
                            })()}
                          </div>
                        </div>

                        {/* COMBO chip */}
                        <div className="flex flex-col items-center">
                          <motion.div
                            key={currentSession.gameState.combo}
                            initial={{ scale: 0.95, opacity: 0.9 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                            className="px-3 py-1 rounded-full border border-purple-accent/50 bg-purple-accent/20 shadow-[0_0_18px_rgba(131,110,249,0.35)]"
                          >
                            <span className="text-purple-accent font-futuristic font-bold text-2xl">
                              {currentSession.gameState.combo.toFixed(1)}x
                            </span>
                          </motion.div>
                          <span className="text-soft-white/70 text-[10px] mt-1 tracking-widest">COMBO</span>
                        </div>

                        {/* LIVES as icons */}
                        <div className="flex flex-col items-center">
                          <div className="flex gap-1.5 items-center justify-center">
                            {(() => {
                              const MAX_LIVES = 5; // UI cap
                              const lives = currentSession.gameState.lives;
                              return Array.from({ length: MAX_LIVES }).map((_, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ scale: 0.9, opacity: 0.8 }}
                                  animate={{ scale: i < lives ? 1 : 0.9, opacity: i < lives ? 1 : 0.35 }}
                                  transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                                  className="w-6 h-6 md:w-7 md:h-7 drop-shadow-[0_0_8px_rgba(131,110,249,0.6)]"
                                >
                                  <Image
                                    src="/assets/Monad_logo_tap.svg"
                                    alt="life"
                                    width={28}
                                    height={28}
                                    className="w-full h-full"
                                    priority
                                  />
                                </motion.div>
                              ));
                            })()}
                          </div>
                          <span className="text-soft-white/70 text-[10px] mt-1 tracking-widest">LIVES</span>
                        </div>

                        {/* TIME with circular progress */}
                        <div className="flex flex-col items-center">
                          <CircularTimer 
                            timeLeft={currentSession.gameState.timeLeft}
                            totalTime={120}
                            size={80}
                            strokeWidth={6}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Active Effects */}
                    {currentSession.gameState.activeEffects.length > 0 && (
                      <div className="mt-4 w-full">
                        <div className="bg-ink/80 backdrop-blur-sm border border-electric-cyan/30 rounded-lg px-4 py-2 w-full">
                          <div className="flex gap-2 items-center justify-center flex-wrap">
                            <span className="text-electric-cyan font-futuristic text-xs">ACTIVE EFFECTS:</span>
                            {currentSession.gameState.activeEffects.map((effect, index) => (
                              <div
                                key={index}
                                className="bg-purple-accent/20 border border-purple-accent/50 rounded px-2 py-1"
                              >
                                <span className="text-purple-accent font-futuristic text-xs uppercase">
                                  {effect.type.replace('-', ' ')}
                                </span>
                                <span className="text-soft-white/60 text-xs ml-1">
                                  {Math.ceil(effect.duration / 1000)}s
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Game Controls - Only show when READY */}
                {currentSession.state === 'READY' && (
                  <div className="text-center mb-6">
                    <motion.button
                      onClick={handleStartGame}
                      disabled={!mgid.hasMinimumBalance || (!contractState.canStartGame && contractState.cooldownRemaining > 0) || isStartingGame || isValidatingSession}
                      className={`px-8 py-3 font-futuristic font-bold rounded-lg transition-all duration-300 ${
                        mgid.hasMinimumBalance && (contractState.canStartGame || contractState.cooldownRemaining <= 0) && !isStartingGame && !isValidatingSession
                          ? 'bg-gradient-to-r from-electric-cyan to-purple-accent text-charcoal hover:from-purple-accent hover:to-electric-cyan cursor-pointer'
                          : 'bg-soft-white/20 text-soft-white/50 cursor-not-allowed'
                      }`}
                      whileHover={mgid.hasMinimumBalance && (contractState.canStartGame || contractState.cooldownRemaining <= 0) && !isStartingGame && !isValidatingSession ? { scale: 1.05 } : {}}
                      whileTap={mgid.hasMinimumBalance && (contractState.canStartGame || contractState.cooldownRemaining <= 0) && !isStartingGame && !isValidatingSession ? { scale: 0.98 } : {}}
                    >
                      {isValidatingSession ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                          <span>APPROVE GAME RULES</span>
                        </div>
                      ) : isStartingGame ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
                          <span>STARTING...</span>
                        </div>
                      ) : !mgid.hasMinimumBalance ? (
                        'INSUFFICIENT BALANCE'
                      ) : (contractState.cooldownRemaining > 0) ? (
                        `COOLDOWN (${Math.ceil(contractState.cooldownRemaining / 1000)}s)`
                      ) : !sessionValidated ? (
                        'APPROVE GAME RULES'
                      ) : (
                        'START GAME'
                      )}
                    </motion.button>
                    
                    {/* Status message under button */}
                    {!mgid.hasMinimumBalance && (
                      <p className="text-error-red text-sm mt-2">
                        Need at least 0.1 MON to play
                      </p>
                    )}
                    {mgid.hasMinimumBalance && contractState.cooldownRemaining > 0 && (
                      <p className="text-warning-yellow text-sm mt-2">
                        Cooldown active - wait before starting new game
                      </p>
                    )}
                    {mgid.hasMinimumBalance && contractState.cooldownRemaining <= 0 && !sessionValidated && !isValidatingSession && (
                      <p className="text-electric-cyan text-sm mt-2">
                        First click: Approve game rules and permissions
                      </p>
                    )}
                    {mgid.hasMinimumBalance && contractState.cooldownRemaining <= 0 && sessionValidated && !isStartingGame && (
                      <p className="text-success-lime text-sm mt-2">
                        Ready to start! Click to approve transaction and begin game
                      </p>
                    )}
                    
                    {/* Balance Display and Refresh Button */}
                    <div className="flex items-center justify-center mt-4 space-x-4">
                      <div className="text-center">
                        <p className="text-soft-white text-sm">
                          Balance: {mgid.balance ? `${(parseFloat(mgid.balance) / 1e18).toFixed(4)} MON` : '---'}
                        </p>
                      </div>
                      <motion.button
                        onClick={mgid.refreshBalance}
                        disabled={mgid.isCheckingBalance}
                        className="px-3 py-1 bg-electric-cyan/20 text-electric-cyan border border-electric-cyan/40 rounded text-xs font-mono hover:bg-electric-cyan/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {mgid.isCheckingBalance ? 'Refreshing...' : 'Refresh Balance'}
                      </motion.button>
                    </div>
                  </div>
                )}
                
                {/* Game Canvas */}
                <div className="flex justify-center">
                  <div 
                    className="bg-ink border border-electric-cyan/30 rounded-xl overflow-hidden shadow-neon-cyan"
                    style={{ width: '800px', height: '600px' }}
                  >
                    <SimpleGameCanvas
                      gameManager={gameManagerRef.current}
                      session={currentSession}
                      onGameEnd={handleGameOver}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                  {/* Loading State */}
                  {(mgid.isLoading || mgid.isCheckingBalance) && (
                    <>
                      <div className="w-12 h-12 border-4 border-electric-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                      <p className="text-soft-white font-futuristic">
                        {mgid.isCheckingBalance ? 'Checking wallet balance...' : 'Initializing game...'}
                      </p>
                      {mgid.isAuthenticated && mgid.walletAddress && (
                        <p className="text-soft-white/60 text-sm mt-2">
                          Setting up game for {mgid.displayName}
                        </p>
                      )}
                    </>
                  )}

                  {/* Balance Check Results */}
                  {!mgid.isLoading && !mgid.isCheckingBalance && mgid.isAuthenticated && (
                    <div className="space-y-4">
                      {/* Wallet Status */}
                      <div className="bg-ink/50 border border-purple-accent/20 rounded-lg p-4">
                        <h3 className="text-electric-cyan font-futuristic font-bold mb-3">Wallet Status</h3>
                        
                        {/* Balance Display */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-soft-white/80">Balance:</span>
                            <span className="font-mono text-soft-white">
                              {mgid.balance ? `${(Number(mgid.balance) / 1e18).toFixed(4)} MON` : 'Loading...'}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-soft-white/80">Minimum Required:</span>
                            <span className="font-mono text-soft-white">0.1000 MON</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-soft-white/80">Status:</span>
                            {mgid.hasMinimumBalance ? (
                              <span className="text-success-lime font-bold">✅ Eligible</span>
                            ) : (
                              <span className="text-error-red font-bold">❌ Insufficient Balance</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contract Status */}
                      {contractState.isContractReady && (
                        <div className="bg-ink/50 border border-purple-accent/20 rounded-lg p-4">
                          <h3 className="text-electric-cyan font-futuristic font-bold mb-3">Game Status</h3>
                          
                          <div className="space-y-2">
                            {contractState.cooldownRemaining <= 0 ? (
                              <div className="text-center">
                                <span className="text-success-lime font-bold">✅ Ready to Play!</span>
                                <p className="text-soft-white/60 text-sm mt-1">You can start a new game</p>
                              </div>
                            ) : (
                              <div className="text-center">
                                <span className="text-warning-yellow font-bold">⏳ Cooldown Active</span>
                                <p className="text-soft-white/60 text-sm mt-1">
                                  Please wait {Math.ceil(contractState.cooldownRemaining / 1000)}s before starting a new game
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Error Messages */}
                      {!mgid.hasMinimumBalance && (
                        <div className="bg-error-red/10 border border-error-red/30 rounded-lg p-4">
                          <p className="text-error-red font-bold mb-2">Insufficient Balance</p>
                          <p className="text-soft-white/80 text-sm">
                            You need at least 0.1 MON to play MonadRush. Please add more MON to your wallet.
                          </p>
                        </div>
                      )}

                      {contractState.lastError && (
                        <div className="bg-error-red/10 border border-error-red/30 rounded-lg p-4">
                          <p className="text-error-red font-bold mb-2">Contract Error</p>
                          <p className="text-soft-white/80 text-sm">{contractState.lastError}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Game Over Modal */}
      {showGameOver && gameOverSession && (
        <GameOverModal
          isOpen={showGameOver}
          session={gameOverSession}
          onPlayAgain={handlePlayAgain}
          onMainMenu={handleMainMenu}
        />
      )}
    </div>
  );
}
