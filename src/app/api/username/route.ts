import { NextRequest, NextResponse } from 'next/server';
import { MGID_API_BASE } from '@/lib/mgid';

// Cache for username lookups (in-memory for now, use Redis/KV in production)
const usernameCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Check cache first
    const cached = usernameCache.get(address.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.data);
    }

    // Fetch from MGID API
    const response = await fetch(
      `${MGID_API_BASE}/api/check-wallet?wallet=${address}`,
      {
        headers: {
          'User-Agent': 'MonadRush/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`MGID API responded with ${response.status}`);
    }

    const data = await response.json();

    // Cache the result
    usernameCache.set(address.toLowerCase(), {
      data,
      timestamp: Date.now(),
    });

    // Clean old cache entries periodically
    if (usernameCache.size > 1000) {
      const cutoff = Date.now() - CACHE_DURATION;
      for (const [key, value] of usernameCache.entries()) {
        if (value.timestamp < cutoff) {
          usernameCache.delete(key);
        }
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Username lookup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch username',
        hasUsername: false 
      },
      { status: 500 }
    );
  }
}
