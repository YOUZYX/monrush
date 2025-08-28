/**
 * Contract definitions and Viem client setup for MonadRush
 * Includes simulation functions for early testing
 */

import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { simulateContract } from 'viem/actions';
import { privateKeyToAccount } from 'viem/accounts';

// Monad Testnet chain configuration
export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz/'],
    },
    public: {
      http: ['https://testnet-rpc.monad.xyz/'],
    },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
} as const;

// Contract ABIs - Public version (players can call directly)
export const MonadRushAbi = parseAbi([
  // Constructor
  'constructor(address _gamesID)',
  
  // Main functions (public - players can call directly)
  'function startGame(string sessionId) external',
  'function recordAction(string sessionId, uint8 kind, uint32 value) external',
  'function finishSession(string sessionId, uint256 finalScore, uint256 totalActions) external',
  
  // View functions
  'function getPlayerStats(address player) external view returns (uint256 gamesPlayed, uint256 actionsRecorded, uint256 bestScore)',
  'function owner() external view returns (address)',
  'function GAME_START_COOLDOWN() external view returns (uint256)',
  
  // Admin functions
  'function transferOwnership(address newOwner) external',
  'function updateGamesID(address _gamesID) external',
  
  // Events
  'event GameStarted(address indexed player, string sessionId, uint256 timestamp)',
  'event ActionRecorded(address indexed player, string sessionId, uint8 kind, uint32 value, uint256 timestamp)',
  'event GameFinished(address indexed player, string sessionId, uint256 finalScore, uint256 timestamp)',
]);

export const MGIDContractAbi = parseAbi([
  'function registerGame(address game, string name, string image, string url) external',
  'function updatePlayerData(address player, uint256 scoreDelta, uint256 txDelta) external',
  'function playerDataPerGame(address game, address player) external view returns (uint256 score, uint256 transactions)',
]);

// Contract addresses (updated with new public contract)
export const CONTRACT_ADDRESSES = {
  MONAD_RUSH: process.env.NEXT_PUBLIC_MONADRUSH_CONTRACT as `0x${string}` || '0x420Ed53831d4EF34122E632842e73BeeecD9397B',
  MGID: process.env.NEXT_PUBLIC_MGID_CONTRACT as `0x${string}` || '0xceCBFF203C8B6044F52CE23D914A1bfD997541A4',
} as const;

// RPC URLs
const RPC_URLS = {
  PUBLIC: process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet-rpc.monad.xyz',
  ALCHEMY: process.env.NEXT_ALCHEMY_RPC_URL || 'https://monad-testnet.g.alchemy.com/v2/EvHiQuQyGfLofKEspCn7fQrQzX3w4_Oe',
} as const;

// Public client for reading
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(RPC_URLS.PUBLIC),
});

// Wallet client for server-side operations (server only)
export function createServerWalletClient() {
  const privateKey = process.env.SERVER_WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SERVER_WALLET_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  return createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(RPC_URLS.ALCHEMY), // Use Alchemy for server operations
  });
}

// Action types for contract calls
export const ACTION_TYPES = {
  LOGO_TAP: 0,
  GLITCH_TAP: 1,
  HELPFUL_CARD: 2,
  CHAOTIC_CARD: 3,
  WILD_CARD: 4,
} as const;

// Contract simulation functions for early testing
export class ContractSimulator {
  private publicClient = publicClient;

