/**
 * Client-side session management for server integration
 * Handles session lifecycle and action batching
 */

interface StartSessionResponse {
  success: boolean;
  sessionId: string;
  seed: number;
  error?: string;
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

interface ActionResponse {
  success: boolean;
  validated: number;
  rejected: number;
  stateHash: string;
  desync?: boolean;
  error?: string;
}

interface TapAction {
  timestamp: number;
  position: { x: number; y: number };
  type: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
  targetId?: string;
  value?: number;
}

/**
 * Session API client for MonadRush
 */
export class SessionAPI {
  private authToken: string | null = null;
  private currentSessionId: string | null = null;
  private actionBuffer: TapAction[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private lastStateHash: string | null = null;
  
  // Configuration
  private readonly BATCH_INTERVAL = 1500; // 1.5 seconds
  private readonly MAX_BUFFER_SIZE = 20;

  /**
   * Set authentication token from Privy
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Clear authentication and session data
   */
  clearAuth() {
    this.authToken = null;
    this.currentSessionId = null;
    this.actionBuffer = [];
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Start a new game session
   */
  async startSession(): Promise<StartSessionResponse> {
    if (!this.authToken) {
      throw new Error('No authentication token available');
    }

    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        this.currentSessionId = data.sessionId;
        this.actionBuffer = [];
        this.lastStateHash = null;
        
        // Start action batching timer
        this.startActionBatching();
      }

      return data;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw new Error('Session start failed');
    }
  }

  /**
   * Finish current session
   */
  async finishSession(
    clientFinalScore: number,
    tapHistory: Array<{
      timestamp: number;
      position: { x: number; y: number };
      result: 'logo' | 'glitch' | 'gift' | 'bomb' | 'miss';
    }>
  ): Promise<FinishSessionResponse> {
    if (!this.authToken || !this.currentSessionId) {
      throw new Error('No active session');
    }

    // Flush any remaining actions before finishing
    await this.flushActions();

    // Stop action batching
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const response = await fetch('/api/session/finish', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.currentSessionId,
          clientFinalScore,
          tapHistory,
        }),
      });

      const data = await response.json();

      // Clear session data
      this.currentSessionId = null;
      this.actionBuffer = [];
      this.lastStateHash = null;

      return data;
    } catch (error) {
      console.error('Failed to finish session:', error);
      throw new Error('Session finish failed');
    }
  }

  /**
   * Record an action (buffered and batched)
   */
  recordAction(action: TapAction) {
    if (!this.currentSessionId) {
      console.warn('Cannot record action: no active session');
      return;
    }

    this.actionBuffer.push(action);

    // Force flush if buffer is full
    if (this.actionBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.flushActions();
    }
  }

  /**
   * Start periodic action batching
   */
  private startActionBatching() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(() => {
      if (this.actionBuffer.length > 0) {
        this.flushActions();
      }
    }, this.BATCH_INTERVAL);
  }

  /**
   * Flush buffered actions to server
   */
  private async flushActions(): Promise<ActionResponse | null> {
    if (!this.authToken || !this.currentSessionId || this.actionBuffer.length === 0) {
      return null;
    }

    const actionsToSend = [...this.actionBuffer];
    this.actionBuffer = []; // Clear buffer immediately

    try {
      const response = await fetch('/api/action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.currentSessionId,
          actions: actionsToSend,
          clientStateHash: this.lastStateHash,
        }),
      });

      const data: ActionResponse = await response.json();

      if (data.success) {
        this.lastStateHash = data.stateHash;

        // Check for desync
        if (data.desync) {
          console.warn('Client-server desync detected!', {
            serverHash: data.stateHash,
            clientHash: this.lastStateHash,
          });
          
          // Could emit an event here for the game to handle desync
          // this.onDesync?.(data);
        }

        // Log validation results
        if (data.rejected > 0) {
          console.warn(`${data.rejected} actions rejected by server anti-cheat`);
        }
      } else {
        console.error('Action validation failed:', data.error);
        
        // Re-add actions to buffer for retry (optional)
        // this.actionBuffer.unshift(...actionsToSend);
      }

      return data;
    } catch (error) {
      console.error('Failed to flush actions:', error);
      
      // Re-add actions to buffer for retry (optional)
      // this.actionBuffer.unshift(...actionsToSend);
      
      return null;
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Check if there's an active session
   */
  hasActiveSession(): boolean {
    return this.currentSessionId !== null;
  }
}

// Global session API instance
export const sessionAPI = new SessionAPI();

// Helper to initialize session API with Privy token
export function initializeSessionAPI(authToken: string) {
  sessionAPI.setAuthToken(authToken);
}

// Helper to clear session API
export function clearSessionAPI() {
  sessionAPI.clearAuth();
}
