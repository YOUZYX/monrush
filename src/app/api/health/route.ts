/**
 * Health Check API for MonadRush
 * Monitors system health, database connectivity, and external dependencies
 */

import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: HealthStatus;
    external_apis: HealthStatus;
    memory: HealthStatus;
    response_time: HealthStatus;
  };
  uptime: number;
  environment: string;
}

interface HealthStatus {
  status: 'pass' | 'warn' | 'fail';
  responseTime?: number;
  message?: string;
  lastCheck: string;
}

const startTime = Date.now();

export async function GET(request: NextRequest): Promise<NextResponse> {
  const checkStartTime = Date.now();
  
  try {
    // Run all health checks in parallel
    const [dbCheck, apiCheck, memoryCheck] = await Promise.allSettled([
      checkDatabase(),
      checkExternalAPIs(),
      checkMemoryUsage(),
    ]);

    const responseTime = Date.now() - checkStartTime;
    
    const checks = {
      database: dbCheck.status === 'fulfilled' ? dbCheck.value : {
        status: 'fail' as const,
        message: dbCheck.status === 'rejected' ? dbCheck.reason?.message : 'Database check failed',
        lastCheck: new Date().toISOString(),
      },
      external_apis: apiCheck.status === 'fulfilled' ? apiCheck.value : {
        status: 'fail' as const,
        message: apiCheck.status === 'rejected' ? apiCheck.reason?.message : 'External API check failed',
        lastCheck: new Date().toISOString(),
      },
      memory: memoryCheck.status === 'fulfilled' ? memoryCheck.value : {
        status: 'warn' as const,
        message: 'Memory check unavailable',
        lastCheck: new Date().toISOString(),
      },
      response_time: {
        status: responseTime < 1000 ? 'pass' as const : responseTime < 3000 ? 'warn' as const : 'fail' as const,
        responseTime,
        message: `Health check completed in ${responseTime}ms`,
        lastCheck: new Date().toISOString(),
      },
    };

    // Determine overall health status
    const overallStatus = determineOverallStatus(checks);
    
    const health: HealthCheck = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      environment: process.env.NODE_ENV || 'unknown',
    };

    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: httpStatus });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      environment: process.env.NODE_ENV || 'unknown',
    }, { status: 503 });
  }
}

async function checkDatabase(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Test KV connection with a simple operation
    const testKey = 'health_check_test';
    const testValue = Date.now().toString();
    
    await kv.set(testKey, testValue, { ex: 60 }); // Expire in 60 seconds
    const retrievedValue = await kv.get(testKey);
    
    if (retrievedValue !== testValue) {
      throw new Error('KV read/write test failed');
    }
    
    // Clean up test data
    await kv.del(testKey);
    
    const responseTime = Date.now() - startTime;
    
    return {
      status: responseTime < 500 ? 'pass' : 'warn',
      responseTime,
      message: `KV database responding in ${responseTime}ms`,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: `Database check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkExternalAPIs(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Check MGID API availability
    const mgidResponse = await fetch('https://monad-games-id-site.vercel.app/api/leaderboard/65?page=1&limit=1', {
      method: 'GET',
      headers: {
        'User-Agent': 'MonadRush-HealthCheck/1.0',
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!mgidResponse.ok) {
      throw new Error(`MGID API returned ${mgidResponse.status}`);
    }

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 2000 ? 'pass' : 'warn',
      responseTime,
      message: `External APIs responding in ${responseTime}ms`,
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'fail',
      responseTime: Date.now() - startTime,
      message: `External API check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkMemoryUsage(): Promise<HealthStatus> {
  try {
    // Check if performance.memory is available (Chrome-based browsers)
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory as {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
      };
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const usage = (usedMB / totalMB) * 100;

      return {
        status: usage < 80 ? 'pass' : usage < 90 ? 'warn' : 'fail',
        message: `Memory usage: ${usedMB}MB / ${totalMB}MB (${usage.toFixed(1)}%)`,
        lastCheck: new Date().toISOString(),
      };
    }

    // Fallback for Node.js environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memory = process.memoryUsage();
      const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
      const totalMB = Math.round(memory.heapTotal / 1024 / 1024);
      const usage = (usedMB / totalMB) * 100;

      return {
        status: usage < 80 ? 'pass' : usage < 90 ? 'warn' : 'fail',
        message: `Server memory: ${usedMB}MB / ${totalMB}MB (${usage.toFixed(1)}%)`,
        lastCheck: new Date().toISOString(),
      };
    }

    return {
      status: 'warn',
      message: 'Memory monitoring not available',
      lastCheck: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'warn',
      message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastCheck: new Date().toISOString(),
    };
  }
}

function determineOverallStatus(checks: HealthCheck['checks']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(checks).map(check => check.status);
  
  if (statuses.includes('fail')) {
    // If database or critical systems are failing
    if (checks.database.status === 'fail') {
      return 'unhealthy';
    }
    return 'degraded';
  }
  
  if (statuses.includes('warn')) {
    return 'degraded';
  }
  
  return 'healthy';
}