  /**
   * Simulate startGame contract call (player calls directly)
   */
  async simulateStartGame(player: `0x${string}`, sessionId: string) {
    try {
      const { request } = await simulateContract(this.publicClient, {
        address: CONTRACT_ADDRESSES.MONAD_RUSH,
        abi: MonadRushAbi,
        functionName: 'startGame',
        args: [sessionId],
        account: player, // Player calls directly
      });

      console.log('✅ startGame simulation successful');
      console.log('Gas estimate:', request);
      return { success: true, request };
    } catch (error) {
      console.error('❌ startGame simulation failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Simulate recordAction contract call (player calls directly)
   */
  async simulateRecordAction(
    player: `0x${string}`,
    sessionId: string,
    kind: number,
    value: number
  ) {
    try {
      const { request } = await simulateContract(this.publicClient, {
        address: CONTRACT_ADDRESSES.MONAD_RUSH,
        abi: MonadRushAbi,
        functionName: 'recordAction',
        args: [sessionId, kind, value],
        account: player, // Player calls directly
      });

      console.log('✅ recordAction simulation successful');
      console.log('Gas estimate:', request);
      return { success: true, request };
    } catch (error) {
      console.error('❌ recordAction simulation failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Simulate finishSession contract call (player calls directly)
   */
  async simulateFinishSession(player: `0x${string}`, sessionId: string, finalScore: bigint, totalActions: bigint) {
    try {
      const { request } = await simulateContract(this.publicClient, {
        address: CONTRACT_ADDRESSES.MONAD_RUSH,
        abi: MonadRushAbi,
        functionName: 'finishSession',
        args: [sessionId, finalScore, totalActions],
        account: player, // Player calls directly
      });

      console.log('✅ finishSession simulation successful');
      console.log('Gas estimate:', request);
      return { success: true, request };
    } catch (error) {
      console.error('❌ finishSession simulation failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Simulate MGID updatePlayerData call
   */
  async simulateMGIDUpdate(
    player: `0x${string}`,
    scoreDelta: bigint,
    txDelta: bigint
  ) {
    try {
      const { request } = await simulateContract(this.publicClient, {
        address: CONTRACT_ADDRESSES.MGID,
        abi: MGIDContractAbi,
        functionName: 'updatePlayerData',
        args: [player, scoreDelta, txDelta],
        account: CONTRACT_ADDRESSES.MONAD_RUSH, // Called by our contract
      });

      console.log('✅ MGID updatePlayerData simulation successful');
      console.log('Gas estimate:', request);
      return { success: true, request };
    } catch (error) {
      console.error('❌ MGID updatePlayerData simulation failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Test all contract functions with mock data
   */
  async testAllFunctions() {
    const mockPlayer = '0x1234567890123456789012345678901234567890' as `0x${string}`;
    const mockSessionId = 'test-session-' + Date.now();
    const results = [];

    console.log('🧪 Testing contract function simulations...\n');

    // Test startGame
    console.log('1. Testing startGame...');
    const startResult = await this.simulateStartGame(mockPlayer, mockSessionId);
    results.push({ function: 'startGame', ...startResult });

    // Test recordAction
    console.log('\n2. Testing recordAction...');
    const actionResult = await this.simulateRecordAction(mockPlayer, mockSessionId, ACTION_TYPES.LOGO_TAP, 1);
    results.push({ function: 'recordAction', ...actionResult });

    // Test finishSession
    console.log('\n3. Testing finishSession...');
    const finishResult = await this.simulateFinishSession(mockPlayer, mockSessionId, BigInt(1500), BigInt(5));
    results.push({ function: 'finishSession', ...finishResult });

    // Test MGID update
    console.log('\n4. Testing MGID updatePlayerData...');
    const mgidResult = await this.simulateMGIDUpdate(mockPlayer, BigInt(1500), BigInt(5));
    results.push({ function: 'updatePlayerData', ...mgidResult });

    console.log('\n📊 Simulation Results Summary:');
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.function}: ${result.success ? 'PASS' : 'FAIL'}`);
    });

    return results;
  }
}

// Helper functions for contract interactions

/**
 * Get expected calldata format for startGame
 */
export function getStartGameCalldata(player: `0x${string}`, sessionId: string) {
  // This will be used to understand the exact format needed
  return {
    to: CONTRACT_ADDRESSES.MONAD_RUSH,
    data: `startGame(${player}, ${sessionId})`,
    estimatedGas: '50000', // Placeholder
  };
}

/**
 * Get expected calldata format for recordAction
 */
export function getRecordActionCalldata(
  player: `0x${string}`,
  sessionId: string,
  kind: number,
  value: number
) {
  return {
    to: CONTRACT_ADDRESSES.MONAD_RUSH,
    data: `recordAction(${player}, ${sessionId}, ${kind}, ${value})`,
    estimatedGas: '30000', // Placeholder
  };
}

/**
 * Get expected calldata format for finishSession
 */
export function getFinishSessionCalldata(
  player: `0x${string}`,
  sessionId: string,
  finalScore: bigint,
  totalActions: bigint
) {
  return {
    to: CONTRACT_ADDRESSES.MONAD_RUSH,
    data: `finishSession(${player}, ${sessionId}, ${finalScore}, ${totalActions})`,
    estimatedGas: '80000', // Placeholder (includes MGID call)
  };
}

/**
 * Validate contract addresses are set
 */
export function validateContractAddresses(): boolean {
  const isMonadRushSet = CONTRACT_ADDRESSES.MONAD_RUSH !== '0x0000000000000000000000000000000000000000';
  const isMGIDSet = CONTRACT_ADDRESSES.MGID !== '0x0000000000000000000000000000000000000000';
  
  if (!isMonadRushSet) {
    console.warn('⚠️  MONAD_RUSH contract address not set');
  }
  if (!isMGIDSet) {
    console.warn('⚠️  MGID contract address not set');
  }
  
  console.log('📍 Contract Addresses:');
  console.log(`MonadRush: ${CONTRACT_ADDRESSES.MONAD_RUSH}`);
  console.log(`MGID: ${CONTRACT_ADDRESSES.MGID}`);
  
  return isMonadRushSet && isMGIDSet;
}

// Export singleton instance
export const contractSimulator = new ContractSimulator();
