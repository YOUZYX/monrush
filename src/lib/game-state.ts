/**
 * Game State Machine for MonadRush
 * Manages game flow and client-side game loop
 */

import { GameState, createInitialGameState, updateGameState, processTap, applyTapResult, isGameOver, getGameModifiers } from './game-logic';
import { GameObject, SpawnManager, updateGameObject, isOffScreen, findTappedObjects } from './physics';
import { GameRNG, createSessionRNG } from './rng';
import { GameContractManager } from './game-contract-manager';

// Game state machine states
export type GameStateType = 
  | 'IDLE'
  | 'AUTH_CHECK' 
  | 'READY'
  | 'COUNTDOWN'
  | 'RUNNING'
  | 'PAUSED'
  | 'FINISHED'
  | 'SUMMARY';

export interface GameSession {
  id: string;
  seed: number;
  rng: GameRNG;
  state: GameStateType;
  gameState: GameState;
  objects: GameObject[];
  spawnManager: SpawnManager;
  lastUpdateTime: number;
  countdownTime: number;
  isPaused: boolean;
  tapHistory: TapEvent[];
  actions: Array<{ type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss'; timestamp: number }>; // For game over stats
  stateHash: string; // For anti-cheat verification
}

export interface TapEvent {
  timestamp: number;
  position: { x: number; y: number };
  targetId?: string;
  result: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
}

export interface GameConfig {
  screenWidth: number;
  screenHeight: number;
  objectSize: { x: number; y: number };
}

/**
 * Game State Manager
 */
export class GameStateManager {
  private session: GameSession | null = null;
  private config: GameConfig;
  private animationFrameId: number | null = null;
  private onStateChange?: (state: GameStateType, session: GameSession) => void;
  private onGameUpdate?: (session: GameSession) => void;
  private contractManager?: GameContractManager;

  constructor(config: GameConfig) {
    this.config = config;
  }

  /**
   * Set contract manager for blockchain integration
   */
  setContractManager(contractManager: GameContractManager) {
    this.contractManager = contractManager;
  }

  /**
   * Set event handlers
   */
  setEventHandlers(
    onStateChange?: (state: GameStateType, session: GameSession) => void,
    onGameUpdate?: (session: GameSession) => void
  ) {
    this.onStateChange = onStateChange;
    this.onGameUpdate = onGameUpdate;
  }

  /**
   * Initialize new game session
   */
  initializeSession(sessionId: string, seed: number): GameSession {
    const rng = createSessionRNG(sessionId, seed);
    const gameState = createInitialGameState();
    
    const spawnManager = new SpawnManager(rng, {
      screenWidth: this.config.screenWidth,
      screenHeight: this.config.screenHeight,
      objectSize: this.config.objectSize,
      fallSpeed: gameState.difficulty.fallSpeed,
      spawnRate: gameState.difficulty.spawnRate,
    });

    this.session = {
      id: sessionId,
      seed,
      rng,
      state: 'READY',
      gameState,
      objects: [],
      spawnManager,
      lastUpdateTime: Date.now(),
      countdownTime: 3000, // 3 second countdown
      isPaused: false,
      tapHistory: [],
      actions: [],
      stateHash: this.calculateStateHash(gameState),
    };

    this.notifyStateChange();
    return this.session;
  }

  /**
   * Start countdown
   */
  startCountdown() {
    if (!this.session || this.session.state !== 'READY') return;
    
    // Reset countdown time to ensure fresh start
    this.session.countdownTime = 3000; // 3 second countdown
    this.session.state = 'COUNTDOWN';
    this.session.lastUpdateTime = Date.now();
    
    console.log('🕐 Starting countdown with', this.session.countdownTime, 'ms');
    
    this.notifyStateChange();
    this.startGameLoop();
  }

  /**
   * Start main game
   */
  startGame() {
    if (!this.session || this.session.state !== 'COUNTDOWN') return;
    
    console.log('🚀 Starting game! Countdown finished.');
    
    this.session.state = 'RUNNING';
    this.session.gameState.gameStartTime = Date.now();
    this.session.lastUpdateTime = Date.now();
    this.notifyStateChange();
  }

  /**
   * Pause game
   */
  pauseGame() {
    if (!this.session || this.session.state !== 'RUNNING') return;
    
    this.session.state = 'PAUSED';
    this.session.isPaused = true;
    this.notifyStateChange();
  }

  /**
   * Resume game
   */
  resumeGame() {
    if (!this.session || this.session.state !== 'PAUSED') return;
    
    this.session.state = 'RUNNING';
    this.session.isPaused = false;
    this.session.lastUpdateTime = Date.now();
    this.notifyStateChange();
  }

  /**
   * Handle tap input
   */
  handleTap(position: { x: number; y: number }): boolean {
    if (!this.session || this.session.state !== 'RUNNING') return false;

    const tapTime = Date.now();
    const tappedObjects = findTappedObjects(this.session.objects, position);
    
    let tapResult: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss' = 'miss';
    let targetId: string | undefined;
    let giftCardType: string | undefined;

    if (tappedObjects.length > 0) {
      const target = tappedObjects[0];
      targetId = target.id;
      tapResult = target.type;
      giftCardType = target.cardType;
      
      // Mark object as inactive
      target.isActive = false;
    }

    // Process tap in game logic
    const result = processTap(this.session.gameState, tapResult, giftCardType);
    this.session.gameState = applyTapResult(this.session.gameState, result);

    // Record tap event
    const tapEvent: TapEvent = {
      timestamp: tapTime,
      position,
      targetId,
      result: tapResult,
    };
    this.session.tapHistory.push(tapEvent);

    // Track action for game over stats
    this.session.actions.push({
      type: tapResult,
      timestamp: tapTime,
    });

    // Record action on blockchain (async, don't wait for result)
    if (this.contractManager && tapResult !== 'miss') {
      this.contractManager.recordGameAction(this.session.id, tapResult, result.points)
        .then(txHash => {
          console.log('✅ Action recorded on-chain:', tapResult, txHash);
        })
        .catch(error => {
          console.warn('⚠️ Failed to record action on-chain:', tapResult, error);
        });
    }

    // Update state hash
    this.session.stateHash = this.calculateStateHash(this.session.gameState);

    return tapResult !== 'miss';
  }

