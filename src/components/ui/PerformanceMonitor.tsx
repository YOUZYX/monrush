/**
 * Performance Monitor for MonadRush
 * Tracks FPS, memory usage, and object pool statistics
 */

import React, { useState, useEffect, useRef } from 'react';
import { gameObjectPool } from '@/lib/object-pool';

interface PerformanceStats {
  fps: number;
  avgFps: number;
  frameTime: number;
  objectPools: Record<string, { total: number; inUse: number; available: number }>;
  memoryUsage?: number;
}

interface PerformanceMonitorProps {
  isVisible?: boolean;
  className?: string;
}

export function PerformanceMonitor({ isVisible = false, className = '' }: PerformanceMonitorProps) {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    avgFps: 0,
    frameTime: 0,
    objectPools: {},
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsHistoryRef = useRef<number[]>([]);
  const animationIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isVisible) {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      return;
    }

    const updateStats = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTimeRef.current;
      
      if (deltaTime >= 1000) { // Update every second
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        
        // Maintain FPS history for average calculation
        fpsHistoryRef.current.push(fps);
        if (fpsHistoryRef.current.length > 10) {
          fpsHistoryRef.current.shift();
        }
        
        const avgFps = Math.round(
          fpsHistoryRef.current.reduce((sum, f) => sum + f, 0) / fpsHistoryRef.current.length
        );

        // Get memory usage if available
        const memoryInfo = (performance as any).memory as { usedJSHeapSize: number } | undefined;
        const memoryUsage = memoryInfo?.usedJSHeapSize 
          ? Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024 * 100) / 100
          : undefined;

        setStats({
          fps,
          avgFps,
          frameTime: Math.round(deltaTime / frameCountRef.current * 100) / 100,
          objectPools: gameObjectPool.getPoolStats(),
          memoryUsage,
        });

        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }

      frameCountRef.current++;
      animationIdRef.current = requestAnimationFrame(updateStats);
    };

    animationIdRef.current = requestAnimationFrame(updateStats);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getFpsColor = (fps: number) => {
    if (fps >= 55) return 'text-success-lime';
    if (fps >= 45) return 'text-electric-cyan';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-danger';
  };

  return (
    <div 
      className={`fixed top-4 right-4 bg-charcoal/90 backdrop-blur-sm border border-purple-accent/40 rounded-lg p-3 font-mono text-xs z-50 ${className}`}
      style={{ minWidth: '200px' }}
    >
      <div className="text-electric-cyan font-bold mb-2">Performance Monitor</div>
      
      {/* FPS Stats */}
      <div className="mb-2">
        <div className={`${getFpsColor(stats.fps)} font-bold`}>
          FPS: {stats.fps} (avg: {stats.avgFps})
        </div>
        <div className="text-soft-white/60">
          Frame: {stats.frameTime}ms
        </div>
      </div>

      {/* Memory Usage */}
      {stats.memoryUsage && (
        <div className="mb-2">
          <div className="text-soft-white/80">
            Memory: {stats.memoryUsage} MB
          </div>
        </div>
      )}

      {/* Object Pool Stats */}
      <div className="border-t border-purple-accent/20 pt-2">
        <div className="text-purple-accent font-bold mb-1">Object Pools</div>
        {Object.entries(stats.objectPools).map(([type, pool]) => (
          <div key={type} className="flex justify-between text-soft-white/70">
            <span>{type}:</span>
            <span>{pool.inUse}/{pool.total}</span>
          </div>
        ))}
      </div>

      {/* Performance Indicators */}
      <div className="border-t border-purple-accent/20 pt-2 mt-2">
        <div className="flex justify-between items-center">
          <span className="text-soft-white/60">Target:</span>
          <div className={`w-2 h-2 rounded-full ${stats.fps >= 55 ? 'bg-success-lime' : 'bg-danger'}`} />
        </div>
      </div>
    </div>
  );
}

// Hook for accessing performance stats
export function usePerformanceStats() {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    avgFps: 0,
    frameTime: 0,
    objectPools: {},
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const updateStats = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / deltaTime);
        
        setStats(prev => ({
          fps,
          avgFps: Math.round((prev.avgFps * 0.9 + fps * 0.1)), // Smoothed average
          frameTime: Math.round(deltaTime / frameCount * 100) / 100,
          objectPools: gameObjectPool.getPoolStats(),
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      frameCount++;
      animationId = requestAnimationFrame(updateStats);
    };

    animationId = requestAnimationFrame(updateStats);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return stats;
}
