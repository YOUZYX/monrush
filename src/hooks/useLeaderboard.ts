import { useState, useEffect } from 'react';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  username: string | null;
  score: number;
  timestamp: number;
  transactions: number;
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  totalPlayers: number;
  totalGames: number;
  highestScore: number;
  page: number;
  limit: number;
  hasMore: boolean;
  lastUpdated: string;
}

export interface UseLeaderboardResult {
  data: LeaderboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLeaderboard(limit = 20, page = 1): UseLeaderboardResult {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/leaderboard?limit=${limit}&page=${page}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard: ${response.statusText}`);
      }

      const leaderboardData: LeaderboardData = await response.json();
      setData(leaderboardData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, page]);

  return {
    data,
    loading,
    error,
    refetch: fetchLeaderboard,
  };
}

// Helper function to get user's rank in leaderboard
export async function getUserRank(userAddress: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/leaderboard?limit=1000`); // Get many entries to find user rank
    if (!response.ok) return null;

    const data: LeaderboardData = await response.json();
    const userEntry = data.leaderboard.find(
      entry => entry.address.toLowerCase() === userAddress.toLowerCase()
    );

    return userEntry?.rank || null;
  } catch (error) {
    console.error('Failed to get user rank:', error);
    return null;
  }
}
