/**
 * Integration helper to connect existing game components with Phase 3 server APIs
 * This bridges the offline game engine with server-side validation and anti-cheat
 */

import { GameStateManager } from './game-state';
import { sessionAPI, initializeSessionAPI } from './session';
import { usePrivy } from '@privy-io/react-auth';
import { useState, useCallback, useEffect } from 'react';

export interface ServerIntegrationConfig {
  enableBatching: boolean;
  enableAntiCheat: boolean;
  debugMode: boolean;
}

/**
 * Hook to integrate server APIs with game state
 */
export function useServerIntegration(config: ServerIntegrationConfig = {
  enableBatching: true,
  enableAntiCheat: true,
  debugMode: false,
}) {
  const { user, getAccessToken } = usePrivy();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);

  // Initialize session API when user authenticates
  useEffect(() => {
    const initializeAuth = async () => {
      if (user && !sessionAPI.hasActiveSession()) {
        try {
          const token = await getAccessToken();
          if (token) {
            initializeSessionAPI(token);
            if (config.debugMode) {
              console.log('SessionAPI initialized with auth token');
            }
          }
        } catch (error) {
          console.error('Failed to initialize session API:', error);
        }
      }
    };

    initializeAuth();
  }, [user, getAccessToken, config.debugMode]);

  /**
   * Start a new server-validated session
   */
  const startServerSession = useCallback(async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const response = await sessionAPI.startSession();
      
      if (response.success) {
        setIsSessionActive(true);
        setServerSessionId(response.sessionId);
        setLastSyncTime(Date.now());
        
        if (config.debugMode) {
          console.log('Server session started:', {
            sessionId: response.sessionId,
            seed: response.seed,
          });
        }

        return {
          sessionId: response.sessionId,
          seed: response.seed,
        };
      } else {
        throw new Error(response.error || 'Failed to start server session');
      }
    } catch (error) {
      console.error('Server session start failed:', error);
      throw error;
    }
  }, [user, config.debugMode]);

  /**
   * Finish the current server session
   */
  const finishServerSession = useCallback(async (
    clientFinalScore: number,
    tapHistory: Array<{
      timestamp: number;
      position: { x: number; y: number };
      result: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
    }>
  ) => {
    if (!isSessionActive || !serverSessionId) {
      throw new Error('No active server session');
    }

    try {
      const response = await sessionAPI.finishSession(clientFinalScore, tapHistory);
      
      setIsSessionActive(false);
      setServerSessionId(null);
      
      if (config.debugMode) {
        console.log('Server session finished:', {
          finalScore: response.finalScore,
          isValid: response.isValid,
          stats: response.stats,
        });
      }

      return response;
    } catch (error) {
      console.error('Server session finish failed:', error);
      throw error;
    }
  }, [isSessionActive, serverSessionId, config.debugMode]);

  /**
   * Record an action to the server (batched)
   */
  const recordAction = useCallback((action: {
    timestamp: number;
    position: { x: number; y: number };
    type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
    targetId?: string;
    value?: number;
  }) => {
    if (!config.enableBatching || !isSessionActive) {
      if (config.debugMode && !isSessionActive) {
        console.warn('Action not recorded: no active session');
      }
      return;
    }

    sessionAPI.recordAction(action);
    setLastSyncTime(Date.now());

    if (config.debugMode) {
      console.log('Action recorded:', action);
    }
  }, [config.enableBatching, config.debugMode, isSessionActive]);

  /**
   * Enhanced game state manager with server integration
   */
  const createIntegratedGameManager = useCallback((
    config: { screenWidth: number; screenHeight: number; objectSize: { x: number; y: number } }
  ) => {
    const gameManager = new GameStateManager(config);

    // Note: Integration with tap processing will be handled at the component level
    // where we can access the actual tap results and forward them to recordAction
    
    return gameManager;
  }, []);

  /**
   * Process tap with server integration
   */
  const processTapWithServer = useCallback((
    position: { x: number; y: number },
    currentTime: number,
    result: {
      result: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
      targetId?: string;
    }
  ) => {
    // Record action to server if enabled
    if (config.enableBatching && isSessionActive) {
      recordAction({
        timestamp: currentTime,
        position,
        type: result.result,
        targetId: result.targetId,
      });
    }
  }, [recordAction, config.enableBatching, isSessionActive]);

  return {
    // Session state
    isSessionActive,
    serverSessionId,
    lastSyncTime,
    
    // Session management
    startServerSession,
    finishServerSession,
    recordAction,
    processTapWithServer,
    
    // Integration helpers
    createIntegratedGameManager,
    
    // Utilities
    hasAuthToken: () => sessionAPI.hasActiveSession(),
    clearSession: () => {
      sessionAPI.clearAuth();
      setIsSessionActive(false);
      setServerSessionId(null);
    },
  };
}

/**
 * Utility to validate client-side game state against server expectations
 */
export function validateClientState(
  clientScore: number,
  clientCombo: number,
  clientStreak: number,
  serverResponse?: {
    finalScore: number;
    isValid: boolean;
    scoreDifference?: number;
  }
): {
  isValid: boolean;
  differences: string[];
  riskLevel: 'low' | 'medium' | 'high';
} {
  const differences: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  if (serverResponse) {
    const scoreDiff = Math.abs(clientScore - serverResponse.finalScore);
    
    if (scoreDiff > 50) {
      differences.push(`Large score difference: ${scoreDiff} points`);
      riskLevel = 'high';
    } else if (scoreDiff > 10) {
      differences.push(`Moderate score difference: ${scoreDiff} points`);
      riskLevel = 'medium';
    }

    if (!serverResponse.isValid) {
      differences.push('Server marked session as invalid');
      riskLevel = 'high';
    }
  }

  // Client-side basic validations
  if (clientCombo > 5.0) {
    differences.push(`Combo exceeds maximum: ${clientCombo}`);
    riskLevel = 'high';
  }

  if (clientScore < 0) {
    differences.push(`Negative score: ${clientScore}`);
    riskLevel = 'high';
  }

  return {
    isValid: differences.length === 0,
    differences,
    riskLevel,
  };
}
