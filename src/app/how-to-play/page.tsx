'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import Image from 'next/image';
import { playMusic } from '@/lib/audio-manager';

export default function HowToPlayPage() {
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

  const gameRules = [
    {
      title: "Tap Monad Logos",
      description: "Click the purple Monad logos to score points. Each successful tap gives you +10 points × your current combo multiplier.",
      icon: "/assets/Monad_logo_tap.svg",
      color: "text-electric-cyan",
    },
    {
      title: "Avoid Glitches", 
      description: "Don&apos;t tap the glitch objects! They reset your combo multiplier to 1.0x and your streak to 0, but don&apos;t cost lives.",
      icon: "/assets/Glitch.svg",
      color: "text-danger",
    },
    {
      title: "Collect Gift Boxes",
      description: "Tap mystery gift boxes to reveal powerful Magic Cards with special effects that can help or challenge you.",
      icon: "/assets/GiftBox.svg", 
      color: "text-purple-accent",
    },
    {
      title: "Avoid Bombs",
      description: "DANGER! Red bombs with skulls will cost you a life and reset your combo. They&apos;re more dangerous than glitches!",
      icon: "/assets/bomb.svg",
      color: "text-danger",
    },
  ];

  const magicCards = [
    {
      category: "⚡ Helpful Cards",
      cards: [
        {
          name: "Time Freeze",
          effect: "Stops all falling objects for 5 seconds (timer continues)",
          color: "text-electric-cyan",
        },
        {
          name: "Slow Motion", 
          effect: "Halves falling speed for 7 seconds",
          color: "text-electric-cyan",
        },
        {
          name: "Golden Monad",
          effect: "The next Monad Logo tapped is worth triple points",
          color: "text-yellow-400",
        },
        {
          name: "Extra Time",
          effect: "Adds +10 seconds to the countdown timer", 
          color: "text-success-lime",
        },
        {
          name: "Logo Highlight",
          effect: "Real Monad logos glow/pulse for 5s; glitches stay normal",
          color: "text-electric-cyan",
        },
      ],
    },
    {
      category: "😈 Chaotic Cards",
      cards: [
        {
          name: "Bomb Trap",
          effect: "If tapped: -20 points penalty",
          color: "text-danger",
        },
        {
          name: "Shrink Ray",
          effect: "For 4 seconds, all falling objects become tiny, testing precision",
          color: "text-purple-accent",
        },
      ],
    },
    {
      category: "🎲 Wild & Fun Cards", 
      cards: [
        {
          name: "Monad Swarm",
          effect: "Spawns a dense wave of Monad Logos for 3 seconds - huge scoring opportunity!",
          color: "text-success-lime",
        },
        {
          name: "Glitch Purge",
          effect: "Instantly destroys all visible Glitches, awarding +5 bonus points each",
          color: "text-electric-cyan",
        },
      ],
    },
  ];

  const gameStats = [
    { label: "Game Duration", value: "120 seconds" },
    { label: "Starting Lives", value: "5" },
    { label: "Points per Logo", value: "10 × combo" },
    { label: "Max Combo", value: "5.0x" },
    { label: "Combo Increase", value: "Every 5 consecutive hits" },
    { label: "Difficulty Ramp", value: "Every 30 seconds" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-ink to-charcoal">
      <Header 
        currentPage="how-to-play"
        onNavigate={handleNavigate}
      />

      <div className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl font-futuristic font-bold text-electric-cyan mb-4 animate-glow">
            HOW TO PLAY
          </h1>
          <p className="text-xl text-soft-white/70 max-w-3xl mx-auto">
            Master the art of precision tapping and strategic card usage to achieve the highest score in MonadRush!
          </p>
        </motion.div>

        {/* Game Rules */}
        <motion.section
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="text-3xl font-futuristic font-bold text-purple-accent mb-8 text-center">
            Basic Gameplay
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {gameRules.map((rule, index) => (
              <motion.div
                key={rule.title}
                className="bg-glass border border-purple-accent/30 rounded-xl p-6 backdrop-blur-sm text-center"
                whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(122, 95, 255, 0.3)' }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-20 h-20 mx-auto mb-4 relative flex items-center justify-center">
                  {rule.icon.startsWith('/') ? (
                    <Image
                      src={rule.icon}
                      alt={rule.title}
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <div className="text-4xl">{rule.icon}</div>
                  )}
                </div>
                <h3 className={`text-xl font-futuristic font-bold mb-3 ${rule.color}`}>
                  {rule.title}
                </h3>
                <p className="text-soft-white/80">
                  {rule.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Magic Cards */}
        <motion.section
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h2 className="text-3xl font-futuristic font-bold text-purple-accent mb-8 text-center">
            Magic Cards Guide
          </h2>
          <div className="space-y-8">
            {magicCards.map((category, categoryIndex) => (
              <motion.div
                key={category.category}
                className="bg-glass border border-purple-accent/30 rounded-xl p-6 backdrop-blur-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + categoryIndex * 0.2 }}
              >
                <h3 className="text-2xl font-futuristic font-bold text-electric-cyan mb-6">
                  {category.category}
                </h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {category.cards.map((card, cardIndex) => (
                    <motion.div
                      key={card.name}
                      className="bg-charcoal/50 border border-purple-accent/20 rounded-lg p-4"
                      whileHover={{ scale: 1.02, borderColor: 'rgba(122, 95, 255, 0.5)' }}
                      transition={{ duration: 0.2 }}
                    >
                      <h4 className={`font-futuristic font-bold mb-2 ${card.color}`}>
                        {card.name}
                      </h4>
                      <p className="text-soft-white/70 text-sm">
                        {card.effect}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Pro Tips */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
        >
          <h2 className="text-3xl font-futuristic font-bold text-purple-accent mb-8 text-center">
            Pro Tips
          </h2>
          <div className="bg-glass border border-success-lime/30 rounded-xl p-6 backdrop-blur-sm">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xl font-futuristic font-bold text-success-lime mb-3">
                  Scoring Strategy
                </h3>
                <ul className="space-y-2 text-soft-white/80">
                  <li>• Build your combo to 5.0x for maximum points</li>
                  <li>• Save Golden Monad cards for when you have high combo</li>
                  <li>• Use Monad Swarm during high combo multipliers</li>
                  <li>• Don&apos;t rush - accuracy beats speed</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-futuristic font-bold text-success-lime mb-3">
                  Survival Tips
                </h3>
                <ul className="space-y-2 text-soft-white/80">
                  <li>• Glitches reset combo but don&apos;t cost lives</li>
                  <li>• Use Time Freeze when overwhelmed</li>
                  <li>• Logo Highlight helps distinguish real targets</li>
                  <li>• Practice makes perfect - learn the patterns!</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
        >
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-4 bg-electric-cyan text-charcoal font-futuristic font-bold text-xl rounded-lg hover:bg-electric-cyan/80 transition-all duration-300 shadow-neon-cyan hover:scale-105"
          >
            START PLAYING
          </button>
        </motion.div>
      </div>
    </div>
  );
}
