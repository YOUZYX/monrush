/**
 * API Route for finishing game sessions
 * This route handles session completion and cleanup
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, finalScore, tapHistory } = await request.json();

    // Validate required fields
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 }
      );
    }

    console.log(`🏁 Finishing session: ${sessionId} with score: ${finalScore}`);

    // TODO: Add session cleanup logic here if needed
    // For now, we just acknowledge the session finish

    return NextResponse.json({ 
      success: true, 
      sessionId,
      finalScore,
      message: 'Session finished successfully'
    });

  } catch (error) {
    console.error('❌ Error finishing session:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to finish session';
    return NextResponse.json(
      { 
        error: errorMessage,
        type: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
