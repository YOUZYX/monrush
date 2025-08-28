/**
 * MonadRush Public Contract ABI
 * Contract Address: 0x420Ed53831d4EF34122E632842e73BeeecD9397B
 * Players can call functions directly and pay their own gas fees
 */

export const MONAD_RUSH_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_gamesID",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "sessionId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "value",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ActionRecorded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "sessionId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "finalScore",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "GameFinished",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "sessionId",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "GameStarted",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "GAME_START_COOLDOWN",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "sessionId",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "finalScore",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalActions",
        "type": "uint256"
      }
    ],
    "name": "finishSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gamesID",
    "outputs": [
      {
        "internalType": "contract IMonadGamesID",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "player",
        "type": "address"
      }
    ],
    "name": "getPlayerStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "gamesPlayed",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "actionsRecorded",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bestScore",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "lastGameStart",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "sessionId",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "kind",
        "type": "uint8"
      },
      {
        "internalType": "uint32",
        "name": "value",
        "type": "uint32"
      }
    ],
    "name": "recordAction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "sessionId",
        "type": "string"
      }
    ],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_gamesID",
        "type": "address"
      }
    ],
    "name": "updateGamesID",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Contract addresses (updated with new public contract)
export const CONTRACT_ADDRESSES = {
  MONAD_RUSH: (process.env.MONAD_RUSH_CONTRACT_ADDRESS || "0x420Ed53831d4EF34122E632842e73BeeecD9397B") as `0x${string}`,
  MONAD_GAMES_ID: "0xceCBFF203C8B6044F52CE23D914A1bfD997541A4" as `0x${string}`,
} as const;

// Action types for recordAction function
export const ACTION_TYPES = {
  LOGO_TAP: 0,
  GLITCH_TAP: 1,
  HELPFUL_CARD: 2,
  CHAOTIC_CARD: 3,
  WILD_CARD: 4,
} as const;
