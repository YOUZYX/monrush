/**
 * Object Pool System for MonadRush
 * Optimizes memory usage and garbage collection by reusing game objects
 */

import { GameObject, Vector2, createAABB } from './physics';

interface PooledObject {
  object: GameObject;
  inUse: boolean;
}

export class ObjectPool {
  private pools: Map<string, PooledObject[]> = new Map();
  private poolSizes = {
    logo: 20,
    glitch: 15,
    gift: 10,
    bomb: 15,
  };
  
  constructor() {
    this.initializePools();
  }

  private initializePools() {
    for (const [type, size] of Object.entries(this.poolSizes)) {
      const pool: PooledObject[] = [];
      
      for (let i = 0; i < size; i++) {
        const object = this.createFreshObject(type as GameObject['type']);
        pool.push({ object, inUse: false });
      }
      
      this.pools.set(type, pool);
    }
  }

  private createFreshObject(type: GameObject['type']): GameObject {
    const defaultSize = { x: 60, y: 60 };
    const defaultPosition = { x: 0, y: 0 };
    
    return {
      id: '',
      type,
      position: { ...defaultPosition },
      velocity: { x: 0, y: 0 },
      size: { ...defaultSize },
      hitbox: createAABB(defaultPosition, defaultSize),
      spawnTime: 0,
      isActive: false,
      cardType: undefined,
    };
  }

  /**
   * Get an object from the pool, or create a new one if pool is exhausted
   */
  getObject(
    type: GameObject['type'],
    position: Vector2,
    size: Vector2,
    fallSpeed: number,
    cardType?: string
  ): GameObject {
    const pool = this.pools.get(type);
    if (!pool) {
      // Fallback: create new object if pool doesn't exist
      return this.createNewObject(type, position, size, fallSpeed, cardType);
    }

    // Find available object in pool
    let pooledObject = pool.find(p => !p.inUse);
    
    if (!pooledObject) {
      // Pool exhausted, create new object and add to pool
      const newObject = this.createFreshObject(type);
      pooledObject = { object: newObject, inUse: true };
      pool.push(pooledObject);
    }

    // Reset and configure object
    const obj = pooledObject.object;
    pooledObject.inUse = true;
    
    obj.id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    obj.position = { ...position };
    obj.velocity = { x: 0, y: fallSpeed };
    obj.size = { ...size };
    obj.hitbox = createAABB(position, size);
    obj.spawnTime = Date.now();
    obj.isActive = true;
    obj.cardType = cardType;

    return obj;
  }

  private createNewObject(
    type: GameObject['type'],
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
   * Return an object to the pool for reuse
   */
  returnObject(object: GameObject): void {
    const pool = this.pools.get(object.type);
    if (!pool) return;

    const pooledObject = pool.find(p => p.object === object);
    if (pooledObject) {
      pooledObject.inUse = false;
      pooledObject.object.isActive = false;
      pooledObject.object.cardType = undefined;
    }
  }

  /**
   * Get pool statistics for performance monitoring
   */
  getPoolStats(): Record<string, { total: number; inUse: number; available: number }> {
    const stats: Record<string, { total: number; inUse: number; available: number }> = {};
    
    for (const [type, pool] of this.pools) {
      const inUse = pool.filter(p => p.inUse).length;
      stats[type] = {
        total: pool.length,
        inUse,
        available: pool.length - inUse,
      };
    }
    
    return stats;
  }

  /**
   * Clear all pools (useful for cleanup)
   */
  clear(): void {
    for (const [type, pool] of this.pools) {
      pool.forEach(p => {
        p.inUse = false;
        p.object.isActive = false;
      });
    }
  }
}

// Singleton instance for global use
export const gameObjectPool = new ObjectPool();
