/**
 * Unit tests for game logic functions
 * Testing scoring, combo system, difficulty scaling, and magic card effects
 */

import {
  createInitialGameState,
  calculatePoints,
  updateCombo,
  processTap,
  applyTapResult,
  updateGameState,
  isGameOver,
  updateDifficulty,
  createMagicCardEffect,
  updateActiveEffects,
  getGameModifiers,
  GAME_CONFIG,
} from '../game-logic';

describe('Game Logic', () => {
  describe('Initial Game State', () => {
    it('should create initial game state with correct values', () => {
      const state = createInitialGameState();
      
      expect(state.score).toBe(0);
      expect(state.lives).toBe(GAME_CONFIG.INITIAL_LIVES);
      expect(state.timeLeft).toBe(GAME_CONFIG.GAME_DURATION);
      expect(state.combo).toBe(1.0);
      expect(state.streak).toBe(0);
      expect(state.difficulty.level).toBe(0);
      expect(state.activeEffects).toEqual([]);
    });
  });

  describe('Scoring System', () => {
    it('should calculate points correctly with base combo', () => {
      expect(calculatePoints(1.0)).toBe(10);
      expect(calculatePoints(2.0)).toBe(20);
      expect(calculatePoints(5.0)).toBe(50);
    });

    it('should triple points with golden effect', () => {
      expect(calculatePoints(1.0, true)).toBe(30);
      expect(calculatePoints(2.0, true)).toBe(60);
    });
  });

  describe('Combo System', () => {
    it('should increase combo every 5 streak points', () => {
      expect(updateCombo(0)).toBe(1.0);
      expect(updateCombo(4)).toBe(1.0);
      expect(updateCombo(5)).toBe(1.5);
      expect(updateCombo(10)).toBe(2.0);
      expect(updateCombo(15)).toBe(2.5);
      expect(updateCombo(20)).toBe(3.0);
    });

    it('should cap combo at maximum value', () => {
      expect(updateCombo(50)).toBe(GAME_CONFIG.MAX_COMBO);
      expect(updateCombo(100)).toBe(GAME_CONFIG.MAX_COMBO);
    });
  });

  describe('Tap Processing', () => {
    let initialState: ReturnType<typeof createInitialGameState>;

    beforeEach(() => {
      initialState = createInitialGameState();
    });

    it('should process logo tap correctly', () => {
      const result = processTap(initialState, 'logo');
      
      expect(result.type).toBe('logo');
      expect(result.points).toBe(10);
      expect(result.newStreak).toBe(1);
      expect(result.newCombo).toBe(1.0);
      expect(result.livesLost).toBe(0);
    });

    it('should process glitch tap correctly', () => {
      const result = processTap(initialState, 'glitch');
      
      expect(result.type).toBe('glitch');
      expect(result.points).toBe(0);
      expect(result.newStreak).toBe(0);
      expect(result.newCombo).toBe(1.0);
      expect(result.livesLost).toBe(1);
    });

    it('should process gift tap correctly', () => {
      const result = processTap(initialState, 'gift', 'time-freeze');
      
      expect(result.type).toBe('gift');
      expect(result.points).toBe(0);
      expect(result.newStreak).toBe(initialState.streak);
      expect(result.newCombo).toBe(initialState.combo);
      expect(result.livesLost).toBe(0);
      expect(result.effect).toBeDefined();
      expect(result.effect?.type).toBe('time-freeze');
    });

    it('should process miss correctly', () => {
      const result = processTap(initialState, 'miss');
      
      expect(result.type).toBe('miss');
      expect(result.points).toBe(0);
      expect(result.newStreak).toBe(0);
      expect(result.newCombo).toBe(1.0);
      expect(result.livesLost).toBe(1);
    });
  });

  describe('State Application', () => {
    it('should apply tap result correctly', () => {
      const initialState = createInitialGameState();
      const tapResult = processTap(initialState, 'logo');
      const newState = applyTapResult(initialState, tapResult);
      
      expect(newState.score).toBe(10);
      expect(newState.streak).toBe(1);
      expect(newState.lives).toBe(GAME_CONFIG.INITIAL_LIVES);
    });

    it('should not allow negative score', () => {
      const initialState = createInitialGameState();
      const tapResult = {
        type: 'logo' as const,
        points: -100,
        newCombo: 1.0,
        newStreak: 0,
        livesLost: 0,
      };
      const newState = applyTapResult(initialState, tapResult);
      
      expect(newState.score).toBe(0);
    });

    it('should not allow negative lives', () => {
      const initialState = createInitialGameState();
      initialState.lives = 1;
      const tapResult = processTap(initialState, 'glitch');
      const newState = applyTapResult(initialState, tapResult);
      
      expect(newState.lives).toBe(0);
    });
  });

  describe('Difficulty Scaling', () => {
    it('should increase difficulty over time', () => {
      const level0 = updateDifficulty(0);
      const level1 = updateDifficulty(30);
      const level2 = updateDifficulty(60);
      
      expect(level1.level).toBe(1);
      expect(level1.fallSpeed).toBeGreaterThan(level0.fallSpeed);
      expect(level1.spawnRate).toBeGreaterThan(level0.spawnRate);
      
      expect(level2.level).toBe(2);
      expect(level2.fallSpeed).toBeGreaterThan(level1.fallSpeed);
      expect(level2.spawnRate).toBeGreaterThan(level1.spawnRate);
    });
  });

  describe('Magic Card Effects', () => {
    it('should create time-freeze effect', () => {
      const effect = createMagicCardEffect('time-freeze');
      
      expect(effect.type).toBe('time-freeze');
      expect(effect.duration).toBe(5000);
    });

    it('should create slow-motion effect with value', () => {
      const effect = createMagicCardEffect('slow-motion');
      
      expect(effect.type).toBe('slow-motion');
      expect(effect.duration).toBe(7000);
      expect(effect.value).toBe(0.5);
    });

    it('should create instant effects with duration 0', () => {
      const goldenEffect = createMagicCardEffect('golden-monad');
      const extraTimeEffect = createMagicCardEffect('extra-time');
      const bombEffect = createMagicCardEffect('bomb-trap');
      
      expect(goldenEffect.duration).toBe(0);
      expect(extraTimeEffect.duration).toBe(0);
      expect(extraTimeEffect.value).toBe(10);
      expect(bombEffect.duration).toBe(0);
      expect(bombEffect.value).toBe(-20);
    });
  });

  describe('Active Effects Management', () => {
    it('should update effect durations', () => {
      const effects = [
        createMagicCardEffect('time-freeze'),
        createMagicCardEffect('slow-motion'),
      ];
      
      const updatedEffects = updateActiveEffects(effects, 1000);
      
      expect(updatedEffects[0].duration).toBe(4000);
      expect(updatedEffects[1].duration).toBe(6000);
    });

    it('should remove expired effects', () => {
      const effects = [
        { type: 'time-freeze', duration: 500, startTime: Date.now() },
        { type: 'slow-motion', duration: 2000, startTime: Date.now() },
      ];
      
      const updatedEffects = updateActiveEffects(effects, 1000);
      
      expect(updatedEffects).toHaveLength(1);
      expect(updatedEffects[0].type).toBe('slow-motion');
    });

    it('should keep golden-monad effect even with 0 duration', () => {
      const effects = [
        { type: 'golden-monad', duration: 0, startTime: Date.now() },
      ];
      
      const updatedEffects = updateActiveEffects(effects, 1000);
      
      expect(updatedEffects).toHaveLength(1);
      expect(updatedEffects[0].type).toBe('golden-monad');
    });
  });

  describe('Game Modifiers', () => {
    it('should extract correct modifiers from effects', () => {
      const state = createInitialGameState();
      state.activeEffects = [
        { type: 'slow-motion', duration: 5000, value: 0.5, startTime: Date.now() },
        { type: 'shrink-ray', duration: 3000, value: 0.5, startTime: Date.now() },
        { type: 'logo-highlight', duration: 4000, startTime: Date.now() },
        { type: 'time-freeze', duration: 2000, startTime: Date.now() },
        { type: 'monad-swarm', duration: 1000, startTime: Date.now() },
      ];
      
      const modifiers = getGameModifiers(state);
      
      expect(modifiers.slowMotion).toBe(0.5);
      expect(modifiers.shrinkRay).toBe(0.5);
      expect(modifiers.logoHighlight).toBe(true);
      expect(modifiers.timeFrozen).toBe(true);
      expect(modifiers.swarmActive).toBe(true);
    });

    it('should return default modifiers when no effects', () => {
      const state = createInitialGameState();
      const modifiers = getGameModifiers(state);
      
      expect(modifiers.slowMotion).toBe(1.0);
      expect(modifiers.shrinkRay).toBe(1.0);
      expect(modifiers.logoHighlight).toBe(false);
      expect(modifiers.timeFrozen).toBe(false);
      expect(modifiers.swarmActive).toBe(false);
    });
  });

  describe('Game Over Conditions', () => {
    it('should detect game over when time runs out', () => {
      const state = createInitialGameState();
      state.timeLeft = 0;
      
      expect(isGameOver(state)).toBe(true);
    });

    it('should detect game over when lives run out', () => {
      const state = createInitialGameState();
      state.lives = 0;
      
      expect(isGameOver(state)).toBe(true);
    });

    it('should not detect game over when game is active', () => {
      const state = createInitialGameState();
      
      expect(isGameOver(state)).toBe(false);
    });
  });

  describe('Game State Updates', () => {
    it('should update time correctly', () => {
      const state = createInitialGameState();
      const updatedState = updateGameState(state, 1000);
      
      expect(updatedState.timeLeft).toBe(119);
    });

    it('should not update time when frozen', () => {
      const state = createInitialGameState();
      state.activeEffects = [
        { type: 'time-freeze', duration: 5000, startTime: Date.now() },
      ];
      
      const updatedState = updateGameState(state, 1000);
      
      expect(updatedState.timeLeft).toBe(120);
    });

    it('should update difficulty based on elapsed time', () => {
      const state = createInitialGameState();
      state.gameStartTime = Date.now() - 35000; // 35 seconds ago
      
      const updatedState = updateGameState(state, 1000);
      
      expect(updatedState.difficulty.level).toBe(1);
    });
  });
});
