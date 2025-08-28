/**
 * Unit tests for RNG functions
 * Testing deterministic behavior and game-specific utilities
 */

import { XORShift32, GameRNG, createSessionRNG } from '../rng';

describe('XORShift32 RNG', () => {
  describe('Deterministic Behavior', () => {
    it('should produce consistent results with same seed', () => {
      const rng1 = new XORShift32(12345);
      const rng2 = new XORShift32(12345);
      
      for (let i = 0; i < 10; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should produce different results with different seeds', () => {
      const rng1 = new XORShift32(12345);
      const rng2 = new XORShift32(54321);
      
      const results1 = Array.from({ length: 10 }, () => rng1.next());
      const results2 = Array.from({ length: 10 }, () => rng2.next());
      
      expect(results1).not.toEqual(results2);
    });

    it('should handle seed 0 by converting to 1', () => {
      const rng = new XORShift32(0);
      expect(rng.getState()).toBe(1);
    });
  });

  describe('Float Generation', () => {
    it('should generate floats between 0 and 1', () => {
      const rng = new XORShift32(12345);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe('Integer Range Generation', () => {
    it('should generate integers in specified range', () => {
      const rng = new XORShift32(12345);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(5, 15);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThan(15);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe('Float Range Generation', () => {
    it('should generate floats in specified range', () => {
      const rng = new XORShift32(12345);
      
      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloatRange(2.5, 7.5);
        expect(value).toBeGreaterThanOrEqual(2.5);
        expect(value).toBeLessThanOrEqual(7.5);
      }
    });
  });

  describe('Array Choice', () => {
    it('should choose elements from array', () => {
      const rng = new XORShift32(12345);
      const array = ['a', 'b', 'c', 'd', 'e'];
      
      for (let i = 0; i < 50; i++) {
        const choice = rng.choice(array);
        expect(array).toContain(choice);
      }
    });

    it('should distribute choices reasonably', () => {
      const rng = new XORShift32(12345);
      const array = ['a', 'b', 'c'];
      const counts = { a: 0, b: 0, c: 0 };
      
      for (let i = 0; i < 300; i++) {
        const choice = rng.choice(array) as keyof typeof counts;
        counts[choice]++;
      }
      
      // Each should be chosen at least 50 times out of 300 (rough distribution test)
      expect(counts.a).toBeGreaterThan(50);
      expect(counts.b).toBeGreaterThan(50);
      expect(counts.c).toBeGreaterThan(50);
    });
  });

  describe('Probability Chance', () => {
    it('should return true/false based on probability', () => {
      const rng = new XORShift32(12345);
      
      // Test 0% chance
      for (let i = 0; i < 20; i++) {
        expect(rng.chance(0)).toBe(false);
      }
      
      // Test 100% chance
      for (let i = 0; i < 20; i++) {
        expect(rng.chance(1)).toBe(true);
      }
    });

    it('should approximate expected probability', () => {
      const rng = new XORShift32(12345);
      const trials = 1000;
      let successes = 0;
      
      for (let i = 0; i < trials; i++) {
        if (rng.chance(0.3)) successes++;
      }
      
      const actualProbability = successes / trials;
      expect(actualProbability).toBeCloseTo(0.3, 1); // Within 0.1 of expected
    });
  });

  describe('State Management', () => {
    it('should get and set state correctly', () => {
      const rng = new XORShift32(12345);
      const initialState = rng.getState();
      
      rng.next(); // Change state
      const newState = rng.getState();
      expect(newState).not.toBe(initialState);
      
      rng.setState(initialState);
      expect(rng.getState()).toBe(initialState);
    });
  });
});

describe('GameRNG', () => {
  let gameRng: GameRNG;

  beforeEach(() => {
    gameRng = new GameRNG(12345);
  });

  describe('Spawn Position', () => {
    it('should generate valid spawn positions', () => {
      const screenWidth = 800;
      const objectWidth = 64;
      
      for (let i = 0; i < 50; i++) {
        const x = gameRng.spawnX(screenWidth, objectWidth);
        expect(x).toBeGreaterThanOrEqual(objectWidth / 2);
        expect(x).toBeLessThanOrEqual(screenWidth - objectWidth / 2);
      }
    });
  });

  describe('Spawn Delay', () => {
    it('should generate delays with variation', () => {
      const baseDelay = 1000;
      const delays: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        delays.push(gameRng.spawnDelay(baseDelay));
      }
      
      // Check that we get variation (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(10);
      
      // Check that delays are within expected range (70% to 130% of base)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(700);
        expect(delay).toBeLessThanOrEqual(1300);
      });
    });
  });

  describe('Object Type Generation', () => {
    it('should generate object types with correct distribution', () => {
      const counts = { logo: 0, glitch: 0, gift: 0 };
      const iterations = 1000;
      
      for (let i = 0; i < iterations; i++) {
        const type = gameRng.objectType();
        counts[type]++;
      }
      
      // Expected: 70% logos, 25% glitches, 5% gifts
      expect(counts.logo / iterations).toBeCloseTo(0.7, 1);
      expect(counts.glitch / iterations).toBeCloseTo(0.25, 1);
      expect(counts.gift / iterations).toBeCloseTo(0.05, 1);
    });
  });

  describe('Magic Card Generation', () => {
    it('should generate valid magic card types', () => {
      const validCards = [
        'time-freeze', 'slow-motion', 'golden-monad', 'extra-time', 'logo-highlight',
        'bomb-trap', 'shrink-ray', 'monad-swarm', 'glitch-purge'
      ];
      
      for (let i = 0; i < 50; i++) {
        const card = gameRng.magicCard();
        expect(validCards).toContain(card);
      }
    });

    it('should distribute card types', () => {
      const cardCounts = new Map<string, number>();
      
      for (let i = 0; i < 500; i++) {
        const card = gameRng.magicCard();
        cardCounts.set(card, (cardCounts.get(card) || 0) + 1);
      }
      
      // Should have generated multiple different card types
      expect(cardCounts.size).toBeGreaterThan(5);
    });
  });

  describe('Fall Speed Generation', () => {
    it('should generate speeds with variation', () => {
      const baseSpeed = 200;
      const speeds: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        speeds.push(gameRng.fallSpeed(baseSpeed));
      }
      
      // Check variation exists
      const uniqueSpeeds = new Set(speeds);
      expect(uniqueSpeeds.size).toBeGreaterThan(10);
      
      // Check speeds are within expected range (80% to 120% of base)
      speeds.forEach(speed => {
        expect(speed).toBeGreaterThanOrEqual(160);
        expect(speed).toBeLessThanOrEqual(240);
      });
    });
  });
});

describe('Session RNG Creation', () => {
  it('should create consistent RNG from same session data', () => {
    const sessionId = 'test-session-123';
    const timestamp = 1640995200000;
    
    const rng1 = createSessionRNG(sessionId, timestamp);
    const rng2 = createSessionRNG(sessionId, timestamp);
    
    // Should generate same sequence
    for (let i = 0; i < 10; i++) {
      expect(rng1.getState()).toBe(rng2.getState());
      rng1.spawnX(800, 64);
      rng2.spawnX(800, 64);
    }
  });

  it('should create different RNG from different session data', () => {
    const rng1 = createSessionRNG('session-1', 1640995200000);
    const rng2 = createSessionRNG('session-2', 1640995200000);
    const rng3 = createSessionRNG('session-1', 1640995300000);
    
    const states = [rng1.getState(), rng2.getState(), rng3.getState()];
    
    // All should be different
    expect(states[0]).not.toBe(states[1]);
    expect(states[0]).not.toBe(states[2]);
    expect(states[1]).not.toBe(states[2]);
  });
});
