/**
 * Game Contract Manager for MonadRush
 * Handles all contract interactions during gameplay
 */

import { publicClient } from './client-contract-integration';
import {
  startGameFromWallet,
  recordActionFromWallet,
  recordActionFromServer,
  canPlayerStartGame,
  getCooldownTimeRemaining,
  watchGameEvents,
} from './client-contract-integration';
import {
  startGameOnChain,
  recordActionOnChain,
} from './contract-integration';
import { GameSession, TapEvent } from './game-state';
import { MONAD_RUSH_ABI, CONTRACT_ADDRESSES, ACTION_TYPES } from './contracts-abi';

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

export interface WalletInfo {
  address: string;
  balance: bigint;
  hasMinimumBalance: boolean;
}

export interface GameContractState {
  canStartGame: boolean;
  cooldownRemaining: number;
  isContractReady: boolean;
  lastError: string | null;
}

export class GameContractManager {
  private walletAddress: string;
  private sendTransaction: PrivySendTransaction;
  private onGameStarted?: (sessionId: string, txHash: string) => void;
  private onActionRecorded?: (actionType: string, txHash: string) => void;
  private onGameFinished?: (score: number, txHash: string | null) => void;
  private onError?: (error: string) => void;
  
  // Action debouncing to prevent duplicates
  private pendingActions = new Set<string>();
  private lastActionTime = 0;
  private readonly actionCooldown = 50; // 50ms minimum between actions

  constructor(walletAddress: string, sendTransaction: PrivySendTransaction) {
    this.walletAddress = walletAddress;
    this.sendTransaction = sendTransaction;
  }

  /**
   * Set event handlers for contract interactions
   */
  setEventHandlers(handlers: {
    onGameStarted?: (sessionId: string, txHash: string) => void;
    onActionRecorded?: (actionType: string, txHash: string) => void;
    onGameFinished?: (score: number, txHash: string | null) => void;
    onError?: (error: string) => void;
  }) {
    this.onGameStarted = handlers.onGameStarted;
    this.onActionRecorded = handlers.onActionRecorded;
    this.onGameFinished = handlers.onGameFinished;
    this.onError = handlers.onError;
  }

  /**
   * Step 1: Check and verify MGID wallet address
   * Player must have at least 0.1 MON
   */
  async checkWalletEligibility(): Promise<WalletInfo> {
    try {
      console.log('🔍 Checking wallet eligibility for:', this.walletAddress);
      
      const balance = await publicClient.getBalance({
        address: this.walletAddress as `0x${string}`,
      });

      const minimumBalance = BigInt('100000000000000000'); // 0.1 MON in wei
      const hasMinimumBalance = balance >= minimumBalance;

      console.log('💰 Wallet balance:', balance.toString(), 'wei');
      console.log('✅ Has minimum balance:', hasMinimumBalance);

      return {
        address: this.walletAddress,
        balance,
        hasMinimumBalance,
      };
    } catch (error) {
      console.error('❌ Error checking wallet eligibility:', error);
      throw new Error('Failed to check wallet balance');
    }
  }

