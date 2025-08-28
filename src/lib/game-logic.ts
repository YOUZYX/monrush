/**
 * Pure functions for MonadRush game logic
 * All scoring, combo, and difficulty calculations
 */

export interface GameState {
  score: number;
  lives: number;
  timeLeft: number; // seconds
  combo: number; // multiplier (1.0 to 5.0)
  streak: number; // consecutive correct taps
  gameStartTime: number;
  difficulty: {
    level: number;
    fallSpeed: number;
    spawnRate: number; // objects per second
  };
  activeEffects: ActiveEffect[];
}

export interface ActiveEffect {
  type: string;
  duration: number; // remaining time in ms
  value?: number;
  startTime: number;
}

export interface TapResult {
  type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
  points: number;
  newCombo: number;
  newStreak: number;
  livesLost: number;
  effect?: ActiveEffect;
}

// Game constants
export const GAME_CONFIG = {
  INITIAL_LIVES: 5,
  GAME_DURATION: 120, // seconds
  BASE_POINTS: 10,
  MAX_COMBO: 5.0,
  COMBO_INCREMENT: 0.5,
  STREAK_FOR_COMBO: 5,
  DIFFICULTY_RAMP_INTERVAL: 30, // seconds
  BASE_FALL_SPEED: 100, // pixels per second
  BASE_SPAWN_RATE: 1.5, // objects per second
  SPEED_INCREASE_FACTOR: 1.3,
  SPAWN_INCREASE_FACTOR: 1.2,
} as const;

/**
 * Initialize new game state
 */
export function createInitialGameState(): GameState {
  return {
    score: 0,
    lives: GAME_CONFIG.INITIAL_LIVES,
    timeLeft: GAME_CONFIG.GAME_DURATION,
    combo: 1.0,
    streak: 0,
    gameStartTime: Date.now(),
    difficulty: {
      level: 0,
      fallSpeed: GAME_CONFIG.BASE_FALL_SPEED,
      spawnRate: GAME_CONFIG.BASE_SPAWN_RATE,
    },
    activeEffects: [],
  };
}

/**
 * Calculate points for a successful logo tap
 */
export function calculatePoints(combo: number, hasGoldenEffect: boolean = false): number {
  const basePoints = GAME_CONFIG.BASE_POINTS * combo;
  return hasGoldenEffect ? basePoints * 3 : basePoints;
}

/**
 * Update combo multiplier based on streak
 */
export function updateCombo(streak: number): number {
  const comboLevel = Math.floor(streak / GAME_CONFIG.STREAK_FOR_COMBO);
  const newCombo = 1.0 + (comboLevel * GAME_CONFIG.COMBO_INCREMENT);
  return Math.min(newCombo, GAME_CONFIG.MAX_COMBO);
}

/**
 * Process a tap action and return results
 */
export function processTap(
  state: GameState, 
  tapType: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss',
  giftCardType?: string
): TapResult {
  const hasGoldenEffect = state.activeEffects.some(e => e.type === 'golden-monad');

  switch (tapType) {
    case 'logo': {
      const newStreak = state.streak + 1;
      const newCombo = updateCombo(newStreak);
      const points = calculatePoints(state.combo, hasGoldenEffect);
      
      return {
        type: 'logo',
        points,
        newCombo,
        newStreak,
        livesLost: 0,
      };
    }

    case 'glitch': {
      return {
        type: 'glitch',
        points: 0,
        newCombo: 1.0, // Reset combo
        newStreak: 0,  // Reset streak
        livesLost: 0,  // NO life lost - only reset combo/streak per spec!
      };
    }

    case 'gift': {
      const effect = createMagicCardEffect(giftCardType || 'time-freeze');
      return {
        type: 'gift',
        points: 0,
        newCombo: state.combo, // No change
        newStreak: state.streak, // No change
        livesLost: 0,
        effect,
      };
    }

    case 'bomb': {
      return {
        type: 'bomb',
        points: 0,
        newCombo: 1.0, // Reset combo
        newStreak: 0,  // Reset streak
        livesLost: 1,  // Lose 1 life - this is the actual bomb object!
      };
    }

    case 'miss': {
      return {
        type: 'miss',
        points: 0,
        newCombo: 1.0, // Reset combo
        newStreak: 0,  // Reset streak
        livesLost: 0,  // NO life lost on miss - only on glitches!
      };
    }
  }
}

/**
 * Create magic card effect
 */
export function createMagicCardEffect(cardType: string): ActiveEffect {
  const now = Date.now();
  
  switch (cardType) {
    case 'time-freeze':
      return { type: 'time-freeze', duration: 5000, startTime: now };
    
    case 'slow-motion':
      return { type: 'slow-motion', duration: 7000, value: 0.5, startTime: now };
    
    case 'golden-monad':
      return { type: 'golden-monad', duration: 0, startTime: now }; // One-time use
    
    case 'extra-time':
      return { type: 'extra-time', duration: 0, value: 10, startTime: now }; // Instant
    
    case 'logo-highlight':
      return { type: 'logo-highlight', duration: 5000, startTime: now };
    
    case 'bomb-trap':
      return { type: 'bomb-trap', duration: 0, value: -20, startTime: now }; // Instant penalty
    
    case 'shrink-ray':
      return { type: 'shrink-ray', duration: 4000, value: 0.5, startTime: now };
    
    case 'monad-swarm':
      return { type: 'monad-swarm', duration: 3000, startTime: now };
    
    case 'glitch-purge':
      return { type: 'glitch-purge', duration: 0, value: 5, startTime: now }; // Instant bonus per glitch
    
    default:
      return { type: 'time-freeze', duration: 5000, startTime: now };
  }
}

