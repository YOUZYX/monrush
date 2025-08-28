import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface LeaderboardEntry {
  rank: number;
  address: string;
  username: string | null;
  score: number;
  timestamp: number;
  transactions: number;
}

interface CombinedLeaderboardEntry {
  Rank: string;
  Player: string;
  Wallet: string;
  Score: string | null;
  Transactions: string | null;
}

// Constants from your script
const LEADERBOARD_URL = 'https://monad-games-id-site.vercel.app/leaderboard?page=1&gameId=65';
const SCORE_URL = 'https://monad-games-id-site.vercel.app/leaderboard?page=1&gameId=65&sortBy=scores';
const TX_URL = 'https://monad-games-id-site.vercel.app/leaderboard?page=1&gameId=65';

// Your exact fetchEndpointData function
async function fetchEndpointData(url: string) {
    console.log(`Fetching data from: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        console.log(`Status Code: ${response.status}`);
        return response.data;
    } catch (error: any) {
        console.error(`Error fetching data from ${url}:`, error.message);
        if (error.response) {
            console.error('Error response status:', error.response.status);
        } else if (error.request) {
            console.error('No response received for the request.');
        }
        return null;
    }
}

// Your exact parseDataFromHTML function
function parseDataFromHTML(html: string) {
    try {
        // Directly search for the first JSON array/object containing 'monrush'
        const monrushIndex = html.indexOf('monrush');
        if (monrushIndex !== -1) {
            const contextStart = Math.max(0, monrushIndex - 500);
            const contextEnd = Math.min(html.length, monrushIndex + 500);
            const context = html.slice(contextStart, contextEnd);
            console.log('--- Context around "monrush" occurrence ---');
            console.log(context);
            console.log('-------------------------------------------');
            // Find the nearest '{' before and '}' after to extract the JSON object
            let start = html.lastIndexOf('{', monrushIndex);
            let end = html.indexOf('}', monrushIndex);
            // Expand end to include nested braces if needed
            let braceCount = 0;
            for (let i = start; i < html.length; i++) {
                if (html[i] === '{') braceCount++;
                if (html[i] === '}') braceCount--;
                if (braceCount === 0) {
                    end = i + 1;
                    break;
                }
            }
            const snippet = html.slice(start, end);
            try {
                const parsed = JSON.parse(snippet);
                return parsed;
            } catch (e: any) {
                console.log('Could not parse monrush JSON snippet:', snippet.slice(0, 1000));
                console.log('Parse error:', e.message);
            }
        }
        console.log('Could not find any JSON containing "monrush" in the HTML.');
        return null;
    } catch (error) {
        console.error('Error searching for monrush in HTML:', error);
        return null;
    }
}

// Your exact displayLeaderboard function (adapted for return instead of console.log)
function displayLeaderboard(data: any) {
    const gameAddress = "0x73c978453ebaf65b243d1c42e86bfd8fd2dff0da";
    let leaderboardEntries: any[] = [];

    // Helper to recursively search for leaderboard arrays
    function findLeaderboards(obj: any) {
        if (!obj) return;
        if (Array.isArray(obj)) {
            obj.forEach(findLeaderboards);
        } else if (typeof obj === 'object') {
            if (Array.isArray(obj.leaderboard)) {
                leaderboardEntries = leaderboardEntries.concat(obj.leaderboard);
            }
            Object.values(obj).forEach(findLeaderboards);
        }
    }

    findLeaderboards(data);

    const filteredLeaderboard = leaderboardEntries.filter(entry => entry && entry.game && entry.game.address && entry.game.address.toLowerCase() === gameAddress.toLowerCase());

    if (filteredLeaderboard.length === 0) {
        console.log('No leaderboard entries found for the specified game address (monrush).');
        return [];
    }

    console.log(`Leaderboard for game: monrush (address: ${gameAddress})`);
    console.log('Rank | Player Address                        | Score');
    console.log('-----------------------------------------------------');
    const results: any[] = [];
    filteredLeaderboard.forEach((entry, idx) => {
        const rank = idx + 1;
        const player = entry.player || entry.address || 'Unknown';
        const score = entry.score || entry.points || entry.value || 'N/A';
        console.log(`${rank.toString().padEnd(4)} | ${player.padEnd(36)} | ${score}`);
        results.push({ rank, player, score, address: player });
    });
    console.log('-----------------------------------------------------');
    return results;
}

// Your exact parseLeaderboardTable function
function parseLeaderboardTable(html: string, type = 'score') {
    const $ = cheerio.load(html);
    const rows = $('table tbody tr');
    const results: any[] = [];

    console.log(`Found ${rows.length} rows in the table`);

    rows.each((i, row) => {
        const cols = $(row).find('td');
        console.log(`Row ${i}: Found ${cols.length} columns`);

        if (cols.length >= 4) {
            const rank = $(cols[0]).text().trim();

            // Debug: print the HTML content of each column
            console.log(`Column 0 (rank): ${$(cols[0]).text().trim()}`);
            console.log(`Column 1 HTML: ${$(cols[1]).html()}`);
            console.log(`Column 2 HTML: ${$(cols[2]).html()}`);
            console.log(`Column 3 HTML: ${$(cols[3]).html()}`);

            // Try different selectors for player and wallet
            let player = $(cols[1]).text().trim();
            let wallet = $(cols[2]).text().trim();

            // Try to find spans or divs within the columns
            const col1Spans = $(cols[1]).find('span');
            const col2Spans = $(cols[2]).find('span');

            if (col1Spans.length > 0) {
                player = $(col1Spans[0]).text().trim();
            }

            if (col2Spans.length > 0) {
                wallet = $(col2Spans[col2Spans.length - 1]).text().trim();
            }

            let value = $(cols[3]).text().trim();

            console.log(`Extracted - Rank: ${rank}, Player: ${player}, Wallet: ${wallet}, Value: ${value}`);

            results.push({ rank, player, wallet, value });
        }
    });
    return results;
}

// Your exact fetchLeaderboardData function
async function fetchLeaderboardData() {
    console.log('Fetching leaderboard data...');
    const html = await fetchEndpointData(LEADERBOARD_URL);

    if (!html) {
        console.log('Failed to fetch HTML, cannot display leaderboard.');
        return [];
    }
    console.log('Fetched HTML length:', html.length);

    const data = parseDataFromHTML(html);
    console.log('Parsed data:', JSON.stringify(data, null, 2));

    if (!data) {
        console.log('Failed to fetch data, cannot display leaderboard.');
        return [];
    }

    console.log('Displaying leaderboard...');
    return displayLeaderboard(data);
}

// Your exact main function logic
async function fetchCombinedLeaderboard(): Promise<CombinedLeaderboardEntry[]> {
    try {
        // Fetch and parse both tables
        const scoreHtml = await fetchEndpointData(SCORE_URL);
        const txHtml = await fetchEndpointData(TX_URL);
        
        if (!scoreHtml || !txHtml) {
            console.log('Failed to fetch HTML data');
            return [];
        }

        const scoreResults = parseLeaderboardTable(scoreHtml, 'score');
        const txResults = parseLeaderboardTable(txHtml, 'tx');

        // Combine by wallet (assuming wallet is unique key)
        const combined: { [key: string]: CombinedLeaderboardEntry } = {};
        
        scoreResults.forEach((entry: any) => {
            if (!entry.wallet) return;
            combined[entry.wallet] = {
                Rank: entry.rank,
                Player: entry.player,
                Wallet: entry.wallet,
                Score: entry.value,
                Transactions: null
            };
        });
        
        txResults.forEach((entry: any) => {
            if (!entry.wallet) return;
            if (!combined[entry.wallet]) {
                combined[entry.wallet] = {
                    Rank: entry.rank,
                    Player: entry.player,
                    Wallet: entry.wallet,
                    Score: null,
                    Transactions: entry.value
                };
            } else {
                combined[entry.wallet].Transactions = entry.value;
            }
        });

        // Output as array of objects
        const output = Object.values(combined);
        console.log('--- Combined Leaderboard ---');
        console.log(JSON.stringify(output, null, 2));
        
        return output;
    } catch (error) {
        console.error('Error in fetchCombinedLeaderboard:', error);
        return [];
    }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🎮 Starting MonadRush leaderboard fetch...');

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);

    console.log(`API: Fetching leaderboard for page=${page}, limit=${limit}`);

    // Use your exact script implementation
    const combinedData = await fetchCombinedLeaderboard();
    
    // Also try the JSON-based approach for backup
    const jsonData = await fetchLeaderboardData();

    // Combine both data sources
    let allPlayers: any[] = [];
    
    if (combinedData && combinedData.length > 0) {
      console.log(`Found ${combinedData.length} players from combined approach`);
      allPlayers = combinedData.map((player: CombinedLeaderboardEntry) => ({
        address: player.Wallet || '',
        username: player.Player && player.Player !== 'Unknown' ? player.Player : null,
        score: player.Score ? parseInt(player.Score.toString().replace(/[^\d]/g, '')) || 0 : 0,
        transactions: player.Transactions ? parseInt(player.Transactions.toString().replace(/[^\d]/g, '')) || 0 : 0,
      }));
    }
    
    if (jsonData && jsonData.length > 0) {
      console.log(`Found ${jsonData.length} players from JSON approach`);
      const jsonPlayers = jsonData.map((player: any) => ({
        address: player.address || '',
        username: player.player && player.player !== 'Unknown' ? player.player : null,
        score: typeof player.score === 'number' ? player.score : parseInt(player.score?.toString() || '0') || 0,
        transactions: 0, // JSON approach doesn't have transactions
      }));
      
      // Merge with combined data, preferring combined data
      jsonPlayers.forEach((jsonPlayer: any) => {
        const existing = allPlayers.find((p: any) => p.address.toLowerCase() === jsonPlayer.address.toLowerCase());
        if (!existing && jsonPlayer.address) {
          allPlayers.push(jsonPlayer);
        }
      });
    }

    if (allPlayers.length === 0) {
      console.log('No data returned from either approach');
      return NextResponse.json({
        leaderboard: [],
        totalPlayers: 0,
        totalGames: 0,
        highestScore: 0,
        page,
        limit,
        hasMore: false,
        lastUpdated: new Date().toISOString(),
      });
    }

    console.log(`API: Found ${allPlayers.length} total players`);

    // Sort players by score (descending), then by transactions (descending)
    allPlayers.sort((a: any, b: any) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.transactions - a.transactions;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = Math.min(startIndex + limit, allPlayers.length);
    const playersForPage = allPlayers.slice(startIndex, endIndex);

    // Convert to leaderboard format
    const leaderboard: LeaderboardEntry[] = playersForPage.map((player: any, index: number) => ({
      rank: startIndex + index + 1,
      address: player.address || '',
      username: player.username,
      score: player.score || 0,
      timestamp: Date.now(),
      transactions: player.transactions || 0,
    }));

    // Calculate stats from all data
    const totalPlayers = allPlayers.length;
    const totalGames = allPlayers.reduce((sum: number, p: any) => sum + (p.transactions || 0), 0);
    const highestScore = allPlayers.length > 0 ? Math.max(...allPlayers.map((p: any) => p.score || 0)) : 0;
    const hasMore = endIndex < allPlayers.length;

    const response = {
      leaderboard,
      totalPlayers,
      totalGames,
      highestScore,
      page,
      limit,
      hasMore,
      lastUpdated: new Date().toISOString(),
    };

    console.log(`API: Returning ${leaderboard.length} players, totalPlayers=${totalPlayers}, highestScore=${highestScore}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('🚨 Leaderboard API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch leaderboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
