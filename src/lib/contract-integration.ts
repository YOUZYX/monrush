/**
 * Smart Contract Integration for MonadRush
 * Handles actual blockchain transactions for game sessions
 */

import { createPublicClient, createWalletClient, http, Address } from 'viem';
import { simulateContract } from 'viem/actions';
import { privateKeyToAccount } from 'viem/accounts';
import { monadTestnet } from './contracts';
import { MONAD_RUSH_ABI, CONTRACT_ADDRESSES, ACTION_TYPES } from './contracts-abi';

// Server wallet for contract transactions
const serverPrivateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
if (!serverPrivateKey || serverPrivateKey === 'your_server_wallet_private_key') {
  console.warn('SERVER_WALLET_PRIVATE_KEY not configured properly. Contract integration disabled.');
}

let serverAccount: ReturnType<typeof privateKeyToAccount> | null = null;
let publicClient: ReturnType<typeof createPublicClient> | null = null;
let walletClient: ReturnType<typeof createWalletClient> | null = null;

if (serverPrivateKey && serverPrivateKey !== 'your_server_wallet_private_key') {
  try {
    serverAccount = privateKeyToAccount(serverPrivateKey as `0x${string}`);

    // Public client for reading
    publicClient = createPublicClient({
      chain: monadTestnet,
      transport: http(),
    });

    // Wallet client for writing to contracts
    walletClient = createWalletClient({
      account: serverAccount,
      chain: monadTestnet,
      transport: http(),
    });
  } catch (error) {
    console.error('Failed to initialize blockchain clients:', error);
  }
}

/**
 * Start a game session on-chain
 */
export async function startGameOnChain(playerAddress: Address, sessionId: string): Promise<string> {
  if (!publicClient || !walletClient || !serverAccount) {
    console.warn('Blockchain clients not available. Skipping contract interaction.');
    return 'disabled';
  }
  
  try {
    const { request } = await simulateContract(publicClient, {
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'startGame',
      args: [sessionId],
      account: serverAccount,
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Game started on-chain for ${playerAddress}, session: ${sessionId}, tx: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Failed to start game on-chain:', error);
    throw new Error('Contract interaction failed: startGame');
  }
}

/**
 * Record an action on-chain
 * Called during action batching (every 1-2 seconds)
 */
export async function recordActionOnChain(
  playerAddress: Address,
  sessionId: string,
  kind: keyof typeof ACTION_TYPES,
  value: number = 0
): Promise<string> {
  if (!publicClient || !walletClient || !serverAccount) {
    console.warn('Blockchain clients not available. Skipping contract interaction.');
    return 'disabled';
  }
  
  try {
    const actionType = ACTION_TYPES[kind];
    
    const { request } = await simulateContract(publicClient, {
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'recordAction',
      args: [sessionId, actionType, value],
      account: serverAccount,
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Action recorded on-chain for ${playerAddress}, session: ${sessionId}, type: ${String(kind)}, tx: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Failed to record action on-chain:', error);
    throw new Error('Contract interaction failed: recordAction');
  }
}

/**
 * Finish a game session on-chain
 * This automatically updates the MGID contract with final score
 */
export async function finishSessionOnChain(
  playerAddress: Address,
  sessionId: string,
  finalScore: number,
  totalActions: number
): Promise<string> {
  if (!publicClient || !walletClient || !serverAccount) {
    console.warn('Blockchain clients not available. Skipping contract interaction.');
    return 'disabled';
  }
  
  try {
    const { request } = await simulateContract(publicClient, {
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'finishSession',
      args: [sessionId, BigInt(finalScore), BigInt(totalActions)],
      account: serverAccount,
    });

    const hash = await walletClient.writeContract(request);
    console.log(`Session finished on-chain for ${playerAddress}, session: ${sessionId}, score: ${finalScore}, actions: ${totalActions}, tx: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Failed to finish session on-chain:', error);
    throw new Error('Contract interaction failed: finishSession');
  }
}

/**
 * Batch record multiple actions (gas optimization)
 */
export async function batchRecordActions(
  playerAddress: Address,
  sessionId: string,
  actions: Array<{ kind: keyof typeof ACTION_TYPES; value?: number }>
): Promise<string[]> {
  const txHashes: string[] = [];
  
  // In a production environment, you might want to batch these into a single multicall
  // For now, we'll send them sequentially with a small delay
  for (const action of actions) {
    try {
      const hash = await recordActionOnChain(playerAddress, sessionId, action.kind, action.value || 0);
      txHashes.push(hash);
      
      // Small delay to prevent nonce issues
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to record action ${String(action.kind)}:`, error);
      // Continue with other actions even if one fails
    }
  }
  
  return txHashes;
}

/**
 * Update MGID player data using server wallet (PRIVATE_KEY)
 * Called after finishSession to update player statistics
 */
export async function updateMGIDPlayerData(
  playerAddress: Address,
  scoreDelta: bigint,
  txDelta: bigint
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!publicClient || !walletClient || !serverAccount) {
    console.warn('Blockchain clients not available. Skipping MGID update.');
    return { success: false, error: 'Contract integration disabled' };
  }

  try {
    console.log('📡 Updating MGID for player:', playerAddress);
    console.log('📊 Score delta:', scoreDelta.toString());
    console.log('🔢 TX delta:', txDelta.toString());

    // First simulate the transaction
    const { request } = await simulateContract(publicClient, {
      address: CONTRACT_ADDRESSES.MONAD_GAMES_ID,
      abi: [
        {
          type: 'function',
          name: 'updatePlayerData',
          inputs: [
            { name: 'player', type: 'address' },
            { name: 'scoreDelta', type: 'uint256' },
            { name: 'txDelta', type: 'uint256' }
          ],
          outputs: [],
          stateMutability: 'nonpayable'
        }
      ],
      functionName: 'updatePlayerData',
      args: [playerAddress, scoreDelta, txDelta],
      account: serverAccount,
    });

    console.log('✅ MGID update simulation successful');

    // Execute the transaction
    const txHash = await walletClient.writeContract(request);
    console.log('📝 MGID update transaction sent:', txHash);

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log('✅ MGID update confirmed:', receipt.status);

    return {
      success: receipt.status === 'success',
      txHash,
    };
  } catch (error) {
    console.error('❌ MGID update failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get contract address for verification
 */
export function getContractAddress(): string {
  return CONTRACT_ADDRESSES.MONAD_RUSH;
}

/**
 * Get server wallet address for verification
 */
export function getServerWalletAddress(): string {
  if (!serverAccount) {
    return 'not-configured';
  }
  return serverAccount.address;
}
