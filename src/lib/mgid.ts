import { 
  CrossAppAccountWithMetadata 
} from '@privy-io/react-auth';

// Monad Games ID Cross-App ID
export const MGID_CROSS_APP_ID = 'cmd8euall0037le0my79qpz42';

// MGID API endpoints
export const MGID_API_BASE = 'https://monad-games-id-site.vercel.app';
export const MGID_REGISTRATION_URL = 'https://monad-games-id-site.vercel.app/';

export interface MGIDUser {
  id: number;
  username: string;
  walletAddress: string;
}

export interface MGIDResponse {
  hasUsername: boolean;
  user?: MGIDUser;
}

/**
 * Extract wallet address from MGID cross-app account
 * Following working implementation pattern
 */
export function extractMGIDWallet(linkedAccounts: unknown[]): string | null {
  if (!linkedAccounts || linkedAccounts.length === 0) {
    return null;
  }

  // Get the cross app account created using Monad Games ID (working pattern)
  const crossAppAccount: CrossAppAccountWithMetadata | undefined =
    (linkedAccounts.filter(
      (account: unknown) =>
        (account as CrossAppAccountWithMetadata).type === "cross_app" &&
        (account as CrossAppAccountWithMetadata).providerApp?.id === MGID_CROSS_APP_ID
    )[0] as CrossAppAccountWithMetadata) ?? undefined;

  // The first embedded wallet created using Monad Games ID, is the wallet address
  if (
    crossAppAccount &&
    Array.isArray(crossAppAccount.embeddedWallets) &&
    crossAppAccount.embeddedWallets.length > 0
  ) {
    return crossAppAccount.embeddedWallets[0].address;
  }

  return null;
}

/**
 * Fetch username from MGID API (via our proxy for caching)
 */
export async function fetchMGIDUsername(walletAddress: string): Promise<MGIDResponse> {
  try {
    // Use our proxy API for caching and error handling
    const response = await fetch(`/api/username?address=${walletAddress}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: MGIDResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch MGID username:', error);
    // Fallback to direct API call
    try {
      const fallbackResponse = await fetch(`${MGID_API_BASE}/api/check-wallet?wallet=${walletAddress}`);
      if (fallbackResponse.ok) {
        return await fallbackResponse.json();
      }
    } catch (fallbackError) {
      console.error('Fallback API also failed:', fallbackError);
    }
    throw error;
  }
}

/**
 * Check if user has MGID cross-app account
 */
export function hasMGIDAccount(linkedAccounts: unknown[]): boolean {
  if (!linkedAccounts || linkedAccounts.length === 0) {
    return false;
  }

  // Check if user has linkedAccounts with MGID cross-app account (working pattern)
  const crossAppAccount: CrossAppAccountWithMetadata | undefined =
    (linkedAccounts.filter(
      (account: unknown) =>
        (account as CrossAppAccountWithMetadata).type === "cross_app" &&
        (account as CrossAppAccountWithMetadata).providerApp?.id === MGID_CROSS_APP_ID
    )[0] as CrossAppAccountWithMetadata) ?? undefined;

  return (
    crossAppAccount &&
    Array.isArray(crossAppAccount.embeddedWallets) &&
    crossAppAccount.embeddedWallets.length > 0
  );
}

/**
 * Get display name for user (username or truncated address)
 */
export function getDisplayName(username?: string, address?: string): string {
  if (username) {
    return username;
  }
  
  if (address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
  
  return 'Unknown User';
}
