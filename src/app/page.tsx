'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMGID } from '@/hooks/useMGID';
import { Header } from '@/components/layout/Header';
import { MGID_REGISTRATION_URL } from '@/lib/mgid';
import Image from 'next/image';
import { playMusic } from '@/lib/audio-manager';

export default function Home() {
  const mgid = useMGID();

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

  // Redirect authenticated users to play page
  useEffect(() => {
    console.log('Home page auth check:', {
      isLoading: mgid.isLoading,
      isAuthenticated: mgid.isAuthenticated,
      walletAddress: mgid.walletAddress
    });
    
    if (!mgid.isLoading && mgid.isAuthenticated && mgid.walletAddress) {
      console.log('Redirecting to play page...');
      window.location.href = '/play';
    }
  }, [mgid.isLoading, mgid.isAuthenticated, mgid.walletAddress]);

  // Initialize menu music
  useEffect(() => {
    playMusic.menu();
    
    return () => {
      playMusic.stop();
    };
  }, []);
  // Show loading state while checking authentication
  if (mgid.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-charcoal via-ink to-charcoal flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-12 h-12 border-4 border-electric-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-soft-white font-futuristic">Loading...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal via-ink to-charcoal">
      <Header currentPage="play" onNavigate={handleNavigate} />
      
      <main className="pt-20 pb-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-32 h-32 mx-auto mb-8 relative">
              <Image
                src="/assets/monrush_logo.png"
                alt="MonadRush Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            
            <h1 className="text-6xl font-futuristic font-bold text-electric-cyan mb-4">
              MONAD RUSH
            </h1>
            
            <p className="text-xl text-soft-white/80 mb-2 font-futuristic">
              Mission 7 - Hackathon Challenge
            </p>
            
            <p className="text-lg text-purple-accent mb-8 max-w-2xl mx-auto">
              Fast-paced reaction game where you tap falling Monad logos while avoiding dangerous glitches and bombs. 
              Build combos, unlock magic cards, and compete for the highest score!
            </p>
          </motion.div>

          {/* Authentication Section */}
          <motion.div
            className="bg-glass border border-purple-accent/20 rounded-xl p-8 shadow-neon max-w-md mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            {mgid.isAuthenticated ? (
              // Authenticated - show play button and user info
              <div>
                <h2 className="text-2xl font-futuristic font-bold text-success-lime mb-4">
                  Welcome Back!
                </h2>
                <p className="text-soft-white/80 mb-6">
                  {mgid.displayName}
                  {mgid.walletAddress && (
                    <span className="block text-sm text-soft-white/60">
                      {mgid.walletAddress.slice(0, 6)}...{mgid.walletAddress.slice(-4)}
                    </span>
                  )}
                </p>
                <motion.button
                  onClick={() => window.location.href = '/play'}
                  className="w-full px-8 py-4 bg-gradient-to-r from-electric-cyan to-purple-accent text-charcoal font-futuristic font-bold rounded-lg hover:from-purple-accent hover:to-electric-cyan transition-all duration-300 mb-4"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  START PLAYING
                </motion.button>
                <motion.button
                  onClick={mgid.logoutMGID}
                  className="w-full px-4 py-2 bg-transparent border border-danger text-danger font-futuristic rounded-lg hover:bg-danger hover:text-charcoal transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Logout
                </motion.button>
              </div>
            ) : (
              // Not authenticated - show login options
              <div>
                <h2 className="text-2xl font-futuristic font-bold text-electric-cyan mb-4">
                  Get Started
                </h2>
                <p className="text-soft-white/80 mb-6">
                  Sign in with your Monad Games ID to play and track your high scores!
                </p>
                
                <motion.button
                  onClick={mgid.loginWithMGID}
                  disabled={mgid.isLoading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-electric-cyan to-purple-accent text-charcoal font-futuristic font-bold rounded-lg hover:from-purple-accent hover:to-electric-cyan transition-all duration-300 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  whileHover={{ scale: mgid.isLoading ? 1 : 1.05 }}
                  whileTap={{ scale: mgid.isLoading ? 1 : 0.98 }}
                >
                  {mgid.isLoading ? 'CONNECTING...' : 'SIGN IN WITH MGID'}
                </motion.button>
                
                {mgid.error && (
                  <div className="mb-4 p-3 bg-danger/20 border border-danger/50 rounded-lg">
                    <p className="text-danger text-sm">{mgid.error}</p>
                  </div>
                )}
                
                {!mgid.hasUsername && mgid.isAuthenticated && (
                  <div className="mb-4 p-3 bg-electric-cyan/20 border border-electric-cyan/50 rounded-lg">
                    <p className="text-electric-cyan text-sm mb-2">
                      You don&apos;t have a username yet!
                    </p>
                    <a
                      href={MGID_REGISTRATION_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-electric-cyan hover:text-purple-accent underline"
                    >
                      Register your username here →
                    </a>
                  </div>
                )}
                
                <p className="text-soft-white/60 text-sm">
                  New to Monad Games ID?{' '}
                  <a
                    href={MGID_REGISTRATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-electric-cyan hover:text-purple-accent underline"
                  >
                    Create an account
                  </a>
                </p>
              </div>
            )}
          </motion.div>
          
          {/* Game Features */}
          <motion.div
            className="mt-12 grid md:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="bg-glass border border-electric-cyan/20 rounded-xl p-6">
              <h3 className="text-xl font-futuristic font-bold text-electric-cyan mb-3">
                Fast-Paced Action
              </h3>
              <p className="text-soft-white/80 text-sm">
                120 seconds of intense gameplay with increasing difficulty every 30 seconds
              </p>
            </div>
            
            <div className="bg-glass border border-purple-accent/20 rounded-xl p-6">
              <h3 className="text-xl font-futuristic font-bold text-purple-accent mb-3">
                Magic Cards
              </h3>
              <p className="text-soft-white/80 text-sm">
                10 unique power-ups from Time Freeze to Monad Swarm - strategize your way to victory
              </p>
            </div>
            
            <div className="bg-glass border border-success-lime/20 rounded-xl p-6">
              <h3 className="text-xl font-futuristic font-bold text-success-lime mb-3">
                Global Leaderboard
              </h3>
              <p className="text-soft-white/80 text-sm">
                Compete with players across all MGID games for ultimate bragging rights
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}