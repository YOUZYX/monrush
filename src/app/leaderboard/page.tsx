'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { usePrivy } from '@privy-io/react-auth';
import { Header } from '@/components/layout/Header';
import { useLeaderboard, getUserRank, type LeaderboardEntry } from '@/hooks/useLeaderboard';
import { useMGID } from '@/hooks/useMGID';
import { playMusic } from '@/lib/audio-manager';

export default function LeaderboardPage() {
  const { authenticated, user } = usePrivy();
  //const { accounts } = useCrossAppAccounts();
  const { username } = useMGID();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [userRank, setUserRank] = useState<number | null>(null);
  const pageLimit = 20;
  
  const { data: leaderboardData, loading, error, refetch } = useLeaderboard(pageLimit, currentPage);

  // Handle navigation
  const handleNavigate = (page: string) => {
    switch(page) {
      case 'play':
        window.location.href = '/play';
        break;
      case 'how-to-play':
        window.location.href = '/how-to-play';
        break;
      case 'leaderboard':
        window.location.href = '/leaderboard';
        break;
      default:
        window.location.href = '/';
    }
  };

  // Initialize menu music
  useEffect(() => {
    playMusic.menu();
    
    return () => {
      playMusic.stop();
    };
  }, []);

  // Get user's wallet address from cross-app accounts
  const userAddress = authenticated && user?.linkedAccounts
    ? (user.linkedAccounts.find(account => 
        account.type === 'cross_app' && 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (account as any).providerApp?.id === 'cmd8euall0037le0my79qpz42'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any)?.embeddedWallets?.[0]?.address
    : null;

  // Fetch user's rank when data loads
  React.useEffect(() => {
    if (userAddress && leaderboardData && !userRank) {
      getUserRank(userAddress).then(setUserRank);
    }
  }, [userAddress, leaderboardData, userRank]);

  // Helper to check if current user
  const isCurrentUser = (entry: LeaderboardEntry): boolean => {
    return userAddress ? entry.address.toLowerCase() === userAddress.toLowerCase() : false;
  };

  const stats = leaderboardData ? [
    { label: "Total Players", value: (leaderboardData.totalPlayers || 0).toLocaleString() },
    { label: "Transactions", value: (leaderboardData.totalGames || 0).toLocaleString() },
    { label: "Highest Score", value: (leaderboardData.highestScore || 0).toLocaleString() },
    { label: "Last Updated", value: leaderboardData.lastUpdated ? new Date(leaderboardData.lastUpdated).toLocaleTimeString() : "..." },
  ] : [
    { label: "Total Players", value: "..." },
    { label: "Transactions", value: "..." },
    { label: "Highest Score", value: "..." },
    { label: "Last Updated", value: "..." },
  ];

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return "text-yellow-400";
      case 2: return "text-gray-300"; 
      case 3: return "text-yellow-600";
      default: return "text-soft-white";
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return "👑";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-ink to-charcoal">
      <Header 
        currentPage="leaderboard"
        onNavigate={handleNavigate}
      />

      <div className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-futuristic font-bold text-electric-cyan mb-4 animate-glow">
            LEADERBOARD
          </h1>
          <p className="text-xl text-soft-white/70">
            Top MonadRush players and their epic scores
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.section
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="bg-glass border border-purple-accent/30 rounded-lg p-4 text-center backdrop-blur-sm"
                whileHover={{ scale: 1.02, borderColor: 'rgba(122, 95, 255, 0.5)' }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-2xl font-futuristic font-bold text-electric-cyan mb-1">
                  {stat.value}
                </div>
                <div className="text-soft-white/60 text-sm font-futuristic">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Notice/Loading/Error Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          {loading && (
            <div className="bg-electric-cyan/10 border border-electric-cyan/30 rounded-lg p-4 text-center">
              <p className="text-electric-cyan font-futuristic">
                � <strong>Loading Leaderboard:</strong> Fetching on-chain data and usernames...
              </p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
              <p className="text-red-400 font-futuristic">
                ❌ <strong>Error:</strong> {error}
              </p>
              <button
                onClick={refetch}
                className="mt-2 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          
          {!loading && !error && leaderboardData && leaderboardData.leaderboard.length === 0 && (
            <div className="bg-purple-accent/10 border border-purple-accent/30 rounded-lg p-4 text-center">
              <p className="text-purple-accent font-futuristic">
                🎮 <strong>No Scores Yet:</strong> Be the first to play MonadRush and claim the top spot!
              </p>
            </div>
          )}
          
          {!loading && !error && leaderboardData && leaderboardData.leaderboard.length > 0 && (
            <div className="bg-success-lime/10 border border-success-lime/30 rounded-lg p-4 text-center">
              <p className="text-success-lime font-futuristic">
                🏆 <strong>Live Leaderboard:</strong> Real scores from on-chain data updated every few seconds!
              </p>
            </div>
          )}
        </motion.div>

        {/* Leaderboard Table */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <div className="bg-glass border border-purple-accent/30 rounded-xl backdrop-blur-sm overflow-hidden">
            {/* Table Header */}
            <div className="bg-purple-accent/20 p-4 border-b border-purple-accent/30">
              <div className="grid grid-cols-5 gap-4 text-soft-white font-futuristic font-bold text-sm">
                <div className="text-center">RANK</div>
                <div className="col-span-2">PLAYER</div>
                <div className="text-center">SCORE</div>
                <div className="text-center">TRANSACTIONS</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-purple-accent/20">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 5 }).map((_, skeletonIndex) => (
                  <div key={skeletonIndex} className="p-4 animate-pulse">
                    <div className="grid grid-cols-5 gap-4 items-center">
                      <div className="text-center">
                        <div className="w-8 h-8 bg-soft-white/20 rounded"></div>
                      </div>
                      <div className="col-span-2">
                        <div className="h-4 bg-soft-white/20 rounded mb-1"></div>
                        <div className="h-3 bg-soft-white/10 rounded w-1/2"></div>
                      </div>
                      <div className="text-center">
                        <div className="h-4 bg-soft-white/20 rounded"></div>
                      </div>
                      <div className="text-center">
                        <div className="h-4 bg-soft-white/20 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))
              ) : leaderboardData?.leaderboard.map((player, index) => (
                <motion.div
                  key={player.address}
                  className={`p-4 hover:bg-purple-accent/5 transition-colors ${
                    player.rank <= 3 ? 'bg-gradient-to-r from-transparent to-purple-accent/10' : ''
                  } ${
                    isCurrentUser(player) ? 'bg-electric-cyan/5 border-l-4 border-electric-cyan' : ''
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="grid grid-cols-5 gap-4 items-center text-sm">
                    {/* Rank */}
                    <div className={`text-center font-futuristic font-bold text-lg ${getRankColor(player.rank)}`}>
                      {getRankIcon(player.rank)}
                    </div>

                    {/* Player Info */}
                    <div className="col-span-2">
                      <div className={`font-futuristic font-bold ${isCurrentUser(player) ? 'text-electric-cyan' : 'text-soft-white'}`}>
                        {player.username || 'Anonymous'}
                        {isCurrentUser(player) && (
                          <span className="ml-2 text-xs bg-electric-cyan/20 text-electric-cyan px-2 py-1 rounded">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-soft-white/50 text-xs font-mono">
                        {`${player.address.slice(0, 6)}...${player.address.slice(-4)}`}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <div className="font-futuristic font-bold text-electric-cyan">
                        {(player.score || 0).toLocaleString()}
                      </div>
                    </div>

                    {/* Transactions */}
                    <div className="text-center">
                      <div className="font-futuristic font-bold text-purple-accent">
                        {player.transactions}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* Empty state */}
              {!loading && leaderboardData?.leaderboard.length === 0 && (
                <div className="p-8 text-center text-soft-white/60">
                  <div className="text-6xl mb-4">🎮</div>
                  <div className="font-futuristic text-lg mb-2">No players yet!</div>
                  <div className="text-sm">Be the first to play MonadRush and claim the top spot.</div>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Pagination */}
        {leaderboardData && leaderboardData.leaderboard.length > 0 && (
          <motion.div
            className="flex justify-center items-center gap-4 mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
          >
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-futuristic transition-all ${
                currentPage === 1 
                  ? 'bg-soft-white/10 text-soft-white/30 cursor-not-allowed' 
                  : 'bg-purple-accent/20 text-purple-accent hover:bg-purple-accent/30'
              }`}
            >
              ← Previous
            </button>
            
            <span className="text-soft-white font-futuristic">
              Page {currentPage} {leaderboardData.hasMore && '• More players available'}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={!leaderboardData.hasMore}
              className={`px-4 py-2 rounded-lg font-futuristic transition-all ${
                !leaderboardData.hasMore 
                  ? 'bg-soft-white/10 text-soft-white/30 cursor-not-allowed' 
                  : 'bg-purple-accent/20 text-purple-accent hover:bg-purple-accent/30'
              }`}
            >
              Next →
            </button>
          </motion.div>
        )}

        {/* Personal Best Section */}
        <motion.section
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <div className="bg-glass border border-electric-cyan/30 rounded-xl p-6 backdrop-blur-sm text-center">
            <h3 className="text-2xl font-futuristic font-bold text-electric-cyan mb-4">
              Your Personal Best
            </h3>
            
            {authenticated && userAddress ? (
              <div>
                {userRank !== null ? (
                  <div className="space-y-3">
                    <div className="text-soft-white mb-4">
                      <span className="font-futuristic">Signed in as: </span>
                      <span className="text-electric-cyan font-bold">
                        {username || 'Anonymous'}
                      </span>
                    </div>
                    <div className="text-3xl font-futuristic font-bold text-success-lime">
                      Rank #{userRank}
                    </div>
                    <div className="text-soft-white/70">
                      You&apos;re competing with {leaderboardData?.totalPlayers || 0} other players!
                    </div>
                    <button
                      onClick={() => window.location.href = '/play'}
                      className="mt-4 px-6 py-3 bg-electric-cyan text-charcoal font-futuristic font-bold rounded-lg hover:bg-electric-cyan/80 transition-all duration-300 shadow-neon-cyan hover:scale-105"
                    >
                      IMPROVE YOUR SCORE
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-soft-white mb-4">
                      <span className="font-futuristic">Signed in as: </span>
                      <span className="text-electric-cyan font-bold">
                        {username || 'Anonymous'}
                      </span>
                    </div>
                    <div className="text-soft-white/70 mb-4">
                      You haven&apos;t played any games yet. Start playing to appear on the leaderboard!
                    </div>
                    <button
                      onClick={() => window.location.href = '/play'}
                      className="px-6 py-3 bg-success-lime text-charcoal font-futuristic font-bold rounded-lg hover:bg-success-lime/80 transition-all duration-300 shadow-neon-green hover:scale-105"
                    >
                      PLAY YOUR FIRST GAME
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="text-soft-white/70 mb-4">
                  Connect your Monad Games ID to see your scores and compete on the leaderboard!
                </div>
                <button
                  onClick={() => window.location.href = '/play'}
                  className="px-6 py-3 bg-electric-cyan text-charcoal font-futuristic font-bold rounded-lg hover:bg-electric-cyan/80 transition-all duration-300 shadow-neon-cyan hover:scale-105"
                >
                  CONNECT & PLAY
                </button>
              </div>
            )}
          </div>
        </motion.section>

        {/* Back to Game */}
        <motion.div
          className="text-center mt-8 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
        >
          <div className="flex justify-center gap-4">
            <button
              onClick={() => window.location.href = '/play'}
              className="px-8 py-4 bg-purple-accent text-soft-white font-futuristic font-bold text-xl rounded-lg hover:bg-purple-accent/80 transition-all duration-300 shadow-neon-purple hover:scale-105"
            >
              PLAY NOW
            </button>
            
            <button
              onClick={refetch}
              className="px-6 py-4 bg-electric-cyan/20 text-electric-cyan font-futuristic font-bold text-lg rounded-lg hover:bg-electric-cyan/30 transition-all duration-300 border border-electric-cyan/50"
              disabled={loading}
            >
              {loading ? '🔄' : '↻'} REFRESH
            </button>
          </div>
          
          {leaderboardData && leaderboardData.lastUpdated && (
            <div className="text-soft-white/60 text-sm font-futuristic">
              Last updated: {new Date(leaderboardData.lastUpdated).toLocaleString()}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
