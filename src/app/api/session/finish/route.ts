import { NextRequest, NextResponse } from 'next/server';
import { verifyMGIDAuth } from '@/lib/auth';
import { getSession, updateSession, cleanupSession } from '@/lib/kv';
import { createSessionRNG } from '@/lib/rng';
import { createInitialGameState, applyTapResult, processTap } from '@/lib/game-logic';
import { finishSessionOnChain } from '@/lib/contract-integration';

interface FinishSessionRequest {
  sessionId: string;
  clientFinalScore: number; // For comparison only
  tapHistory: Array<{
    timestamp: number;
    position: { x: number; y: number };
    result: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
  }>;
}

interface FinishSessionResponse {
  success: boolean;
  finalScore: number;
  isValid: boolean;
  scoreDifference?: number;
  stats?: {
    totalTaps: number;
    logos: number;
    glitches: number;
    gifts: number;
    bombs: number;
    misses: number;
    maxCombo: number;
    longestStreak: number;
  };
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

    // Parse request body
    const body: FinishSessionRequest = await request.json();
    const { sessionId, clientFinalScore, tapHistory } = body;

    if (!sessionId || !tapHistory) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
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
        { success: false, error: 'Session already finished' },
        { status: 400 }
      );
    }

    // Re-simulate the game server-side for anti-cheat validation
    const rng = createSessionRNG(sessionId, session.startTime);
    let gameState = createInitialGameState();
    let maxCombo = gameState.combo;
    let longestStreak = gameState.streak;
    
    // Count different action types for stats
    const stats = {
      totalTaps: tapHistory.length,
      logos: 0,
      glitches: 0,
      gifts: 0,
      bombs: 0,
      misses: 0,
      maxCombo: 1,
      longestStreak: 0,
    };

    // Apply each tap event and validate
    for (const tap of tapHistory) {
      // Basic validation of tap timing (anti-cheat)
      if (tap.timestamp < session.startTime || tap.timestamp > session.startTime + 120000) {
        console.warn(`Invalid tap timestamp: ${tap.timestamp} for session ${sessionId}`);
        continue;
      }

      // Process the tap result
      const tapResult = processTap(gameState, tap.result);
      gameState = applyTapResult(gameState, tapResult);

      // Update stats
      stats[tap.result as keyof typeof stats]++;
      if (gameState.combo > maxCombo) {
        maxCombo = gameState.combo;
        stats.maxCombo = maxCombo;
      }
      if (gameState.streak > longestStreak) {
        longestStreak = gameState.streak;
        stats.longestStreak = longestStreak;
      }
    }

    const serverFinalScore = gameState.score;
    const scoreDifference = Math.abs(serverFinalScore - clientFinalScore);
    const isValid = scoreDifference <= 10; // Allow small discrepancies due to timing

    // Mark session as finished
    await updateSession(sessionId, { 
      isActive: false,
      gameState: {
        ...session.gameState,
        score: serverFinalScore,
        timeRemaining: Math.max(0, gameState.timeLeft),
        lives: gameState.lives,
        combo: gameState.combo,
        streak: gameState.streak,
        activeCards: [], // Clear active cards at end
      },
      totalActions: tapHistory.length,
    });

    // Log completion for monitoring
    console.log(`Session finished for ${walletAddress}: ${sessionId}, Score: ${serverFinalScore}, Valid: ${isValid}`);

    // Phase 4: Smart Contract Integration - Finish session on-chain
    try {
      // Extract numeric session ID for contract call
      const numericSessionId = parseInt(sessionId.split('-')[1] || '0');
      const txHash = await finishSessionOnChain(walletAddress as `0x${string}`, numericSessionId.toString(), serverFinalScore, tapHistory.length);
      console.log(`Session finished on-chain for ${walletAddress}, session: ${numericSessionId}, score: ${serverFinalScore}, tx: ${txHash}`);
      // This automatically updates the MGID contract with the final score
    } catch (contractError) {
      console.error('Contract interaction failed (session finishes anyway):', contractError);
      // Session finishes even if blockchain call fails
    }

    // Clean up session data (optional - could keep for analytics)
    // await cleanupSession(sessionId);

    const response: FinishSessionResponse = {
      success: true,
      finalScore: serverFinalScore,
      isValid,
      scoreDifference: isValid ? undefined : scoreDifference,
      stats,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Session finish error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

// Rate limiting for session finish
const FINISH_RATE_LIMIT = 60000; // 1 minute between finishes per user
const recentFinishes = new Map<string, number>();

function checkFinishRateLimit(address: string): boolean {
  const now = Date.now();
  const lastFinish = recentFinishes.get(address);
  
  if (lastFinish && now - lastFinish < FINISH_RATE_LIMIT) {
    return false;
  }
  
  recentFinishes.set(address, now);
  
  // Cleanup old entries periodically
  if (recentFinishes.size > 1000) {
    const cutoff = now - FINISH_RATE_LIMIT;
    for (const [addr, time] of recentFinishes.entries()) {
      if (time < cutoff) {
        recentFinishes.delete(addr);
      }
    }
  }
  
  return true;
}
