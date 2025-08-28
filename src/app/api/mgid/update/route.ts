/**
 * MGID Update API Route
 * Updates MGID player data using backend server wallet (PRIVATE_KEY)
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateMGIDPlayerData } from '@/lib/contract-integration';

export async function POST(request: NextRequest) {
  try {
    console.log('📡 MGID update request received');
    
    const body = await request.json();
    const { playerAddress, score, actions } = body;

    // Validate request data
    if (!playerAddress || typeof score !== 'number' || typeof actions !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: playerAddress, score, actions' },
        { status: 400 }
      );
    }

    // Validate player address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(playerAddress)) {
      return NextResponse.json(
        { error: 'Invalid player address format' },
        { status: 400 }
      );
    }

    console.log('📊 Updating MGID for player:', playerAddress);
    console.log('🎯 Score:', score, 'Actions:', actions);

    // Calculate deltas for MGID update
    const scoreDelta = BigInt(Math.max(0, score)); // Ensure positive score
    const txDelta = BigInt(Math.max(1, actions)); // At least 1 transaction

    // Call contract integration to update MGID using server wallet
    const result = await updateMGIDPlayerData(
      playerAddress as `0x${string}`,
      scoreDelta,
      txDelta
    );

    if (result.success) {
      console.log('✅ MGID updated successfully:', result.txHash);
      return NextResponse.json({
        success: true,
        txHash: result.txHash,
        player: playerAddress,
        scoreDelta: scoreDelta.toString(),
        txDelta: txDelta.toString(),
      });
    } else {
      console.error('❌ MGID update failed:', result.error);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to update MGID'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ MGID update API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Health check endpoint
  return NextResponse.json({
    status: 'ok',
    endpoint: 'mgid-update',
    timestamp: new Date().toISOString(),
  });
}
