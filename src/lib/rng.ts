/**
 * Deterministic Random Number Generator using XORShift32
 * Ensures consistent game behavior across client and server
 */

export class XORShift32 {
  private state: number;

  constructor(seed: number) {
    // Ensure seed is never 0 (XORShift requires non-zero state)
    this.state = seed === 0 ? 1 : seed >>> 0; // Convert to unsigned 32-bit
  }

  /**
   * Generate next random number (0 to 2^32 - 1)
   */
  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return this.state >>> 0; // Convert to unsigned 32-bit
  }

  /**
   * Generate random float between 0 and 1
   */
  nextFloat(): number {
    return this.next() / 0x100000000; // 2^32
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }

  /**
   * Generate random float between min and max
   */
  nextFloatRange(min: number, max: number): number {
    return this.nextFloat() * (max - min) + min;
  }

  /**
   * Choose random element from array
   */
  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Generate random boolean with given probability
   */
  chance(probability: number): boolean {
    return this.nextFloat() < probability;
  }

  /**
   * Get current state for checksum/verification
   */
  getState(): number {
    return this.state;
  }

  /**
   * Set state (for testing/verification)
   */
  setState(state: number): void {
    this.state = state >>> 0;
  }
}

/**
 * Utility functions for game-specific random generation
 */
export class GameRNG {
  private rng: XORShift32;

  constructor(seed: number) {
    this.rng = new XORShift32(seed);
  }

  /**
   * Direct access to nextInt method
   */
  nextInt(min: number, max: number): number {
    return this.rng.nextInt(min, max);
  }

  /**
   * Direct access to nextFloat method
   */
  nextFloat(): number {
    return this.rng.nextFloat();
  }

  /**
   * Generate spawn position for falling objects
   */
  spawnX(screenWidth: number, objectWidth: number): number {
    return this.rng.nextInt(objectWidth / 2, screenWidth - objectWidth / 2);
  }

  /**
   * Generate spawn timing variation
   */
  spawnDelay(baseDelay: number, variation: number = 0.3): number {
    const min = baseDelay * (1 - variation);
    const max = baseDelay * (1 + variation);
    return this.rng.nextFloatRange(min, max);
  }

  /**
   * Generate object type based on probabilities
   */
  objectType(): 'logo' | 'glitch' | 'gift' | 'bomb' {
    const rand = this.rng.nextFloat();
    if (rand < 0.55) return 'logo';      // 55% Monad Logos
    if (rand < 0.80) return 'glitch';    // 25% Glitches  
    if (rand < 0.85) return 'gift';      // 5% Gift Boxes
    return 'bomb';                       // 15% Bombs
  }

  /**
   * Generate random magic card type
   */
  magicCard(): string {
    const cards = [
      'time-freeze', 'slow-motion', 'golden-monad', 'extra-time', 'logo-highlight',
      'bomb-trap', 'shrink-ray',
      'monad-swarm', 'glitch-purge'
    ];
    return this.rng.choice(cards);
  }

  /**
   * Generate falling speed with variation
   */
  fallSpeed(baseSpeed: number, variation: number = 0.2): number {
    const min = baseSpeed * (1 - variation);
    const max = baseSpeed * (1 + variation);
    return this.rng.nextFloatRange(min, max);
  }

  /**
   * Get state for verification
   */
  getState(): number {
    return this.rng.getState();
  }

  /**
   * Set state for testing
   */
  setState(state: number): void {
    this.rng.setState(state);
  }
}

/**
 * Create seeded RNG from session ID and timestamp
 */
export function createSessionRNG(sessionId: string, timestamp: number): GameRNG {
  // Create deterministic seed from session ID and timestamp
  let seed = timestamp;
  for (let i = 0; i < sessionId.length; i++) {
    seed = ((seed << 5) - seed + sessionId.charCodeAt(i)) & 0xffffffff;
  }
  return new GameRNG(seed);
}
