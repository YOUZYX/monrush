/**
 * Enhanced Transaction Queue Manager
 * Handles sequential transaction processing with retry logic for nonce conflicts
 */

interface QueuedTransaction {
  id: string;
  sessionId: string;
  actionType: string;
  value: number;
  playerWallet: string;
  attempts: number;
  maxAttempts: number;
  priority: number;
  timestamp: number;
  resolve: (txHash: string) => void;
  reject: (error: Error) => void;
}

class TransactionQueueManager {
  private queue: QueuedTransaction[] = [];
  private isProcessing = false;
  private rateLimitDelay = 1500; // 1.5s between transactions to avoid nonce conflicts
  private maxRetries = 3;

  async queueTransaction(
    sessionId: string,
    actionType: string,
    value: number,
    playerWallet: string,
    priority: number = 0
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const transaction: QueuedTransaction = {
        id: `${sessionId}-${actionType}-${Date.now()}-${Math.random()}`,
        sessionId,
        actionType,
        value,
        playerWallet,
        attempts: 0,
        maxAttempts: this.maxRetries,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
      };

      // Insert with priority (higher priority first)
      const insertIndex = this.queue.findIndex(t => t.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(transaction);
      } else {
        this.queue.splice(insertIndex, 0, transaction);
      }

      console.log(`📋 Queued transaction: ${transaction.id} (priority: ${priority}, queue length: ${this.queue.length})`);
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing transaction queue (${this.queue.length} transactions)`);

    while (this.queue.length > 0) {
      const transaction = this.queue.shift()!;
      transaction.attempts++;
      
      try {
        console.log(`⚡ Processing transaction: ${transaction.id} (attempt ${transaction.attempts}/${transaction.maxAttempts})`);
        
        const response = await fetch('/api/record-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId: transaction.sessionId,
            actionType: transaction.actionType,
            value: transaction.value,
            playerWallet: transaction.playerWallet,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log(`✅ Transaction completed: ${transaction.id} - ${result.txHash}`);
        transaction.resolve(result.txHash);

        // Rate limiting delay between successful transactions
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Transaction failed: ${transaction.id} (attempt ${transaction.attempts}) - ${errorMessage}`);

        // Check if we should retry this transaction
        if (this.shouldRetryTransaction(error, transaction)) {
          console.log(`🔄 Retrying transaction: ${transaction.id} (${transaction.attempts}/${transaction.maxAttempts})`);
          
          // Add exponential backoff delay
          const retryDelay = Math.min(1000 * Math.pow(2, transaction.attempts - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          // Re-add to front of queue to maintain order
          this.queue.unshift(transaction);
        } else {
          // Max retries exceeded or non-retryable error
          console.error(`💥 Transaction failed permanently: ${transaction.id}`);
          transaction.reject(error instanceof Error ? error : new Error(errorMessage));
        }
      }
    }

    this.isProcessing = false;
    console.log(`✅ Transaction queue processing completed`);
  }

  /**
   * Determine if transaction should be retried based on error type
   */
  private shouldRetryTransaction(error: any, transaction: QueuedTransaction): boolean {
    if (transaction.attempts >= transaction.maxAttempts) {
      return false;
    }

    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Retry on specific blockchain and network errors
    const retryableErrors = [
      'another transaction has higher priority',
      'nonce too low',
      'nonce too high',
      'replacement transaction underpriced',
      'transaction underpriced',
      'network error',
      'timeout',
      'internal server error',
      'bad gateway',
      'service unavailable',
      'connection reset',
      'econnreset',
      'socket hang up',
    ];

    const shouldRetry = retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );

    console.log(`🤔 Should retry ${transaction.id}? ${shouldRetry} (error: "${errorMessage}")`);
    return shouldRetry;
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  clearQueue(): void {
    console.log(`🧹 Clearing transaction queue (${this.queue.length} transactions)`);
    // Reject all pending transactions
    this.queue.forEach(tx => tx.reject(new Error('Queue cleared')));
    this.queue = [];
    this.isProcessing = false;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.isProcessing,
    };
  }
}

// Export singleton instance
export const transactionQueue = new TransactionQueueManager();
