/**
 * API Route for recording game actions using server wallet
 * This allows seamless action recording without user wallet popups
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from '@/lib/chains';
import { MONAD_RUSH_ABI, CONTRACT_ADDRESSES, ACTION_TYPES } from '@/lib/contracts-abi';

// Create wallet client from server private key
const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
if (!privateKey) {
  throw new Error('SERVER_WALLET_PRIVATE_KEY is not configured');
}

// Ensure the private key is properly formatted (remove 0x prefix if present)
const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
const serverAccount = privateKeyToAccount(`0x${cleanPrivateKey}` as `0x${string}`);

const walletClient = createWalletClient({
  account: serverAccount,
  chain: monadTestnet,
  transport: http(),
});

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, actionType, value, playerWallet } = await request.json();

    // Validate required fields
    if (!sessionId || !actionType || !playerWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, actionType, playerWallet' },
        { status: 400 }
      );
    }

    // Validate actionType
    if (!(actionType in ACTION_TYPES)) {
      return NextResponse.json(
        { error: `Invalid actionType: ${actionType}. Must be one of: ${Object.keys(ACTION_TYPES).join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`🎮 Recording action for session ${sessionId}: ${actionType} (value: ${value}) for player ${playerWallet}`);

    // Record action using server wallet with retry logic
    const contractActionType = ACTION_TYPES[actionType as keyof typeof ACTION_TYPES];
    
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: Error;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`⚡ Attempting contract write (attempt ${attempts}/${maxAttempts})`);

        // Get current nonce to ensure proper sequencing
        const nonce = await publicClient.getTransactionCount({
          address: serverAccount.address,
          blockTag: 'pending',
        });

        console.log(`📋 Using nonce: ${nonce}`);

        // Estimate gas for the transaction
        const gasEstimate = await publicClient.estimateContractGas({
          address: CONTRACT_ADDRESSES.MONAD_RUSH,
          abi: MONAD_RUSH_ABI,
          functionName: 'recordAction',
          args: [sessionId, contractActionType, value || 0],
          account: serverAccount,
        });

        // Add 20% buffer to gas estimate
        const gasLimit = gasEstimate + (gasEstimate * BigInt(20) / BigInt(100));

        console.log(`⛽ Gas estimate: ${gasEstimate}, using limit: ${gasLimit}`);

        const txHash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.MONAD_RUSH,
          abi: MONAD_RUSH_ABI,
          functionName: 'recordAction',
          args: [sessionId, contractActionType, value || 0],
          nonce,
          gas: gasLimit,
        });

        console.log(`✅ Action recorded by server wallet, tx: ${txHash}`);

        // Wait for transaction receipt with timeout
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: txHash,
          timeout: 30000, // 30 second timeout
        });

        return NextResponse.json({ 
          success: true, 
          txHash,
          blockNumber: receipt.blockNumber.toString(),
          gasUsed: receipt.gasUsed.toString(),
          attempts
        });

      } catch (attemptError) {
        lastError = attemptError instanceof Error ? attemptError : new Error('Unknown error');
        const errorMessage = lastError.message.toLowerCase();
        
        console.error(`❌ Contract write attempt ${attempts} failed:`, errorMessage);

        // Check if this is a retryable error
        const retryableErrors = [
          'another transaction has higher priority',
          'nonce too low', 
          'nonce too high',
          'replacement transaction underpriced',
          'transaction underpriced',
          'network error',
          'timeout',
        ];

        const isRetryable = retryableErrors.some(error => errorMessage.includes(error));

        if (!isRetryable || attempts >= maxAttempts) {
          break; // Don't retry for non-retryable errors or max attempts reached
        }

        // Wait before retrying with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 5000);
        console.log(`⏱️ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // All attempts failed
    console.error(`💥 All ${maxAttempts} attempts failed for session ${sessionId}`);
    throw lastError!;

  } catch (error) {
    console.error('❌ Error recording action:', error);
    
    // Return more specific error information
    const errorMessage = error instanceof Error ? error.message : 'Failed to record action';
    const isContractError = errorMessage.toLowerCase().includes('contract') || 
                           errorMessage.toLowerCase().includes('transaction') ||
                           errorMessage.toLowerCase().includes('nonce');

    return NextResponse.json(
      { 
        error: errorMessage,
        type: isContractError ? 'CONTRACT_ERROR' : 'SERVER_ERROR',
        retryable: isContractError
      },
      { status: 500 }
    );
  }
}
