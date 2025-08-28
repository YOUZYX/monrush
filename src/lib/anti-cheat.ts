/**
 * Anti-cheat utilities and validation functions
 * Server-side enforcement of game rules and constraints
 */

import crypto from 'crypto';
import { GameState } from './game-logic';

// Anti-cheat constants
export const ANTI_CHEAT_CONFIG = {
  MIN_TAP_INTERVAL: 50, // Minimum milliseconds between taps
  MAX_COMBO_MULTIPLIER: 5.0, // Maximum combo multiplier allowed
  MAX_SCORE_PER_TAP: 50, // Maximum points possible in a single tap
  MAX_ACTIONS_PER_SECOND: 20, // Maximum actions per second
  MAX_GAME_DURATION: 120000, // Maximum game duration in milliseconds
  POSITION_BOUNDS: {
    minX: 0,
    maxX: 800,
    minY: 0,
    maxY: 600,
  },
  STATE_HASH_TOLERANCE: 10, // Allowed score difference for state hash validation
} as const;

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Validate tap timing to prevent inhuman clicking speeds
 */
export function validateTapTiming(
  currentTimestamp: number, 
  lastTimestamp: number
): ValidationResult {
  const timeDiff = currentTimestamp - lastTimestamp;
  
  if (timeDiff < ANTI_CHEAT_CONFIG.MIN_TAP_INTERVAL) {
    return {
      isValid: false,
      reason: `Tap too fast: ${timeDiff}ms (minimum: ${ANTI_CHEAT_CONFIG.MIN_TAP_INTERVAL}ms)`,
      severity: 'high'
    };
  }
  
  return { isValid: true, severity: 'low' };
}

/**
 * Validate tap position is within game bounds
 */
export function validateTapPosition(position: { x: number; y: number }): ValidationResult {
  const { minX, maxX, minY, maxY } = ANTI_CHEAT_CONFIG.POSITION_BOUNDS;
  
  if (position.x < minX || position.x > maxX || position.y < minY || position.y > maxY) {
    return {
      isValid: false,
      reason: `Position out of bounds: (${position.x}, ${position.y})`,
      severity: 'medium'
    };
  }
  
  return { isValid: true, severity: 'low' };
}

/**
 * Validate game state constraints (combo, score limits)
 */
export function validateGameState(gameState: GameState): ValidationResult {
  // Check combo multiplier limit
  if (gameState.combo > ANTI_CHEAT_CONFIG.MAX_COMBO_MULTIPLIER) {
    return {
      isValid: false,
      reason: `Combo multiplier exceeds limit: ${gameState.combo} > ${ANTI_CHEAT_CONFIG.MAX_COMBO_MULTIPLIER}`,
      severity: 'high'
    };
  }
  
  // Check for negative values (impossible states)
  if (gameState.score < 0 || gameState.lives < 0 || gameState.combo < 1.0) {
    return {
      isValid: false,
      reason: `Invalid game state values: score=${gameState.score}, lives=${gameState.lives}, combo=${gameState.combo}`,
      severity: 'high'
    };
  }
  
  // Check streak consistency with combo
  const expectedCombo = Math.min(1.0 + Math.floor(gameState.streak / 5) * 0.5, ANTI_CHEAT_CONFIG.MAX_COMBO_MULTIPLIER);
  if (Math.abs(gameState.combo - expectedCombo) > 0.1) {
    return {
      isValid: false,
      reason: `Combo/streak mismatch: combo=${gameState.combo}, expected=${expectedCombo}, streak=${gameState.streak}`,
      severity: 'medium'
    };
  }
  
  return { isValid: true, severity: 'low' };
}

/**
 * Validate action rate to prevent spam
 */
export function validateActionRate(
  actions: Array<{ timestamp: number }>,
  timeWindow: number = 1000
): ValidationResult {
  if (actions.length === 0) return { isValid: true, severity: 'low' };
  
  // Count actions in the last time window
  const now = Date.now();
  const recentActions = actions.filter(action => 
    now - action.timestamp <= timeWindow
  );
  
  const actionsPerSecond = (recentActions.length / timeWindow) * 1000;
  
  if (actionsPerSecond > ANTI_CHEAT_CONFIG.MAX_ACTIONS_PER_SECOND) {
    return {
      isValid: false,
      reason: `Action rate too high: ${actionsPerSecond.toFixed(1)}/s (max: ${ANTI_CHEAT_CONFIG.MAX_ACTIONS_PER_SECOND}/s)`,
      severity: 'high'
    };
  }
  
  return { isValid: true, severity: 'low' };
}

