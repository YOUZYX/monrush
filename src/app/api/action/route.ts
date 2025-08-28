import { NextRequest, NextResponse } from 'next/server';
import { verifyMGIDAuth } from '@/lib/auth';
import { getSession, updateSession, storeUnflushedAction, storeStateHash, getStateHash, KVActionData, KVStateHash } from '@/lib/kv';
import { createSessionRNG } from '@/lib/rng';
import { createInitialGameState, applyTapResult, processTap } from '@/lib/game-logic';
import crypto from 'crypto';

interface ActionRequest {
  sessionId: string;
  actions: Array<{
    timestamp: number;
    position: { x: number; y: number };
    type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
    targetId?: string;
    value?: number;
  }>;
  clientStateHash?: string; // For desync detection
}

interface ActionResponse {
  success: boolean;
  validated: number; // Number of actions validated
  rejected: number; // Number of actions rejected
  stateHash: string; // Server state hash for verification
  desync?: boolean; // True if client/server out of sync
  error?: string;
}

// Anti-cheat constants
const MIN_TAP_INTERVAL = 50; // Minimum 50ms between taps (anti-spam)
const MAX_ACTIONS_PER_BATCH = 20; // Maximum actions per API call
const ACTION_BATCH_INTERVAL = 1500; // 1.5 seconds - matches client batching

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify MGID authentication and extract wallet address
    const authToken = request.headers.get('authorization');
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const authResult = await verifyMGIDAuth(authToken);
    if (!authResult.isValid || !authResult.walletAddress) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    const walletAddress = authResult.walletAddress;

    // Parse request body
    const body: ActionRequest = await request.json();
    const { sessionId, actions, clientStateHash } = body;

    if (!sessionId || !actions || !Array.isArray(actions)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid required fields' },
        { status: 400 }
      );
    }

    // Rate limiting: max actions per batch
    if (actions.length > MAX_ACTIONS_PER_BATCH) {
      return NextResponse.json(
        { success: false, error: 'Too many actions in batch' },
        { status: 429 }
      );
    }

    // Get session from KV
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    // Verify session belongs to the authenticated user
    if (session.playerAddress !== walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Session does not belong to authenticated user' },
        { status: 403 }
      );
    }

    // Verify session is still active
    if (!session.isActive) {
      return NextResponse.json(
        { success: false, error: 'Session is not active' },
        { status: 400 }
      );
    }

    // Check for rate limiting based on last action time
    const now = Date.now();
    if (now - session.lastActionTime < ACTION_BATCH_INTERVAL - 200) { // 200ms tolerance
      return NextResponse.json(
        { success: false, error: 'Actions submitted too frequently' },
        { status: 429 }
      );
    }

    // Re-simulate game state from session start
    const rng = createSessionRNG(sessionId, session.startTime);
    let gameState = createInitialGameState();
    
    // Apply existing actions from session (if any stored)
    // For now, we'll trust the session state and validate incrementally

    let validated = 0;
    let rejected = 0;
    let lastActionTime = session.lastActionTime;

    // Validate each action
    for (const action of actions) {
      // Anti-cheat: Check timing constraints
      if (action.timestamp <= lastActionTime + MIN_TAP_INTERVAL) {
        console.warn(`Action rejected - too fast: ${action.timestamp} vs ${lastActionTime}`);
        rejected++;
        continue;
      }

      // Anti-cheat: Check timestamp is within game session bounds
      if (action.timestamp < session.startTime || 
          action.timestamp > session.startTime + 120000) { // 2 minutes max game time
        console.warn(`Action rejected - invalid timestamp: ${action.timestamp}`);
        rejected++;
        continue;
      }

      // Anti-cheat: Validate position bounds (assuming 800x600 game area)
      if (action.position.x < 0 || action.position.x > 800 ||
          action.position.y < 0 || action.position.y > 600) {
        console.warn(`Action rejected - invalid position: ${JSON.stringify(action.position)}`);
        rejected++;
        continue;
      }

      // Process the action through game logic
      const tapResult = processTap(gameState, action.type);
      gameState = applyTapResult(gameState, tapResult);

      // Store unflushed action for contract batching (Phase 4)
      const kvAction: KVActionData = {
        sessionId,
        timestamp: action.timestamp,
        type: action.type,
        position: action.position,
        targetId: action.targetId,
        value: action.value,
      };

      await storeUnflushedAction(kvAction);

      validated++;
      lastActionTime = action.timestamp;
    }

    // Update session state in KV
    await updateSession(sessionId, {
      gameState: {
        timeRemaining: Math.max(0, gameState.timeLeft),
        lives: gameState.lives,
        score: gameState.score,
        combo: gameState.combo,
        streak: gameState.streak,
        activeCards: session.gameState.activeCards, // Preserve active card state
      },
      lastActionTime: now,
      totalActions: session.totalActions + validated,
    });

    // Generate server state hash for anti-cheat
    const stateData = {
      score: gameState.score,
      lives: gameState.lives,
      combo: gameState.combo,
      streak: gameState.streak,
      totalActions: session.totalActions + validated,
    };
    const serverStateHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(stateData))
      .digest('hex')
      .substring(0, 16); // First 16 characters

    // Store state hash for verification
    const hashData: KVStateHash = {
      sessionId,
      timestamp: now,
      hash: serverStateHash,
      actionCount: session.totalActions + validated,
    };
    await storeStateHash(hashData);

    // Check for client-server desync
    let desync = false;
    if (clientStateHash && clientStateHash !== serverStateHash) {
      desync = true;
      console.warn(`State desync detected for session ${sessionId}: client=${clientStateHash}, server=${serverStateHash}`);
    }

    const response: ActionResponse = {
      success: true,
      validated,
      rejected,
      stateHash: serverStateHash,
      desync,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Action validation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Rate limiting per user
const ACTION_RATE_LIMIT = 1000; // Max 1 request per second
const recentActions = new Map<string, number>();

function checkActionRateLimit(address: string): boolean {
  const now = Date.now();
  const lastAction = recentActions.get(address);
  
  if (lastAction && now - lastAction < ACTION_RATE_LIMIT) {
    return false;
  }
  
  recentActions.set(address, now);
  
  // Cleanup old entries periodically
  if (recentActions.size > 1000) {
    const cutoff = now - ACTION_RATE_LIMIT * 10;
    for (const [addr, time] of recentActions.entries()) {
      if (time < cutoff) {
        recentActions.delete(addr);
      }
    }
  }
  
  return true;
}
