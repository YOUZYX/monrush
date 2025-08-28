/**
 * Physics and collision detection for MonadRush
 * Handles object spawning, movement, and AABB collision detection
 */

import { GameRNG } from './rng';
import { gameObjectPool } from './object-pool';

export interface Vector2 {
  x: number;
  y: number;
}

export interface AABB {
  x: number;      // Center X
  y: number;      // Center Y
  width: number;
  height: number;
}

export interface GameObject {
  id: string;
  type: 'logo' | 'glitch' | 'gift' | 'bomb';
  position: Vector2;
  velocity: Vector2;
  size: Vector2;
  hitbox: AABB;
  spawnTime: number;
  isActive: boolean;
  cardType?: string; // For gift boxes
}

export interface SpawnConfig {
  screenWidth: number;
  screenHeight: number;
  objectSize: Vector2;
  fallSpeed: number;
  spawnRate: number; // objects per second
}

/**
 * Create AABB from position and size
 */
export function createAABB(position: Vector2, size: Vector2): AABB {
  return {
    x: position.x,
    y: position.y,
    width: size.x,
    height: size.y,
  };
}

/**
 * Check if two AABBs overlap
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  const aLeft = a.x - a.width / 2;
  const aRight = a.x + a.width / 2;
  const aTop = a.y - a.height / 2;
  const aBottom = a.y + a.height / 2;

  const bLeft = b.x - b.width / 2;
  const bRight = b.x + b.width / 2;
  const bTop = b.y - b.height / 2;
  const bBottom = b.y + b.height / 2;

  return !(aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom);
}

/**
 * Check if point is inside AABB
 */
export function pointInAABB(point: Vector2, aabb: AABB): boolean {
  const left = aabb.x - aabb.width / 2;
  const right = aabb.x + aabb.width / 2;
  const top = aabb.y - aabb.height / 2;
  const bottom = aabb.y + aabb.height / 2;

  return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
}

/**
 * Create a new game object
 */
export function createGameObject(
  type: 'logo' | 'glitch' | 'gift' | 'bomb',
  position: Vector2,
  size: Vector2,
  fallSpeed: number,
  cardType?: string
): GameObject {
  const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    type,
    position: { ...position },
    velocity: { x: 0, y: fallSpeed },
    size: { ...size },
    hitbox: createAABB(position, size),
    spawnTime: Date.now(),
    isActive: true,
    cardType,
  };
}

/**
 * Update game object position and hitbox
 */
export function updateGameObject(obj: GameObject, deltaTime: number): GameObject {
  const newPosition = {
    x: obj.position.x + obj.velocity.x * deltaTime / 1000,
    y: obj.position.y + obj.velocity.y * deltaTime / 1000,
  };

  return {
    ...obj,
    position: newPosition,
    hitbox: createAABB(newPosition, obj.size),
  };
}

/**
 * Check if object is off screen (for cleanup)
 */
export function isOffScreen(obj: GameObject, screenHeight: number): boolean {
  return obj.position.y > screenHeight + obj.size.y / 2;
}

/**
 * Spawn manager for creating objects at intervals
 */
export class SpawnManager {
  private rng: GameRNG;
  private config: SpawnConfig;
  private lastSpawnTime: number = 0;
  private nextSpawnDelay: number = 0;

  constructor(rng: GameRNG, config: SpawnConfig) {
    this.rng = rng;
    this.config = config;
    this.calculateNextSpawn();
  }

  private calculateNextSpawn(): void {
    const baseDelay = 1000 / this.config.spawnRate; // Convert to milliseconds
    this.nextSpawnDelay = this.rng.spawnDelay(baseDelay);
  }

  /**
   * Update spawn manager and return new objects if it's time to spawn
   */
  update(currentTime: number, modifiers: { spawnRate: number; timeFrozen: boolean }): GameObject[] {
    if (modifiers.timeFrozen) {
      return [];
    }

    const timeSinceLastSpawn = currentTime - this.lastSpawnTime;
    
    if (timeSinceLastSpawn >= this.nextSpawnDelay) {
      const objects = this.spawnObjects(modifiers.spawnRate);
      this.lastSpawnTime = currentTime;
      this.calculateNextSpawn();
      return objects;
    }

    return [];
  }