  /**
   * Step 2: Check if player can start a new game (cooldown check)
   */
  async checkGameStartEligibility(): Promise<GameContractState> {
    try {
      console.log('🎮 Checking game start eligibility...');
      
      const canStart = await canPlayerStartGame(this.walletAddress as `0x${string}`);
      const cooldownRemaining = canStart ? 0 : await getCooldownTimeRemaining(this.walletAddress as `0x${string}`);

      return {
        canStartGame: canStart,
        cooldownRemaining,
        isContractReady: true,
        lastError: null,
      };
    } catch (error) {
      console.error('❌ Error checking game eligibility:', error);
      return {
        canStartGame: false,
        cooldownRemaining: 0,
        isContractReady: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Step 3: Start game - First contract interaction
   */
  async startGame(sessionId: string): Promise<string> {
    try {
      console.log('🚀 Starting game on-chain for session:', sessionId);
      
      const txHash = await startGameFromWallet(sessionId, this.walletAddress, this.sendTransaction);
      console.log('✅ Game started! Transaction:', txHash);

      // Set up event watching for this session
      this.watchGameEvents(sessionId);

      if (this.onGameStarted) {
        this.onGameStarted(sessionId, txHash);
      }

      return txHash;
    } catch (error) {
      console.error('❌ Error starting game:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start game';
      
      if (this.onError) {
        this.onError(errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Step 4: Record game actions during gameplay
   */
  async recordGameAction(
    sessionId: string,
    actionType: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss',
    value: number = 0
  ): Promise<string> {
    // Create unique action key for deduplication
    const actionKey = `${sessionId}-${actionType}-${value}`;
    const now = Date.now();
    
    // Check if this action is already pending
    if (this.pendingActions.has(actionKey)) {
      console.log('� Action already pending, skipping:', actionType);
      throw new Error('Action already pending');
    }
    
    // Rate limiting check
    if (now - this.lastActionTime < this.actionCooldown) {
      console.log('⏳ Action rate limited, skipping:', actionType);
      throw new Error('Action rate limited');
    }
    
    try {
      this.pendingActions.add(actionKey);
      this.lastActionTime = now;
      
      console.log('�📝 Recording action:', actionType, 'for session:', sessionId);
      
      // Map action types to contract action IDs
      const actionTypeMap: Record<string, keyof typeof ACTION_TYPES> = {
        'logo': 'LOGO_TAP',      // Monad logo tap
        'glitch': 'GLITCH_TAP',  // Glitch tap  
        'gift': 'HELPFUL_CARD',  // Gift box tap (helpful card)
        'bomb': 'CHAOTIC_CARD',  // Bomb tap (chaotic card)
        'miss': 'WILD_CARD',     // Miss/empty tap (wild card - shouldn't happen but fallback)
      };

      const contractActionType = actionTypeMap[actionType] as keyof typeof ACTION_TYPES;
      const txHash = await recordActionFromServer(sessionId, contractActionType, value, this.walletAddress);
      
      console.log('✅ Action recorded! Transaction:', txHash);

      if (this.onActionRecorded) {
        this.onActionRecorded(actionType, txHash);
      }

      return txHash;
    } catch (error) {
      console.error('❌ Error recording action:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to record action';
      
      if (this.onError) {
        this.onError(errorMessage);
      }
      
      throw new Error(errorMessage);
    } finally {
      // Always remove from pending set
      this.pendingActions.delete(actionKey);
    }
  }

  /**
   * Step 5: Finish session - Only update MGID (no blockchain transaction)
   */
  async finishGameSession(session: GameSession): Promise<void> {
    try {
      console.log('🏁 Finishing game session:', session.id);
      console.log('📊 Final score:', session.gameState.score);
      console.log('🎯 Total actions:', session.actions.length);

      // Update MGID using backend server wallet (PRIVATE_KEY) - no blockchain finish transaction needed
      const mgidUpdateResult = await this.updateMGIDData(
        session.gameState.score,
        session.actions.length
      );

      console.log('✅ MGID updated:', mgidUpdateResult);

      if (this.onGameFinished) {
        // Pass null as txHash since we're not doing a finish transaction
        this.onGameFinished(session.gameState.score, null);
      }

      console.log('🎉 Game session completed successfully!');
    } catch (error) {
      console.error('❌ Error finishing game session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to finish game';
      
      if (this.onError) {
        this.onError(errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Update MGID data using backend server (PRIVATE_KEY wallet)
   */
  private async updateMGIDData(score: number, actions: number): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      console.log('📡 Updating MGID data via backend...');
      
      const response = await fetch('/api/mgid/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerAddress: this.walletAddress,
          score,
          actions,
        }),
      });

      if (!response.ok) {
        throw new Error(`MGID update failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Error updating MGID:', error);
      throw error;
    }
  }

  /**
   * Watch for game events during gameplay
   */
  private async watchGameEvents(sessionId: string) {
    try {
      console.log('👀 Watching events for session:', sessionId);
      
      await watchGameEvents(this.walletAddress, {
        onGameStarted: (session: string) => {
          if (session === sessionId) {
            console.log('🎮 Game started event received for session:', session);
          }
        },
        onActionRecorded: (session: string, kind: number, value: number) => {
          if (session === sessionId) {
            console.log('📝 Action recorded event:', kind, value);
          }
        },
        onGameFinished: (session: string, finalScore: number) => {
          if (session === sessionId) {
            console.log('🏁 Game finished event:', finalScore);
          }
        },
      });
    } catch (error) {
      console.error('❌ Error watching events:', error);
    }
  }

  /**
   * Batch record multiple actions (for better gas efficiency)
   */
  async recordBatchActions(
    sessionId: string,
    actions: Array<{ type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss'; value: number }>
  ): Promise<string[]> {
    try {
      console.log('📦 Recording batch actions:', actions.length);
      
      const txHashes: string[] = [];
      
      // For now, record actions sequentially
      // In a more advanced implementation, we could batch them in a single transaction
      for (const action of actions) {
        try {
          const txHash = await this.recordGameAction(sessionId, action.type, action.value);
          txHashes.push(txHash);
        } catch (error) {
          console.warn('⚠️ Failed to record action:', action.type, error);
          // Continue with other actions even if one fails
        }
      }

      return txHashes;
    } catch (error) {
      console.error('❌ Error recording batch actions:', error);
      throw error;
    }
  }

  /**
   * Get current player stats from contract
   */
  async getPlayerStats(): Promise<{
    lastGameStart: number;
    walletAddress: string;
  } | null> {
    try {
      const lastGameStart = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.MONAD_RUSH,
        abi: MONAD_RUSH_ABI,
        functionName: 'lastGameStart',
        args: [this.walletAddress as `0x${string}`],
      });

      return {
        lastGameStart: Number(lastGameStart),
        walletAddress: this.walletAddress,
      };
    } catch (error) {
      console.error('❌ Error getting player stats:', error);
      return null;
    }
  }
}