/**
 * Validate session timing constraints
 */
export function validateSessionTiming(
  actionTimestamp: number,
  sessionStartTime: number
): ValidationResult {
  const sessionDuration = actionTimestamp - sessionStartTime;
  
  if (sessionDuration < 0) {
    return {
      isValid: false,
      reason: `Action timestamp before session start`,
      severity: 'high'
    };
  }
  
  if (sessionDuration > ANTI_CHEAT_CONFIG.MAX_GAME_DURATION) {
    return {
      isValid: false,
      reason: `Action after maximum game duration: ${sessionDuration}ms`,
      severity: 'medium'
    };
  }
  
  return { isValid: true, severity: 'low' };
}

/**
 * Generate deterministic state hash for verification
 */
export function generateStateHash(gameState: GameState, actionCount: number): string {
  const stateData = {
    score: Math.round(gameState.score), // Round to avoid floating point differences
    lives: gameState.lives,
    combo: Math.round(gameState.combo * 100) / 100, // Round to 2 decimal places
    streak: gameState.streak,
    actionCount,
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stateData))
    .digest('hex')
    .substring(0, 16); // First 16 characters for brevity
}

/**
 * Validate state hash consistency
 */
export function validateStateHash(
  serverHash: string,
  clientHash: string | null,
  tolerance: number = ANTI_CHEAT_CONFIG.STATE_HASH_TOLERANCE
): ValidationResult {
  if (!clientHash) {
    return { isValid: true, severity: 'low' }; // No client hash to compare
  }
  
  if (serverHash !== clientHash) {
    return {
      isValid: false,
      reason: `State hash mismatch: server=${serverHash}, client=${clientHash}`,
      severity: 'medium'
    };
  }
  
  return { isValid: true, severity: 'low' };
}

/**
 * Comprehensive action validation
 */
export function validateAction(
  action: {
    timestamp: number;
    position: { x: number; y: number };
    type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
  },
  context: {
    lastActionTimestamp: number;
    sessionStartTime: number;
    gameState: GameState;
  }
): ValidationResult {
  // Validate timing
  const timingResult = validateTapTiming(action.timestamp, context.lastActionTimestamp);
  if (!timingResult.isValid) return timingResult;
  
  // Validate position
  const positionResult = validateTapPosition(action.position);
  if (!positionResult.isValid) return positionResult;
  
  // Validate session timing
  const sessionResult = validateSessionTiming(action.timestamp, context.sessionStartTime);
  if (!sessionResult.isValid) return sessionResult;
  
  // Validate game state
  const stateResult = validateGameState(context.gameState);
  if (!stateResult.isValid) return stateResult;
  
  return { isValid: true, severity: 'low' };
}

/**
 * Card effect duration enforcement
 * Prevents client from extending card effects beyond server limits
 */
export function enforceCardDuration(
  cardType: string,
  activationTime: number,
  currentTime: number
): boolean {
  const durations: Record<string, number> = {
    'time-freeze': 5000,
    'slow-motion': 7000,
    'golden-monad': 0, // Instant effect
    'extra-time': 0, // Instant effect
    'logo-highlight': 5000,
    'bomb-trap': 0, // Instant effect
    'shrink-ray': 4000,
    'monad-swarm': 3000,
    'glitch-purge': 0, // Instant effect
  };
  
  const maxDuration = durations[cardType] || 0;
  return (currentTime - activationTime) <= maxDuration + 100; // 100ms tolerance
}

/**
 * Risk assessment based on validation results
 */
export function assessRisk(validationResults: ValidationResult[]): {
  riskLevel: 'low' | 'medium' | 'high';
  shouldReject: boolean;
  reasons: string[];
} {
  const failedValidations = validationResults.filter(result => !result.isValid);
  const highSeverity = failedValidations.filter(result => result.severity === 'high');
  const mediumSeverity = failedValidations.filter(result => result.severity === 'medium');
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let shouldReject = false;
  
  if (highSeverity.length > 0) {
    riskLevel = 'high';
    shouldReject = true;
  } else if (mediumSeverity.length > 2) {
    riskLevel = 'high';
    shouldReject = true;
  } else if (mediumSeverity.length > 0 || failedValidations.length > 3) {
    riskLevel = 'medium';
    shouldReject = mediumSeverity.length > 1;
  }
  
  return {
    riskLevel,
    shouldReject,
    reasons: failedValidations.map(result => result.reason || 'Unknown validation error'),
  };
}
