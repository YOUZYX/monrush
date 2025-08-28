'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useMGID } from '@/hooks/useMGID';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { MGID_REGISTRATION_URL } from '@/lib/mgid';
import { audioManager } from '@/lib/audio-manager';

interface HeaderProps {
  currentPage?: 'play' | 'how-to-play' | 'leaderboard';
  onNavigate?: (page: string) => void;
}

export function Header({ 
  currentPage = 'play', 
  onNavigate
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(audioManager.isMutedState());
  const mgid = useMGID();
  const { toasts, showToast, removeToast } = useToast();

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Wallet address copied to clipboard!', 'success');
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Wallet address copied to clipboard!', 'success');
      } catch (fallbackError) {
        showToast('Failed to copy address', 'error');
      }
    }
  };

  const toggleAudio = () => {
    // Manually unlock audio on first user interaction
    audioManager.unlockAudio();
    
    const newMutedState = audioManager.toggleMute();
    setIsMuted(newMutedState);
    showToast(
      newMutedState ? 'Audio muted 🔇' : 'Audio enabled 🔊', 
      newMutedState ? 'info' : 'success'
    );
  };
  
  const navItems = [
    { id: 'play', label: 'PLAY', path: '/' },
    { id: 'how-to-play', label: 'HOW TO PLAY', path: '/how-to-play' },
    { id: 'leaderboard', label: 'LEADERBOARD', path: '/leaderboard' },
  ];



  return (
    <motion.header
      className="fixed top-0 left-0 right-0 w-full bg-glass border-b border-purple-accent/20 backdrop-blur-md z-50 shadow-lg"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <motion.div
            className="flex items-center space-x-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <div className="w-10 h-10 relative">
              <Image
                src="/assets/Monad_logo_tap.svg"
                alt="MonadRush Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-futuristic font-bold text-electric-cyan">
                MONAD RUSH
              </h1>
              <div className="text-xs text-purple-accent font-futuristic">
                Mission 7
              </div>
            </div>
          </motion.div>

          {/* Center: Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => onNavigate?.(item.id)}
                className={`relative px-4 py-2 font-futuristic font-bold transition-all duration-300 ${
                  currentPage === item.id
                    ? 'text-electric-cyan'
                    : 'text-soft-white hover:text-electric-cyan'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {item.label}
                
                {/* Active indicator */}
                {currentPage === item.id && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-cyan"
                    layoutId="activeTab"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                
                {/* Hover glow */}
                <motion.div
                  className="absolute inset-0 bg-electric-cyan/10 rounded-lg opacity-0"
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
              </motion.button>
            ))}
          </nav>

          {/* Right: Audio Toggle + MGID Authentication */}
          <div className="flex items-center space-x-4">
            {/* Audio Toggle Button */}
            <motion.button
              onClick={toggleAudio}
              className={`relative w-10 h-10 rounded-lg border-2 transition-all duration-300 flex items-center justify-center overflow-hidden ${
                isMuted 
                  ? 'bg-danger/20 border-danger/30 text-danger hover:bg-danger/30' 
                  : 'bg-success-lime/20 border-success-lime/30 text-success-lime hover:bg-success-lime/30'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={isMuted ? 'Enable Audio' : 'Disable Audio'}
            >
              {!isMuted && (
                <motion.div
                  className="absolute inset-0 bg-success-lime/10 rounded-lg"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                    scale: [0.9, 1.1, 0.9],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              )}
              
              {isMuted ? (
                // Muted icon
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M16.5 12C16.5 10.23 15.48 8.71 14 7.97V9.18L16.45 11.63C16.48 11.94 16.5 12.47 16.5 12ZM19 12C19 12.94 18.8 13.82 18.46 14.64L19.97 16.15C20.63 14.91 21 13.5 21 12C21 7.72 18 4.14 14 3.23V5.29C16.89 6.15 19 8.83 19 12ZM4.27 3L3 4.27L7.73 9H3V15H7L12 20V13.27L16.25 17.53C15.58 18.04 14.83 18.46 14 18.7V20.77C15.38 20.45 16.63 19.82 17.68 18.96L19.73 21L21 19.73L12 10.73L4.27 3ZM12 4L9.91 6.09L12 8.18V4Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                // Unmuted icon with sound waves animation
                <div className="relative">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3 9V15H7L12 20V4L7 9H3ZM16.5 12C16.5 10.23 15.48 8.71 14 7.97V16.02C15.48 15.29 16.5 13.77 16.5 12ZM14 3.23V5.29C16.89 6.15 19 8.83 19 12C19 15.17 16.89 17.85 14 18.71V20.77C18.01 19.86 21 16.28 21 12C21 7.72 18.01 4.14 14 3.23Z"
                      fill="currentColor"
                    />
                  </svg>
                  {/* Animated sound wave dots */}
                  <div className="absolute -right-1 top-1 w-1 h-1 bg-success-lime rounded-full">
                    <motion.div
                      className="w-1 h-1 bg-success-lime rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                  </div>
                  <div className="absolute -right-1 top-3 w-1 h-1 bg-success-lime rounded-full">
                    <motion.div
                      className="w-1 h-1 bg-success-lime rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                  <div className="absolute -right-1 top-5 w-1 h-1 bg-success-lime rounded-full">
                    <motion.div
                      className="w-1 h-1 bg-success-lime rounded-full"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.6 }}
                    />
                  </div>
                </div>
              )}
            </motion.button>

            {mgid.isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {mgid.isLoading ? (
                  <motion.div
                    className="px-3 py-1 bg-electric-cyan/20 border border-electric-cyan/30 rounded text-electric-cyan text-xs font-futuristic"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    FETCHING USERNAME...
                  </motion.div>
                ) : !mgid.hasUsername ? (
                  <motion.a
                    href={MGID_REGISTRATION_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-danger/20 border border-danger/30 rounded text-danger text-xs font-futuristic"
                    whileHover={{ scale: 1.05 }}
                  >
                    SET USERNAME
                  </motion.a>
                ) : null}
                
                {/* User Dropdown Container */}
                <div className="relative user-dropdown-container">
                  <motion.button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="flex items-center space-x-3 px-4 py-2 bg-success-lime/10 border border-success-lime/30 rounded-lg hover:bg-success-lime/20 transition-colors"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-2 h-2 bg-success-lime rounded-full animate-pulse" />
                    <span className="text-success-lime font-futuristic text-sm">
                      {mgid.displayName}
                    </span>
                    <motion.div
                      animate={{ rotate: showUserDropdown ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-success-lime/60"
                    >
                      ▼
                    </motion.div>
                  </motion.button>

                  {/* Dropdown Menu */}
                  {showUserDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-charcoal/95 border border-purple-accent/30 rounded-lg shadow-2xl backdrop-blur-md z-50"
                    >
                      <div className="p-4">
                        {/* Username */}
                        <div className="mb-3">
                          <label className="text-soft-white/60 text-xs font-futuristic uppercase tracking-wider">
                            Username
                          </label>
                          <div className="text-success-lime font-futuristic text-sm mt-1">
                            {mgid.username || 'No username set'}
                          </div>
                        </div>

                        {/* Wallet Address */}
                        <div className="mb-4">
                          <label className="text-soft-white/60 text-xs font-futuristic uppercase tracking-wider">
                            Wallet Address
                          </label>
                          <div className="mt-1">
                            <div className="bg-ink/50 rounded p-2 mb-2">
                              <code className="text-electric-cyan font-mono text-xs break-all block">
                                {mgid.walletAddress}
                              </code>
                            </div>
                            <motion.button
                              onClick={() => {
                                if (mgid.walletAddress) {
                                  copyToClipboard(mgid.walletAddress);
                                  setShowUserDropdown(false);
                                }
                              }}
                              className="w-full px-3 py-2 bg-electric-cyan/20 hover:bg-electric-cyan/30 text-electric-cyan text-xs font-futuristic rounded transition-colors flex items-center justify-center space-x-2"
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path
                                  d="M16 1H4C2.9 1 2 1.9 2 3V17H4V3H16V1ZM19 5H8C6.9 5 6 5.9 6 7V21C6 22.1 6.9 23 8 23H19C20.1 23 21 22.1 21 21V7C21 5.9 20.1 5 19 5ZM19 21H8V7H19V21Z"
                                  fill="currentColor"
                                />
                              </svg>
                              <span>COPY ADDRESS</span>
                            </motion.button>
                          </div>
                        </div>

                        {/* Balance Display */}
                        <div className="mb-4">
                          <label className="text-soft-white/60 text-xs font-futuristic uppercase tracking-wider">
                            Wallet Balance
                          </label>
                          <div className="text-purple-accent font-futuristic text-sm mt-1 flex items-center space-x-2">
                            <span>
                              {mgid.balance ? `${(parseFloat(mgid.balance) / 1e18).toFixed(4)} MON` : 'Loading...'}
                            </span>
                            {mgid.hasMinimumBalance ? (
                              <span className="text-success-lime text-xs">✓</span>
                            ) : (
                              <span className="text-error-red text-xs">⚠</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="border-t border-purple-accent/20 pt-3 space-y-2">
                          {!mgid.hasUsername && (
                            <motion.a
                              href={MGID_REGISTRATION_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block w-full px-3 py-2 bg-purple-accent/20 hover:bg-purple-accent/30 text-purple-accent text-xs font-futuristic rounded transition-colors text-center"
                              whileHover={{ scale: 1.02 }}
                              onClick={() => setShowUserDropdown(false)}
                            >
                              SET USERNAME
                            </motion.a>
                          )}
                          
                          <motion.button
                            onClick={() => {
                              mgid.logoutMGID();
                              setShowUserDropdown(false);
                            }}
                            className="w-full px-3 py-2 bg-danger/20 hover:bg-danger/30 text-danger text-xs font-futuristic rounded transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            LOGOUT
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={mgid.loginWithMGID}
                  disabled={mgid.isLoading}
                  className="px-6 py-2 bg-purple-accent text-soft-white font-futuristic font-bold rounded-lg hover:bg-purple-accent/80 transition-all duration-300 shadow-neon-purple disabled:opacity-50"
                  whileHover={{ scale: mgid.isLoading ? 1 : 1.05, boxShadow: '0 0 20px rgba(122, 95, 255, 0.5)' }}
                  whileTap={{ scale: mgid.isLoading ? 1 : 0.95 }}
                >
                  {mgid.isLoading ? 'LOADING...' : 'SIGN IN WITH MGID'}
                </motion.button>

                {/* Disconnect Button */}
                {mgid.privy.authenticated && (
                  <motion.button
                    onClick={mgid.logoutMGID}
                    className="w-10 h-10 bg-danger/20 hover:bg-danger/30 text-danger border border-danger/30 rounded-lg transition-all duration-300 flex items-center justify-center"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Disconnect Wallet"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M16 7L8 15M8 7L16 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.button>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-soft-white hover:text-electric-cyan transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <motion.nav
            className="md:hidden mt-4 pt-4 border-t border-purple-accent/20"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate?.(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-left px-4 py-2 rounded-lg font-futuristic transition-all duration-300 ${
                    currentPage === item.id
                      ? 'text-electric-cyan bg-electric-cyan/10'
                      : 'text-soft-white hover:text-electric-cyan hover:bg-electric-cyan/5'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.nav>
        )}
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </motion.header>
  );
}
