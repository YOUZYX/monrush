// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * MonadRush Game Contract
 * Lightweight on-chain hooks for game lifecycle with MGID integration
 */

interface IMonadGamesID {
    function updatePlayerData(address player, uint256 scoreDelta, uint256 txDelta) external;
}

contract MonadRush {
    IMonadGamesID public gamesID;
    address public owner; // Backend server wallet address

    struct Session {
        address player;
        uint256 startTime;
        uint256 actions;
        bool active;
    }

    // Nested mapping to track sessions per player
    mapping(address => mapping(uint256 => Session)) public playerSessions;
    mapping(address => uint256) public playerSessionCount;

    // Events
    event GameStarted(address indexed player, uint256 sessionId, uint256 timestamp);
    event ActionRecorded(address indexed player, uint256 sessionId, uint8 kind, uint32 value, uint256 timestamp);
    event GameFinished(address indexed player, uint256 sessionId, uint256 finalScore, uint256 timestamp);

    // Action types
    uint8 constant ACTION_LOGO_TAP = 0;
    uint8 constant ACTION_GLITCH_TAP = 1;
    uint8 constant ACTION_HELPFUL_CARD = 2;
    uint8 constant ACTION_CHAOTIC_CARD = 3;
    uint8 constant ACTION_WILD_CARD = 4;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner (backend) can call this function");
        _;
    }

    constructor(address _gamesID) {
        gamesID = IMonadGamesID(_gamesID);
        owner = msg.sender; // Deployer is the backend wallet
    }

    /**
     * Start a new game session
     * @param player The player's address
     */
    function startGame(address player) external onlyOwner {
        uint256 currentSessionId = playerSessionCount[player]++;
        playerSessions[player][currentSessionId] = Session(
            player,
            block.timestamp,
            0,
            true
        );
        
        emit GameStarted(player, currentSessionId, block.timestamp);
    }

    /**
     * Record a game action
     * @param player The player's address
     * @param kind Action type (0-4)
     * @param value Extra data (e.g., card ID)
     */
    function recordAction(address player, uint8 kind, uint32 value) external onlyOwner {
        uint256 currentSessionId = playerSessionCount[player] - 1;
        Session storage s = playerSessions[player][currentSessionId];
        require(s.active, "No active session for this player");
        
        s.actions++;
        emit ActionRecorded(player, currentSessionId, kind, value, block.timestamp);
    }

    /**
     * Finish game session and update MGID
     * @param player The player's address
     * @param finalScore Final score achieved
     */
    function finishSession(address player, uint256 finalScore) external onlyOwner {
        uint256 currentSessionId = playerSessionCount[player] - 1;
        Session storage s = playerSessions[player][currentSessionId];
        require(s.active, "Session is already finished or inactive");
        
        s.active = false;
        emit GameFinished(player, currentSessionId, finalScore, block.timestamp);

        // Calculate total transactions: actions + start + finish
        uint256 txDelta = s.actions + 2;
        
        // Update Monad Games ID with score and transaction count
        gamesID.updatePlayerData(player, finalScore, txDelta);
    }

    /**
     * Get current session info for a player
     * @param player The player's address
     */
    function getCurrentSession(address player) external view returns (Session memory) {
        uint256 sessionCount = playerSessionCount[player];
        if (sessionCount == 0) {
            return Session(address(0), 0, 0, false);
        }
        return playerSessions[player][sessionCount - 1];
    }

    /**
     * Get specific session info
     * @param player The player's address
     * @param sessionId The session ID
     */
    function getSession(address player, uint256 sessionId) external view returns (Session memory) {
        return playerSessions[player][sessionId];
    }

    /**
     * Emergency function to update owner (backend wallet)
     * @param newOwner New backend wallet address
     */
    function updateOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    /**
     * Emergency function to update MGID contract
     * @param newGamesID New MGID contract address
     */
    function updateGamesID(address newGamesID) external onlyOwner {
        require(newGamesID != address(0), "New games ID cannot be zero address");
        gamesID = IMonadGamesID(newGamesID);
    }
}
