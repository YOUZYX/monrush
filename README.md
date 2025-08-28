# 🎮 MonadRush

MonadRush is an exciting blockchain-based arcade game built on the Monad network. Test your reflexes and compete globally in this fast-paced tapping game featuring the iconic Monad logo!

## 🎯 Game Overview

MonadRush is a reflex-based arcade game where players must:
- **Tap Monad Logos** 🎯 to score points and build combos
- **Avoid Bombs** 💣 that reduce your lives
- **Catch Gift Boxes** 🎁 for special power-ups
- **Dodge Glitches** ⚡ that can disrupt your game
- **Survive for 2 minutes** while difficulty increases progressively

### Key Features
- 🏆 **Global Leaderboard** - Compete with players worldwide
- 🔗 **Blockchain Integration** - Secure game sessions on Monad network
- 🎵 **Audio Experience** - Immersive sound effects and music
- 📱 **Responsive Design** - Play on any device
- 🎮 **Progressive Difficulty** - Game gets harder as you play

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd monadrush
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in your environment variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID` - Your Privy app ID
   - `PRIVY_APP_SECRET` - Your Privy app secret
   - `NEXT_PUBLIC_MONAD_RPC_URL` - Monad RPC endpoint
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` - MonadRush contract address

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎮 How to Play

1. **Connect Wallet** - Use Privy to authenticate with your wallet
2. **Register MGID** - Get your Monad Games ID for leaderboard tracking
3. **Start Game** - Click "Play Game" and approve the blockchain transaction
4. **Tap Objects**:
   - 🎯 **Monad Logos** - Tap to score points (10 base points)
   - 🎁 **Gift Boxes** - Tap for power-ups and bonuses
   - 💣 **Bombs** - Avoid! They cost you lives
   - ⚡ **Glitches** - Avoid! They can disrupt your game
5. **Build Combos** - Get 5+ consecutive hits to increase your multiplier
6. **Survive** - Game lasts 2 minutes with increasing difficulty

### Scoring System
- **Base Score**: 10 points per Monad logo
- **Combo Multiplier**: Up to 5x for consecutive hits
- **Streak Bonus**: Build streaks for higher combos
- **Gift Bonuses**: Special power-ups from gift boxes

## 🛠 Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Authentication**: Privy (Cross-app authentication)
- **Blockchain**: Wagmi, Viem (Monad network)
- **Audio**: Howler.js
- **Testing**: Jest, React Testing Library

## 🎯 Game Tips

- **Build Combos**: Consecutive hits increase your multiplier
- **Manage Lives**: You start with 5 lives, use them wisely
- **Watch the Difficulty**: Game speeds up every 30 seconds
- **Gift Strategy**: Prioritize gift boxes for power-ups
- **Stay Focused**: The game gets intense in the final minute!

## 🏆 Leaderboard

Compete globally! Your best scores are automatically submitted to the leaderboard when you have a registered MGID (Monad Games ID).

---
## Dev

Built by [Youzy](https://x.com/youzypoor)

---

**Ready to rush?** 🚀 Start your MonadRush adventure today!