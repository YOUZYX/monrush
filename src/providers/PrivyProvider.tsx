'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, createConfig } from 'wagmi';
import { monadTestnet } from '@/lib/chains';

const queryClient = new QueryClient();

// Configure wagmi for Privy
const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

interface AppPrivyProviderProps {
  children: React.ReactNode;
}

export function AppPrivyProvider({ children }: AppPrivyProviderProps) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  // During build time or when no app ID is provided, render children without Privy
  if (!privyAppId) {
    console.warn(
      "NEXT_PUBLIC_PRIVY_APP_ID is not set. Privy authentication will not be available."
    );
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethodsAndOrder: {
          // Don't forget to enable Monad Games ID support in:
          // Global Wallet > Integrations > Monad Games ID (click on the slide to enable)
          primary: ["privy:cmd8euall0037le0my79qpz42"], // This is the Cross App ID, DO NOT CHANGE THIS
        },
        supportedChains: [monadTestnet],
        defaultChain: monadTestnet,
        appearance: {
          theme: 'light',
          accentColor: '#836EF9', // electric-cyan
          logo: '/assets/monrush_logo.png',
          showWalletLoginFirst: false,
          
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          requireUserPasswordOnCreate: false,
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
