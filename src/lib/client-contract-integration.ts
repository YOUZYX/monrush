/**
 * Client-side contract integration for MonadRush Public Contract
 * Players interact directly with the contract from their wallets using Privy Cross-App
 */

import { createPublicClient, http, encodeFunctionData } from 'viem';
import { monadTestnet } from './chains';
import { MONAD_RUSH_ABI, CONTRACT_ADDRESSES, ACTION_TYPES } from './contracts-abi';
import { transactionQueue } from './transaction-queue';

// Type for Privy's sendTransaction function
type PrivySendTransaction = (
  requestData: {
    chainId: number;
    to: string;
    data: string;
    gasLimit: number;
  },
  options: { address: string }
) => Promise<{ txHash: string }>;

// Public client for reading contract state
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

/**
 * Start a game session using Privy Cross-App
 * @param sessionId - The game session ID
 * @param walletAddress - The player's wallet address
 * @param sendTransaction - Privy's sendTransaction function
 */
export async function startGameFromWallet(
  sessionId: string, 
  walletAddress: string,
  sendTransaction: PrivySendTransaction
): Promise<string> {
  try {
    const data = encodeFunctionData({
      abi: MONAD_RUSH_ABI,
      functionName: 'startGame',
      args: [sessionId],
    });

    const result = await sendTransaction(
      {
        chainId: monadTestnet.id,
        to: CONTRACT_ADDRESSES.MONAD_RUSH,
        data,
        gasLimit: 200000,
      },
      { address: walletAddress }
    );
    
    console.log(`Game started by player ${walletAddress}, session: ${sessionId}, tx: ${result.txHash}`);
    return result.txHash;
  } catch (error) {
    console.error('Failed to start game:', error);
    throw new Error('Failed to start game on-chain');
  }
}

/**
 * Record an action using Privy Cross-App
 * @param sessionId - The game session ID
 * @param kind - The action type
 * @param value - The action value
 * @param walletAddress - The player's wallet address
 * @param sendTransaction - Privy's sendTransaction function
 */
export async function recordActionFromWallet(
  sessionId: string,
  kind: keyof typeof ACTION_TYPES,
  value: number = 0,
  walletAddress: string,
  sendTransaction: PrivySendTransaction
): Promise<string> {
  try {
    const actionType = ACTION_TYPES[kind];
    
    const data = encodeFunctionData({
      abi: MONAD_RUSH_ABI,
      functionName: 'recordAction',
      args: [sessionId, actionType, value],
    });

    const result = await sendTransaction(
      {
        chainId: monadTestnet.id,
        to: CONTRACT_ADDRESSES.MONAD_RUSH,
        data,
        gasLimit: 150000,
      },
      { address: walletAddress }
    );
    
    console.log(`Action recorded by player ${walletAddress}, session: ${sessionId}, type: ${kind}, tx: ${result.txHash}`);
    return result.txHash;
  } catch (error) {
    console.error('Failed to record action:', error);
    throw new Error('Failed to record action on-chain');
  }
}

/**
 * Record an action using server wallet (seamless, no user interaction)
 * @param sessionId - The game session ID
 * @param kind - The action type
 * @param value - The action value
 * @param playerWalletAddress - The player's wallet address for verification
 */
export async function recordActionFromServer(
  sessionId: string,
  kind: keyof typeof ACTION_TYPES,
  value: number = 0,
  playerWalletAddress: string
): Promise<string> {
  try {
    console.log(`🔧 Queueing action: ${kind} for session ${sessionId} (queue: ${transactionQueue.getQueueLength()})`);
    
    // Use transaction queue to prevent nonce conflicts
    const txHash = await transactionQueue.queueTransaction(
      sessionId,
      kind,
      value,
      playerWalletAddress
    );
    
    console.log(`✅ Action recorded via server, tx: ${txHash}`);
    return txHash;
  } catch (error) {
    console.error('Failed to record action via server:', error);
    throw new Error('Failed to record action via server');
  }
}

/**
 * Finish a game session using Privy Cross-App
 * @param sessionId - The game session ID
 * @param finalScore - The final score
 * @param totalActions - The total number of actions
 * @param walletAddress - The player's wallet address
 * @param sendTransaction - Privy's sendTransaction function
 */
