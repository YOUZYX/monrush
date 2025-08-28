/**
 * Server-side authentication utilities for MGID Cross-App integration
 * Handles JWT verification and wallet address extraction
 */

import { PrivyClient } from '@privy-io/server-auth';

// Initialize Privy client
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

if (!PRIVY_APP_SECRET) {
  throw new Error('PRIVY_APP_SECRET environment variable is required');
}

if (!PRIVY_APP_ID) {
  throw new Error('NEXT_PUBLIC_PRIVY_APP_ID environment variable is required');
}

const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

// Cross-App ID for Monad Games ID
const MGID_CROSS_APP_ID = 'cmd8euall0037le0my79qpz42';

// TypeScript interfaces for cross-app account structure
interface CrossAppAccount {
  type: string;
  providerApp?: {
    id: string;
  };
  embeddedWallets?: Array<{
    address: string;
  }>;
}

interface LinkedAccount {
  type: string;
  providerApp?: {
    id: string;
  };
}

export interface MGIDAuthResult {
  isValid: boolean;
  walletAddress: string | null;
  userId: string | null;
  error?: string;
}

/**
 * Verify Privy JWT token and extract MGID wallet address
 */
export async function verifyMGIDAuth(authToken: string): Promise<MGIDAuthResult> {
  try {
    if (!authToken || !authToken.startsWith('Bearer ')) {
      return {
        isValid: false,
        walletAddress: null,
        userId: null,
        error: 'Missing or invalid authorization header'
      };
    }

    const token = authToken.substring(7);
    
    // Verify the JWT token
    let verifiedClaims;
    try {
      verifiedClaims = await privy.verifyAuthToken(token);
    } catch (error) {
      console.error('JWT verification failed:', error);
      return {
        isValid: false,
        walletAddress: null,
        userId: null,
        error: 'Invalid authentication token'
      };
    }

    const userId = verifiedClaims.userId;
    if (!userId) {
      return {
        isValid: false,
        walletAddress: null,
        userId: null,
        error: 'No user ID in token'
      };
    }

    // Get user data to access linked accounts
    let userData;
    try {
      userData = await privy.getUser(userId);
    } catch (error) {
      console.error('Failed to get user data:', error);
      return {
        isValid: false,
        walletAddress: null,
        userId,
        error: 'Failed to retrieve user data'
      };
    }

    if (!userData || !userData.linkedAccounts || userData.linkedAccounts.length === 0) {
      return {
        isValid: false,
        walletAddress: null,
        userId,
        error: 'No linked accounts found'
      };
    }

    // Find the Cross-App account for Monad Games ID
    const crossAppAccount = userData.linkedAccounts.find((account: LinkedAccount) => 
      account.type === 'cross_app' && 
      account.providerApp?.id === MGID_CROSS_APP_ID
    ) as CrossAppAccount | undefined;

    if (!crossAppAccount) {
      return {
        isValid: false,
        walletAddress: null,
        userId,
        error: 'No Monad Games ID cross-app account found'
      };
    }

    // Extract the embedded wallet address (using any type for cross-app structure)
    if (!crossAppAccount.embeddedWallets || 
        !Array.isArray(crossAppAccount.embeddedWallets) || 
        crossAppAccount.embeddedWallets.length === 0) {
      return {
        isValid: false,
        walletAddress: null,
        userId,
        error: 'No embedded wallet found in cross-app account'
      };
    }

    const walletAddress = crossAppAccount.embeddedWallets[0].address;
    
    if (!walletAddress || typeof walletAddress !== 'string') {
      return {
        isValid: false,
        walletAddress: null,
        userId,
        error: 'Invalid wallet address in embedded wallet'
      };
    }

    return {
      isValid: true,
      walletAddress,
      userId,
    };

  } catch (error) {
    console.error('MGID auth verification failed:', error);
    return {
      isValid: false,
      walletAddress: null,
      userId: null,
      error: 'Authentication verification failed'
    };
  }
}

/**
 * Middleware helper to verify MGID authentication in API routes
 */
export async function withMGIDAuth<T>(
  request: Request,
  handler: (walletAddress: string, userId: string) => Promise<T>
): Promise<T | Response> {
  const authToken = request.headers.get('authorization');
  
  if (!authToken) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authorization header required' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const authResult = await verifyMGIDAuth(authToken);
  
  if (!authResult.isValid || !authResult.walletAddress) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: authResult.error || 'Authentication failed' 
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return handler(authResult.walletAddress, authResult.userId!);
}

/**
 * Extract wallet address from request (utility function)
 */
export async function extractWalletAddress(request: Request): Promise<string | null> {
  const authToken = request.headers.get('authorization');
  
  if (!authToken) {
    return null;
  }

  const authResult = await verifyMGIDAuth(authToken);
  return authResult.walletAddress;
}