  /**
   * Main game loop
   */
  private startGameLoop() {
    // Clear any existing animation frame to prevent multiple loops
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const update = () => {
      if (!this.session) return;

      const currentTime = Date.now();
      const deltaTime = currentTime - this.session.lastUpdateTime;
      this.session.lastUpdateTime = currentTime;

      let stateChanged = false;

      // Handle countdown
      if (this.session.state === 'COUNTDOWN') {
        this.session.countdownTime -= deltaTime;
        
        // Notify update immediately for smooth countdown animation
        if (this.onGameUpdate) {
          this.onGameUpdate(this.session);
        }
        
        if (this.session.countdownTime <= 0) {
          this.startGame();
          stateChanged = true;
        }
      }

      // Handle running game
      if (this.session.state === 'RUNNING' && !this.session.isPaused) {
        this.updateGame(deltaTime);
      }

      // Continue loop if game is active
      if (['COUNTDOWN', 'RUNNING', 'PAUSED'].includes(this.session.state)) {
        this.animationFrameId = requestAnimationFrame(update);
      }

      // Notify update for non-countdown states
      if (this.session.state !== 'COUNTDOWN' && this.onGameUpdate) {
        this.onGameUpdate(this.session);
      }

      // Notify state change if state actually changed
      if (stateChanged && this.onStateChange) {
        this.onStateChange(this.session.state, this.session);
      }
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  /**
   * Update game logic
   */
  private updateGame(deltaTime: number) {
    if (!this.session) return;

    // Update game state
    this.session.gameState = updateGameState(this.session.gameState, deltaTime);

    // Get current modifiers
    const modifiers = getGameModifiers(this.session.gameState);

    // Update spawn manager config
    this.session.spawnManager.updateConfig({
      fallSpeed: this.session.gameState.difficulty.fallSpeed * modifiers.slowMotion,
      spawnRate: this.session.gameState.difficulty.spawnRate * (modifiers.swarmActive ? 3 : 1),
    });

    // Spawn new objects
    const newObjects = this.session.spawnManager.update(
      Date.now(),
      {
        spawnRate: modifiers.swarmActive ? 3 : 1,
        timeFrozen: modifiers.timeFrozen,
      }
    );
    this.session.objects.push(...newObjects);

    // Update existing objects
    if (!modifiers.timeFrozen) {
      this.session.objects = this.session.objects
        .map(obj => updateGameObject(obj, deltaTime * modifiers.slowMotion))
        .filter(obj => obj.isActive && !isOffScreen(obj, this.config.screenHeight));
    }

    // Apply size modifier if shrink ray is active
    if (modifiers.shrinkRay !== 1.0) {
      this.session.objects = this.session.objects.map(obj => ({
        ...obj,
        size: {
          x: this.config.objectSize.x * modifiers.shrinkRay,
          y: this.config.objectSize.y * modifiers.shrinkRay,
        },
      }));
    }

    // Check for game over
    if (isGameOver(this.session.gameState)) {
      this.endGame();
    }

    // Update state hash
    this.session.stateHash = this.calculateStateHash(this.session.gameState);
  }

  /**
   * End game
   */
  private endGame() {
    if (!this.session) return;

    console.log('🏁 Game ending, final score:', this.session.gameState.score);
    
    // Finish session on blockchain (async)
    if (this.contractManager) {
      this.contractManager.finishGameSession(this.session)
        .then(txHash => {
          console.log('✅ Game session finished on-chain:', txHash);
        })
        .catch(error => {
          console.error('❌ Failed to finish game session on-chain:', error);
        });
    }

    this.session.state = 'FINISHED';
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyStateChange();
  }

  /**
   * Show summary
   */
  showSummary() {
    if (!this.session || this.session.state !== 'FINISHED') return;
    
    this.session.state = 'SUMMARY';
    this.notifyStateChange();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.session = null;
  }

  /**
   * Get current session
   */
  getCurrentSession(): GameSession | null {
    return this.session;
  }

  /**
   * Calculate state hash for anti-cheat verification
   */
  private calculateStateHash(gameState: GameState): string {
    const data = {
      score: gameState.score,
      lives: gameState.lives,
      timeLeft: Math.floor(gameState.timeLeft),
      combo: Math.floor(gameState.combo * 10), // Avoid floating point precision issues
      streak: gameState.streak,
    };
    
    // Simple hash function (in production, use crypto)
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Notify state change
   */
  private notifyStateChange() {
    if (this.session && this.onStateChange) {
      this.onStateChange(this.session.state, this.session);
    }
  }

  /**
   * Get countdown display
   */
  getCountdownDisplay(): string {
    if (!this.session || this.session.state !== 'COUNTDOWN') return '';
    
    const seconds = Math.ceil(this.session.countdownTime / 1000);
    if (seconds <= 0) return 'GO!';
    return seconds.toString();
  }

  /**
   * Export session data for server validation
   */
  exportSessionData() {
    if (!this.session) return null;

    return {
      sessionId: this.session.id,
      seed: this.session.seed,
      finalState: this.session.gameState,
      tapHistory: this.session.tapHistory,
      stateHash: this.session.stateHash,
    };
  }
}
