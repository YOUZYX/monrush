import { NextRequest, NextResponse } from 'next/server';
import { verifyMGIDAuth } from '@/lib/auth';
import { storeSession, KVSessionData } from '@/lib/kv';
import { createSessionRNG } from '@/lib/rng';
import { createInitialGameState } from '@/lib/game-logic';
import { startGameOnChain } from '@/lib/contract-integration';

interface StartSessionRequest {
  // Future extensibility - currently no additional data needed
  clientTimestamp?: number;
}

interface StartSessionResponse {
  success: boolean;
  sessionId: string;
  seed: number;
  error?: string;
}

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

    // Generate deterministic seed for the session
    const sessionId = `${walletAddress}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const seed = Math.floor(Math.random() * 0x7FFFFFFF); // 32-bit positive integer

    // Create initial game state
    const initialGameState = createInitialGameState();

    // Prepare session data for KV storage
    const sessionData: KVSessionData = {
      id: sessionId,
      playerAddress: walletAddress,
      seed,
      startTime: Date.now(),
      isActive: true,
      gameState: {
        timeRemaining: initialGameState.timeLeft,
        lives: initialGameState.lives,
        score: initialGameState.score,
        combo: initialGameState.combo,
        streak: initialGameState.streak,
        activeCards: [], // Will be populated as cards are activated
      },
      lastActionTime: Date.now(),
      totalActions: 0,
    };

    // Store session in KV
    await storeSession(sessionData);

    // Start game session on-chain (Phase 4: Smart Contract Integration)
    try {
      const txHash = await startGameOnChain(walletAddress as `0x${string}`, sessionId);
      console.log(`Game started on-chain for ${walletAddress}, session: ${sessionId}, tx: ${txHash}`);
      // Note: We don't wait for confirmation - the session can start regardless
    } catch (contractError) {
      console.error('Contract interaction failed (session continues):', contractError);
      // Session continues even if blockchain call fails
    }

    // Log session start for monitoring
    console.log(`Session started for ${walletAddress}: ${sessionId}`);

    // Return session details to client
    const response: StartSessionResponse = {
      success: true,
      sessionId,
      seed,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Rate limiting check
const SESSION_START_COOLDOWN = 5000; // 5 seconds between session starts
const recentStarts = new Map<string, number>();

function checkRateLimit(address: string): boolean {
  const now = Date.now();
  const lastStart = recentStarts.get(address);
  
  if (lastStart && now - lastStart < SESSION_START_COOLDOWN) {
    return false;
  }
  
  recentStarts.set(address, now);
  
  // Cleanup old entries periodically
  if (recentStarts.size > 1000) {
    const cutoff = now - SESSION_START_COOLDOWN;
    for (const [addr, time] of recentStarts.entries()) {
      if (time < cutoff) {
        recentStarts.delete(addr);
      }
    }
  }
  
  return true;
}