  private spawnObjects(spawnRateMultiplier: number): GameObject[] {
    const objects: GameObject[] = [];
    
    // Determine how many objects to spawn (usually 1, sometimes more during swarm)
    const spawnCount = spawnRateMultiplier > 2 ? this.rng.nextInt(2, 4) : 1;
    
    for (let i = 0; i < spawnCount; i++) {
      const objectType = this.rng.objectType();
      const spawnX = this.rng.spawnX(this.config.screenWidth, this.config.objectSize.x);
      const fallSpeed = this.rng.fallSpeed(this.config.fallSpeed);
      
      const position: Vector2 = {
        x: spawnX,
        y: -this.config.objectSize.y / 2, // Start above screen
      };

      let cardType: string | undefined;
      if (objectType === 'gift') {
        cardType = this.rng.magicCard();
      }

      // Use object pool for better performance
      const obj = gameObjectPool.getObject(objectType, position, this.config.objectSize, fallSpeed, cardType);
      objects.push(obj);
    }

    return objects;
  }

  /**
   * Update spawn configuration
   */
  updateConfig(config: Partial<SpawnConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Find objects at tap position with priority handling
 */
export function findTappedObjects(
  objects: GameObject[],
  tapPosition: Vector2
): GameObject[] {
  const tappedObjects = objects.filter(obj => 
    obj.isActive && pointInAABB(tapPosition, obj.hitbox)
  );

  if (tappedObjects.length === 0) {
    return [];
  }

  // Sort by priority: Gift Box > Monad Logo > Glitch > Bomb
  tappedObjects.sort((a, b) => {
    const priorityOrder = { gift: 4, logo: 3, glitch: 2, bomb: 1 };
    return priorityOrder[b.type] - priorityOrder[a.type];
  });

  // Return highest priority object
  return [tappedObjects[0]];
}

/**
 * Apply size modifier to objects (for shrink ray effect)
 */
export function applySizeModifier(obj: GameObject, modifier: number): GameObject {
  const newSize = {
    x: obj.size.x * modifier,
    y: obj.size.y * modifier,
  };

  return {
    ...obj,
    size: newSize,
    hitbox: createAABB(obj.position, newSize),
  };
}

/**
 * Apply speed modifier to objects (for slow motion effect)
 */
export function applySpeedModifier(obj: GameObject, modifier: number): GameObject {
  return {
    ...obj,
    velocity: {
      x: obj.velocity.x * modifier,
      y: obj.velocity.y * modifier,
    },
  };
}

/**
 * Remove glitches from object list (for glitch purge effect)
 */
export function purgeGlitches(objects: GameObject[]): { 
  remainingObjects: GameObject[]; 
  glitchCount: number; 
} {
  const glitchCount = objects.filter(obj => obj.type === 'glitch').length;
  const remainingObjects = objects.filter(obj => obj.type !== 'glitch');
  
  return { remainingObjects, glitchCount };
}

/**
 * Validate tap timing (anti-cheat helper)
 */
export function validateTapTiming(
  previousTapTime: number,
  currentTapTime: number,
  minInterval: number = 50
): boolean {
  return currentTapTime - previousTapTime >= minInterval;
}

/**
 * Calculate object trajectory for prediction (anti-cheat helper)
 */
export function predictObjectPosition(
  obj: GameObject,
  futureTime: number
): Vector2 {
  const deltaTime = futureTime - obj.spawnTime;
  return {
    x: obj.position.x + obj.velocity.x * deltaTime / 1000,
    y: obj.position.y + obj.velocity.y * deltaTime / 1000,
  };
}

/**
 * Validate tap position against object trajectory (anti-cheat helper)
 */
export function validateTapPosition(
  obj: GameObject,
  tapPosition: Vector2,
  tapTime: number,
  tolerance: number = 20
): boolean {
  const predictedPos = predictObjectPosition(obj, tapTime);
  const distance = Math.sqrt(
    Math.pow(tapPosition.x - predictedPos.x, 2) + 
    Math.pow(tapPosition.y - predictedPos.y, 2)
  );
  
  return distance <= tolerance + Math.max(obj.size.x, obj.size.y) / 2;
}

/**
 * Clean up inactive objects and return them to the pool
 */
export function cleanupObjects(objects: GameObject[]): GameObject[] {
  const activeObjects: GameObject[] = [];
  
  objects.forEach(obj => {
    if (obj.isActive) {
      activeObjects.push(obj);
    } else {
      // Return to pool for reuse
      gameObjectPool.returnObject(obj);
    }
  });
  
  return activeObjects;
}

/**
 * Update object physics and mark off-screen objects as inactive
 */
export function updateObjectPhysics(objects: GameObject[], deltaTime: number, screenHeight: number): void {
  objects.forEach(obj => {
    if (!obj.isActive) return;
    
    // Update position
    obj.position.x += obj.velocity.x * deltaTime;
    obj.position.y += obj.velocity.y * deltaTime;
    
    // Update hitbox
    obj.hitbox.x = obj.position.x;
    obj.hitbox.y = obj.position.y;
    
    // Mark objects that have fallen off screen as inactive
    if (obj.position.y > screenHeight + obj.size.y) {
      obj.isActive = false;
    }
  });
}
