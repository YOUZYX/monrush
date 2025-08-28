/**
 * Error Boundary and Error Handling System for MonadRush
 * Provides graceful error recovery and user-friendly error messages
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    retryCount: 0,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Report error to monitoring service
    this.reportError(error, errorInfo);

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In production, you'd send this to an error monitoring service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    // For now, just log it
    console.error('Error Report:', errorReport);
    
    // You could send to Sentry, LogRocket, etc.
    // Sentry.captureException(error, { contexts: { errorInfo } });
  };

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
          <motion.div
            className="bg-glass border border-danger/40 rounded-2xl p-8 w-full max-w-md backdrop-blur-lg shadow-2xl text-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-6xl mb-4">🚫</div>
            
            <h1 className="text-2xl font-futuristic font-bold text-danger mb-4">
              Something went wrong
            </h1>
            
            <p className="text-soft-white/80 mb-6">
              MonadRush encountered an unexpected error. Don&apos;t worry, your progress is safe!
            </p>

            <div className="space-y-3">
              {this.state.retryCount < this.maxRetries && (
                <motion.button
                  onClick={this.handleRetry}
                  className="w-full px-6 py-3 bg-electric-cyan text-charcoal font-futuristic font-bold rounded-lg hover:bg-electric-cyan/80 transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  TRY AGAIN ({this.maxRetries - this.state.retryCount} attempts left)
                </motion.button>
              )}
              
              <motion.button
                onClick={this.handleReload}
                className="w-full px-6 py-3 bg-purple-accent text-soft-white font-futuristic font-bold rounded-lg hover:bg-purple-accent/80 transition-all duration-300"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                RELOAD GAME
              </motion.button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-danger cursor-pointer">Error Details (Dev)</summary>
                <pre className="mt-2 text-xs bg-charcoal/50 p-3 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Network Error Handler
export class NetworkErrorHandler {
  private static instance: NetworkErrorHandler;
  private retryAttempts = new Map<string, number>();
  private maxRetries = 3;
  private baseDelay = 1000;

  static getInstance(): NetworkErrorHandler {
    if (!NetworkErrorHandler.instance) {
      NetworkErrorHandler.instance = new NetworkErrorHandler();
    }
    return NetworkErrorHandler.instance;
  }

  async withRetry<T>(
    operation: () => Promise<T>,
    operationId: string,
    customMaxRetries?: number
  ): Promise<T> {
    const maxRetries = customMaxRetries ?? this.maxRetries;
    const attempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      // Reset retry count on success
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      if (attempts < maxRetries) {
        const delay = this.baseDelay * Math.pow(2, attempts); // Exponential backoff
        this.retryAttempts.set(operationId, attempts + 1);
        
        console.warn(`Operation ${operationId} failed, retrying in ${delay}ms (attempt ${attempts + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(operation, operationId, customMaxRetries);
      }
      
      // Max retries exceeded
      this.retryAttempts.delete(operationId);
      throw new Error(`Operation ${operationId} failed after ${maxRetries} attempts: ${error}`);
    }
  }
}

// Loading States Manager
export interface LoadingState {
  isLoading: boolean;
  loadingText: string;
  progress?: number;
}

export function LoadingOverlay({ 
  isLoading, 
  loadingText, 
  progress 
}: LoadingState) {
  if (!isLoading) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="bg-glass border border-electric-cyan/40 rounded-2xl p-8 backdrop-blur-lg shadow-2xl text-center max-w-md w-full mx-4">
        <motion.div
          className="text-4xl mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          🎮
        </motion.div>
        
        <h3 className="text-xl font-futuristic font-bold text-electric-cyan mb-2">
          {loadingText}
        </h3>
        
        {progress !== undefined && (
          <div className="w-full bg-charcoal/50 rounded-full h-2 mb-4">
            <motion.div
              className="bg-electric-cyan h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
        
        <div className="flex items-center justify-center space-x-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-electric-cyan rounded-full"
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Error Toast Component
export function ErrorToast({ 
  error, 
  onDismiss 
}: { 
  error: string | null; 
  onDismiss: () => void; 
}) {
  if (!error) return null;

  return (
    <motion.div
      className="fixed top-4 right-4 bg-danger/90 backdrop-blur-sm border border-danger rounded-lg p-4 shadow-lg z-50 max-w-sm"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 300, opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start space-x-3">
        <div className="text-xl">⚠️</div>
        <div className="flex-1">
          <p className="text-soft-white font-futuristic text-sm">
            {error}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-soft-white/60 hover:text-soft-white transition-colors"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