export async function finishSessionFromWallet(
  sessionId: string,
  finalScore: number,
  totalActions: number,
  walletAddress: string,
  sendTransaction: PrivySendTransaction
): Promise<string> {
  try {
    const data = encodeFunctionData({
      abi: MONAD_RUSH_ABI,
      functionName: 'finishSession',
      args: [sessionId, BigInt(finalScore), BigInt(totalActions)],
    });

    const result = await sendTransaction(
      {
        chainId: monadTestnet.id,
        to: CONTRACT_ADDRESSES.MONAD_RUSH,
        data,
        gasLimit: 200000,
      },
      { address: walletAddress }
    );
    
    console.log(`Session finished by player ${walletAddress}, session: ${sessionId}, score: ${finalScore}, tx: ${result.txHash}`);
    return result.txHash;
  } catch (error) {
    console.error('Failed to finish session:', error);
    throw new Error('Failed to finish session on-chain');
  }
}

/**
 * Get player statistics from contract
 */
export async function getPlayerStats(playerAddress: string) {
  try {
    const stats = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'getPlayerStats',
      args: [playerAddress as `0x${string}`],
    });
    
    return {
      gamesPlayed: Number(stats[0]),
      actionsRecorded: Number(stats[1]),
      bestScore: Number(stats[2]),
    };
  } catch (error) {
    console.error('Failed to get player stats:', error);
    throw new Error('Failed to get player statistics');
  }
}

/**
 * Check if player can start a new game (cooldown check)
 */
export async function canPlayerStartGame(playerAddress: string): Promise<boolean> {
  try {
    const cooldown = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'GAME_START_COOLDOWN',
    });
    
    const lastGameStart = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'lastGameStart',
      args: [playerAddress as `0x${string}`],
    }) as bigint;
    
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const canStart = currentTime >= lastGameStart + cooldown;
    
    return canStart;
  } catch (error) {
    console.error('Failed to check cooldown:', error);
    return false;
  }
}

/**
 * Get time remaining for cooldown
 */
export async function getCooldownTimeRemaining(playerAddress: string): Promise<number> {
  try {
    const cooldown = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'GAME_START_COOLDOWN',
    });
    
    const lastGameStart = await publicClient.readContract({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      functionName: 'lastGameStart',
      args: [playerAddress as `0x${string}`],
    }) as bigint;
    
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    const nextAllowedTime = lastGameStart + cooldown;
    
    if (currentTime >= nextAllowedTime) {
      return 0;
    }
    
    return Number(nextAllowedTime - currentTime);
  } catch (error) {
    console.error('Failed to get cooldown time:', error);
    return 0;
  }
}

/**
 * Listen for contract events
 */
export async function watchGameEvents(playerAddress: string, callbacks: {
  onGameStarted?: (sessionId: string) => void;
  onActionRecorded?: (sessionId: string, kind: number, value: number) => void;
  onGameFinished?: (sessionId: string, finalScore: number) => void;
}) {
  // Watch for GameStarted events
  if (callbacks.onGameStarted) {
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      eventName: 'GameStarted',
      args: { player: playerAddress as `0x${string}` },
      onLogs: (logs) => {
        logs.forEach((log) => {
          if (log.args.sessionId) {
            callbacks.onGameStarted!(log.args.sessionId);
          }
        });
      },
    });
  }

  // Watch for ActionRecorded events
  if (callbacks.onActionRecorded) {
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      eventName: 'ActionRecorded',
      args: { player: playerAddress as `0x${string}` },
      onLogs: (logs) => {
        logs.forEach((log) => {
          if (log.args.sessionId && log.args.kind !== undefined && log.args.value !== undefined) {
            callbacks.onActionRecorded!(log.args.sessionId, log.args.kind, log.args.value);
          }
        });
      },
    });
  }

  // Watch for GameFinished events
  if (callbacks.onGameFinished) {
    publicClient.watchContractEvent({
      address: CONTRACT_ADDRESSES.MONAD_RUSH,
      abi: MONAD_RUSH_ABI,
      eventName: 'GameFinished',
      args: { player: playerAddress as `0x${string}` },
      onLogs: (logs) => {
        logs.forEach((log) => {
          if (log.args.sessionId && log.args.finalScore !== undefined) {
            callbacks.onGameFinished!(log.args.sessionId, Number(log.args.finalScore));
          }
        });
      },
    });
  }
}
