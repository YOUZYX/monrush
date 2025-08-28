/**
 * Vercel KV Database Configuration and Helpers
 * Session storage, anti-cheat state tracking, action batching
 */

import { kv } from '@vercel/kv';

// Key patterns for Vercel KV
export const KV_KEYS = {
  session: (sessionId: string) => `session:${sessionId}`,
  sessionHash: (sessionId: string) => `session:${sessionId}:hash`,
  sessionUnflushed: (sessionId: string) => `session:${sessionId}:unflushed`,
  playerRecent: (address: string) => `player:${address}:recent`,
} as const;

// Session data structure for KV storage
export interface KVSessionData {
  id: string;
  playerAddress: string;
  seed: number;
  startTime: number;
  isActive: boolean;
  gameState: {
    timeRemaining: number;
    lives: number;
    score: number;
    combo: number;
    streak: number;
    activeCards: Array<{ type: string; endTime: number }>;
  };
  lastActionTime: number;
  totalActions: number;
}

// Action data for batching
export interface KVActionData {
  sessionId: string;
  timestamp: number;
  type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
  position: { x: number; y: number };
  targetId?: string;
  value?: number;
}

// Rolling state hash for anti-cheat
export interface KVStateHash {
  sessionId: string;
  timestamp: number;
  hash: string;
  actionCount: number;
}

/**
 * Store session data in KV
 */
export async function storeSession(data: KVSessionData): Promise<void> {
  try {
    await kv.set(KV_KEYS.session(data.id), data, { ex: 300 }); // 5 minutes TTL
    
    // Add to player's recent sessions
    const recentKey = KV_KEYS.playerRecent(data.playerAddress);
    const recent = await kv.lrange(recentKey, 0, 9) || [];
    await kv.lpush(recentKey, data.id);
    await kv.ltrim(recentKey, 0, 9); // Keep last 10 sessions
    await kv.expire(recentKey, 86400); // 24 hours TTL
  } catch (error) {
    console.error('Failed to store session:', error);
    throw new Error('Session storage failed');
  }
}

/**
 * Retrieve session data from KV
 */
export async function getSession(sessionId: string): Promise<KVSessionData | null> {
  try {
    return await kv.get<KVSessionData>(KV_KEYS.session(sessionId));
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Update session data in KV
 */
export async function updateSession(sessionId: string, updates: Partial<KVSessionData>): Promise<void> {
  try {
    const existing = await getSession(sessionId);
    if (!existing) {
      throw new Error('Session not found');
    }

    const updated = { ...existing, ...updates };
    await kv.set(KV_KEYS.session(sessionId), updated, { ex: 300 });
  } catch (error) {
    console.error('Failed to update session:', error);
    throw new Error('Session update failed');
  }
}

/**
 * Store unflushed actions for batching
 */
export async function storeUnflushedAction(action: KVActionData): Promise<void> {
  try {
    const key = KV_KEYS.sessionUnflushed(action.sessionId);
    await kv.lpush(key, JSON.stringify(action));
    await kv.expire(key, 300); // 5 minutes TTL
  } catch (error) {
    console.error('Failed to store unflushed action:', error);
    throw new Error('Action storage failed');
  }
}

/**
 * Get and clear unflushed actions for batching
 */
export async function flushUnflushedActions(sessionId: string): Promise<KVActionData[]> {
  try {
    const key = KV_KEYS.sessionUnflushed(sessionId);
    const actions = await kv.lrange(key, 0, -1) || [];
    
    if (actions.length > 0) {
      await kv.del(key);
      return actions.map(action => JSON.parse(action as string));
    }
    
    return [];
  } catch (error) {
    console.error('Failed to flush unflushed actions:', error);
    return [];
  }
}

/**
 * Store rolling state hash for anti-cheat
 */
export async function storeStateHash(hash: KVStateHash): Promise<void> {
  try {
    await kv.set(KV_KEYS.sessionHash(hash.sessionId), hash, { ex: 300 });
  } catch (error) {
    console.error('Failed to store state hash:', error);
    throw new Error('State hash storage failed');
  }
}

/**
 * Get rolling state hash
 */
export async function getStateHash(sessionId: string): Promise<KVStateHash | null> {
  try {
    return await kv.get<KVStateHash>(KV_KEYS.sessionHash(sessionId));
  } catch (error) {
    console.error('Failed to get state hash:', error);
    return null;
  }
}

/**
 * Clean up session data
 */
export async function cleanupSession(sessionId: string): Promise<void> {
  try {
    await Promise.all([
      kv.del(KV_KEYS.session(sessionId)),
      kv.del(KV_KEYS.sessionHash(sessionId)),
      kv.del(KV_KEYS.sessionUnflushed(sessionId)),
    ]);
  } catch (error) {
    console.error('Failed to cleanup session:', error);
  }
}

/**
 * Get player's recent sessions
 */
export async function getPlayerRecentSessions(address: string): Promise<string[]> {
  try {
    return await kv.lrange(KV_KEYS.playerRecent(address), 0, 9) || [];
  } catch (error) {
    console.error('Failed to get recent sessions:', error);
    return [];
  }
}
