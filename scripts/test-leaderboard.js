/**
 * Test script to verify the leaderboard API endpoint
 * Run this to test the leaderboard functionality
 */

async function testLeaderboardAPI() {
  console.log('🧪 Testing Leaderboard API...\n');

  try {
    // Test the API endpoint
    console.log('📡 Fetching leaderboard data...');
    const response = await fetch('http://localhost:3000/api/leaderboard?limit=10&page=1');
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ API Response received successfully\n');

    // Log the structure
    console.log('📊 Leaderboard Data Structure:');
    console.log('Total Players:', data.totalPlayers);
    console.log('Total Games:', data.totalGames);
    console.log('Highest Score:', data.highestScore);
    console.log('Page:', data.page);
    console.log('Limit:', data.limit);
    console.log('Has More:', data.hasMore);
    console.log('Last Updated:', data.lastUpdated);
    console.log('Leaderboard Entries:', data.leaderboard.length);

    if (data.leaderboard.length > 0) {
      console.log('\n🏆 Top Players:');
      data.leaderboard.slice(0, 5).forEach((player, index) => {
        console.log(`${index + 1}. ${player.username || 'Anonymous'} - ${player.score} points (${player.transactions} txs)`);
        console.log(`   Address: ${player.address.slice(0, 10)}...${player.address.slice(-8)}`);
      });
    } else {
      console.log('\n📭 No players found. This is expected if no games have been finished yet.');
    }

    console.log('\n✅ Leaderboard API test completed successfully!');
    return data;

  } catch (error) {
    console.error('❌ Leaderboard API test failed:', error);
    return null;
  }
}

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { testLeaderboardAPI };
} else {
  // Browser environment - attach to window
  window.testLeaderboardAPI = testLeaderboardAPI;
}

// Run test if this script is executed directly
if (typeof window === 'undefined' && require.main === module) {
  testLeaderboardAPI();
}