/**
 * Update difficulty based on elapsed time
 */
export function updateDifficulty(elapsedSeconds: number): GameState['difficulty'] {
  const level = Math.floor(elapsedSeconds / GAME_CONFIG.DIFFICULTY_RAMP_INTERVAL);
  
  return {
    level,
    fallSpeed: GAME_CONFIG.BASE_FALL_SPEED * Math.pow(GAME_CONFIG.SPEED_INCREASE_FACTOR, level),
    spawnRate: GAME_CONFIG.BASE_SPAWN_RATE * Math.pow(GAME_CONFIG.SPAWN_INCREASE_FACTOR, level),
  };
}

/**
 * Update active effects (remove expired ones)
 */
export function updateActiveEffects(effects: ActiveEffect[], deltaTime: number): ActiveEffect[] {
  const now = Date.now();
  return effects
    .map(effect => ({
      ...effect,
      duration: Math.max(0, effect.duration - deltaTime),
    }))
    .filter(effect => effect.duration > 0 || effect.type === 'golden-monad'); // Keep golden until used
}

/**
 * Apply game state changes from a tap result
 */
export function applyTapResult(state: GameState, result: TapResult): GameState {
  const newState = { ...state };
  
  // Update score
  newState.score = Math.max(0, newState.score + result.points);
  
  // Update combo and streak
  newState.combo = result.newCombo;
  newState.streak = result.newStreak;
  
  // Update lives
  newState.lives = Math.max(0, newState.lives - result.livesLost);
  
  // Add new effect if present
  if (result.effect) {
    if (result.effect.type === 'extra-time') {
      newState.timeLeft += result.effect.value || 0;
    } else if (result.effect.type === 'bomb-trap') {
      newState.score = Math.max(0, newState.score + (result.effect.value || 0));
    } else if (result.effect.duration > 0) {
      // Remove existing effect of same type to prevent stacking
      newState.activeEffects = newState.activeEffects.filter(e => e.type !== result.effect!.type);
      newState.activeEffects.push(result.effect);
    }
  }
  
  return newState;
}

/**
 * Update game state each frame
 */
export function updateGameState(state: GameState, deltaTime: number): GameState {
  const elapsedSeconds = (Date.now() - state.gameStartTime) / 1000;
  
  // Check if time freeze is active
  const isTimeFrozen = state.activeEffects.some(e => e.type === 'time-freeze');
  
  return {
    ...state,
    timeLeft: isTimeFrozen ? state.timeLeft : Math.max(0, state.timeLeft - deltaTime / 1000),
    difficulty: updateDifficulty(elapsedSeconds),
    activeEffects: updateActiveEffects(state.activeEffects, deltaTime),
  };
}

/**
 * Check if game is over
 */
export function isGameOver(state: GameState): boolean {
  return state.timeLeft <= 0 || state.lives <= 0;
}

/**
 * Get current game modifiers for rendering
 */
export interface GameModifiers {
  slowMotion: number; // Speed multiplier (0.5 = half speed)
  shrinkRay: number;  // Size multiplier (0.5 = half size)
  logoHighlight: boolean;
  timeFrozen: boolean;
  swarmActive: boolean;
}

export function getGameModifiers(state: GameState): GameModifiers {
  const effects = state.activeEffects;
  
  return {
    slowMotion: effects.find(e => e.type === 'slow-motion')?.value || 1.0,
    shrinkRay: effects.find(e => e.type === 'shrink-ray')?.value || 1.0,
    logoHighlight: effects.some(e => e.type === 'logo-highlight'),
    timeFrozen: effects.some(e => e.type === 'time-freeze'),
    swarmActive: effects.some(e => e.type === 'monad-swarm'),
  };
}

/**
 * Generate game summary for end screen
 */
export interface GameSummary {
  finalScore: number;
  maxCombo: number;
  longestStreak: number;
  magicCardsUsed: number;
  logosHit: number;
  glitchesHit: number;
  accuracy: number; // percentage
}

export function generateGameSummary(
  finalState: GameState,
  totalTaps: { logos: number; glitches: number; cards: number }
): GameSummary {
  const totalHits = totalTaps.logos + totalTaps.glitches;
  const accuracy = totalHits > 0 ? (totalTaps.logos / totalHits) * 100 : 0;
  
  return {
    finalScore: finalState.score,
    maxCombo: finalState.combo, // This should track historical max
    longestStreak: finalState.streak, // This should track historical max
    magicCardsUsed: totalTaps.cards,
    logosHit: totalTaps.logos,
    glitchesHit: totalTaps.glitches,
    accuracy: Math.round(accuracy * 100) / 100,
  };
}
