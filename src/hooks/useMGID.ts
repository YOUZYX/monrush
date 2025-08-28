import { useState, useEffect } from 'react';
import { 
  usePrivy,
  CrossAppAccountWithMetadata 
} from '@privy-io/react-auth';
import { 
  extractMGIDWallet, 
  fetchMGIDUsername, 
  hasMGIDAccount,
  getDisplayName,
  MGID_CROSS_APP_ID,
  type MGIDResponse 
} from '@/lib/mgid';
import { publicClient } from '@/lib/client-contract-integration';

export interface MGIDState {
  isAuthenticated: boolean;
  isLoading: boolean;
  walletAddress: string | null;
  username: string | null;
  hasUsername: boolean;
  displayName: string;
  error: string | null;
  // New wallet balance properties
  balance: string | null;
  hasMinimumBalance: boolean;
  isCheckingBalance: boolean;
}

export function useMGID() {
  const { authenticated, user, ready, login, logout } = usePrivy();
  
  const [mgidState, setMGIDState] = useState<MGIDState>({
    isAuthenticated: false,
    isLoading: true,
    walletAddress: null,
    username: null,
    hasUsername: false,
    displayName: 'Connected',
    error: null,
    balance: null,
    hasMinimumBalance: false,
    isCheckingBalance: false,
  });

  // Function to check wallet balance
  const checkWalletBalance = async (walletAddress: string) => {
    try {
      console.log('💰 Checking wallet balance for:', walletAddress);
      const balance = await publicClient.getBalance({
        address: walletAddress as `0x${string}`,
      });

      const minimumBalance = BigInt('100000000000000000'); // 0.1 MON in wei
      const hasMinimumBalance = balance >= minimumBalance;
      
      console.log('💰 Balance:', balance.toString(), 'wei');
      console.log('✅ Has minimum balance (0.1 MON):', hasMinimumBalance);

      return {
        balance: balance.toString(),
        hasMinimumBalance,
      };
    } catch (error) {
      console.error('❌ Error checking balance:', error);
      return {
        balance: '0',
        hasMinimumBalance: false,
      };
    }
  };

  // Manual refresh balance function
  const refreshBalance = async () => {
    if (!mgidState.walletAddress) {
      console.warn('⚠️ No wallet address available for balance refresh');
      return;
    }

    setMGIDState(prev => ({ ...prev, isCheckingBalance: true }));
    
    try {
      const balanceData = await checkWalletBalance(mgidState.walletAddress);
      setMGIDState(prev => ({
        ...prev,
        isCheckingBalance: false,
        balance: balanceData.balance,
        hasMinimumBalance: balanceData.hasMinimumBalance,
      }));
      console.log('✅ Balance refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh balance:', error);
      setMGIDState(prev => ({ 
        ...prev, 
        isCheckingBalance: false,
        error: 'Failed to refresh balance' 
      }));
    }
  };

  // Reset state when user changes
  useEffect(() => {
    if (!ready) {
      setMGIDState(prev => ({ ...prev, isLoading: true }));
      return;
    }

    if (!authenticated || !user) {
      setMGIDState({
        isAuthenticated: false,
        isLoading: false,
        walletAddress: null,
        username: null,
        hasUsername: false,
        displayName: 'Connected',
        error: null,
        balance: null,
        hasMinimumBalance: false,
        isCheckingBalance: false,
      });
      return;
    }

    // Check if user has linkedAccounts (following working implementation)
    console.log('🔍 Checking MGID account...', user.linkedAccounts);
    if (user.linkedAccounts.length === 0) {
      console.log('❌ No linked accounts found');
      setMGIDState({
        isAuthenticated: false,
        isLoading: false,
        walletAddress: null,
        username: null,
        hasUsername: false,
        displayName: 'No MGID Account',
        error: 'You need to link your Monad Games ID account to continue.',
        balance: null,
        hasMinimumBalance: false,
        isCheckingBalance: false,
      });
      return;
    }

    // Get the cross app account created using Monad Games ID (working implementation pattern)
    const crossAppAccount: CrossAppAccountWithMetadata | undefined =
      (user.linkedAccounts.filter(
        (account: unknown) =>
          (account as CrossAppAccountWithMetadata).type === "cross_app" &&
          (account as CrossAppAccountWithMetadata).providerApp?.id === MGID_CROSS_APP_ID
      )[0] as CrossAppAccountWithMetadata) ?? undefined;

    console.log('🔗 Cross app account:', crossAppAccount);

    // The first embedded wallet created using Monad Games ID, is the wallet address
    if (
      crossAppAccount &&
      Array.isArray(crossAppAccount.embeddedWallets) &&
      crossAppAccount.embeddedWallets.length > 0
    ) {
      const walletAddress = crossAppAccount.embeddedWallets[0].address;
      console.log('💳 Extracted wallet address:', walletAddress);
    } else {
      console.log('❌ No valid cross-app account or embedded wallets found');
      setMGIDState({
        isAuthenticated: false,
        isLoading: false,
        walletAddress: null,
        username: null,
        hasUsername: false,
        displayName: 'No MGID Account',
        error: 'You need to link your Monad Games ID account to continue.',
        balance: null,
        hasMinimumBalance: false,
        isCheckingBalance: false,
      });
      return;
    }

    const walletAddress = crossAppAccount.embeddedWallets[0].address;

    // Fetch username and check wallet balance
    setMGIDState(prev => ({
      ...prev,
      isLoading: true,
      walletAddress,
      isAuthenticated: true,
      error: null,
      isCheckingBalance: true,
    }));

    // Check wallet balance for minimum MON requirement (0.1 MON)
    const checkWalletBalance = async () => {
      try {
        console.log('� Checking wallet balance for:', walletAddress);
        const balance = await publicClient.getBalance({
          address: walletAddress as `0x${string}`,
        });

        const minimumBalance = BigInt('100000000000000000'); // 0.1 MON in wei
        const hasMinimumBalance = balance >= minimumBalance;
        
        console.log('💰 Balance:', balance.toString(), 'wei');
        console.log('✅ Has minimum balance (0.1 MON):', hasMinimumBalance);

        return {
          balance: balance.toString(),
          hasMinimumBalance,
        };
      } catch (error) {
        console.error('❌ Error checking balance:', error);
        return {
          balance: '0',
          hasMinimumBalance: false,
        };
      }
    };

    // Fetch both username and balance in parallel
    Promise.all([
      fetchMGIDUsername(walletAddress),
      checkWalletBalance(),
    ])
      .then(([usernameResponse, balanceData]) => {
        console.log('✅ Username response:', usernameResponse);
        console.log('💰 Balance data:', balanceData);
        setMGIDState(prev => ({
          ...prev,
          isLoading: false,
          isCheckingBalance: false,
          username: usernameResponse.user?.username || null,
          hasUsername: usernameResponse.hasUsername,
          displayName: getDisplayName(usernameResponse.user?.username, walletAddress),
          balance: balanceData.balance,
          hasMinimumBalance: balanceData.hasMinimumBalance,
          error: null,
        }));
      })
      .catch((error) => {
        console.error('❌ Failed to fetch data:', error);
        setMGIDState(prev => ({
          ...prev,
          isLoading: false,
          isCheckingBalance: false,
          username: null,
          hasUsername: false,
          displayName: getDisplayName(undefined, walletAddress),
          balance: '0',
          hasMinimumBalance: false,
          error: 'Failed to fetch wallet data',
        }));
      });

  }, [authenticated, user, ready]);

  const loginWithMGID = async () => {
    try {
      // Use loginWithCrossAppAccount for MGID as per documentation
      await login({
        // This will trigger cross-app authentication with MGID
        // The cross-app account will be created automatically
      });
    } catch (error) {
      console.error('MGID login failed:', error);
      setMGIDState(prev => ({
        ...prev,
        error: 'Login failed',
      }));
    }
  };

  const logoutMGID = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('MGID logout failed:', error);
    }
  };

  return {
    ...mgidState,
    loginWithMGID,
    logoutMGID,
    // Wallet balance methods
    checkWalletBalance,
    refreshBalance,
    // Privy methods for advanced usage
    privy: {
      authenticated,
      user,
      ready,
      login,
      logout,
    },
  };
}
