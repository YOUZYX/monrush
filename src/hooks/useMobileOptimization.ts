/**
 * Mobile Optimization Hook for MonadRush
 * Handles responsive design, touch optimization, and mobile-specific features
 */

import { useState, useEffect, useCallback } from 'react';

export interface MobileConfig {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  viewportHeight: number;
  viewportWidth: number;
  safeAreaTop: number;
  safeAreaBottom: number;
}

export interface TouchOptimization {
  minTouchTarget: number;
  touchDelay: number;
  scrollPrevention: boolean;
  hapticFeedback: boolean;
}

export function useMobileOptimization(): {
  config: MobileConfig;
  touchConfig: TouchOptimization;
  preventDefaultTouch: (e: TouchEvent) => void;
  vibrate: (pattern?: number | number[]) => void;
  requestFullscreen: () => Promise<void>;
  exitFullscreen: () => Promise<void>;
} {
  const [config, setConfig] = useState<MobileConfig>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenSize: 'lg',
    orientation: 'landscape',
    touchSupport: false,
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    safeAreaTop: 0,
    safeAreaBottom: 0,
  });

  const touchConfig: TouchOptimization = {
    minTouchTarget: config.isMobile ? 44 : 40, // iOS HIG minimum
    touchDelay: config.isMobile ? 300 : 100,
    scrollPrevention: config.isMobile,
    hapticFeedback: config.isMobile && 'vibrate' in navigator,
  };

  const detectDeviceType = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Detect device type
    const isMobile = width < 768 || /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = width >= 768 && width < 1024;
    const isDesktop = width >= 1024;
    
    // Screen size categories
    let screenSize: 'sm' | 'md' | 'lg' | 'xl';
    if (width < 640) screenSize = 'sm';
    else if (width < 768) screenSize = 'md';
    else if (width < 1024) screenSize = 'lg';
    else screenSize = 'xl';
    
    // Orientation
    const orientation = width > height ? 'landscape' : 'portrait';
    
    // Touch support
    const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Safe areas (for notched devices)
    const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0');
    const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0');

    setConfig({
      isMobile,
      isTablet,
      isDesktop,
      screenSize,
      orientation,
      touchSupport,
      viewportHeight: height,
      viewportWidth: width,
      safeAreaTop,
      safeAreaBottom,
    });
  }, []);

  // Prevent default touch behaviors for game area
  const preventDefaultTouch = useCallback((e: TouchEvent) => {
    // Prevent scroll, zoom, and other default touch behaviors
    if (e.target && (e.target as Element).closest('.game-area')) {
      e.preventDefault();
    }
  }, []);

  // Haptic feedback
  const vibrate = useCallback((pattern: number | number[] = 50) => {
    if ('vibrate' in navigator && touchConfig.hapticFeedback) {
      navigator.vibrate(pattern);
    }
  }, [touchConfig.hapticFeedback]);

  // Fullscreen management
  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    detectDeviceType();
    
    const handleResize = () => {
      detectDeviceType();
    };
    
    const handleOrientationChange = () => {
      // Delay to ensure viewport has updated
      setTimeout(detectDeviceType, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Touch event prevention
    if (touchConfig.scrollPrevention) {
      document.addEventListener('touchmove', preventDefaultTouch, { passive: false });
      document.addEventListener('touchstart', preventDefaultTouch, { passive: false });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('touchmove', preventDefaultTouch);
      document.removeEventListener('touchstart', preventDefaultTouch);
    };
  }, [detectDeviceType, preventDefaultTouch, touchConfig.scrollPrevention]);

  return {
    config,
    touchConfig,
    preventDefaultTouch,
    vibrate,
    requestFullscreen,
    exitFullscreen,
  };
}

// CSS-in-JS responsive styles helper
export function getResponsiveStyles(config: MobileConfig) {
  return {
    // Touch target sizes
    touchTarget: {
      minWidth: config.isMobile ? '44px' : '40px',
      minHeight: config.isMobile ? '44px' : '40px',
    },
    
    // Game area sizing
    gameArea: {
      width: '100%',
      height: config.isMobile 
        ? `calc(100vh - ${config.safeAreaTop}px - ${config.safeAreaBottom}px)`
        : '100vh',
      paddingTop: config.safeAreaTop,
      paddingBottom: config.safeAreaBottom,
    },
    
    // Text sizing
    text: {
      fontSize: config.screenSize === 'sm' ? '0.875rem' : 
                 config.screenSize === 'md' ? '1rem' :
                 config.screenSize === 'lg' ? '1.125rem' : '1.25rem',
    },
    
    // Button sizing
    button: {
      padding: config.isMobile ? '12px 24px' : '8px 16px',
      fontSize: config.isMobile ? '1rem' : '0.875rem',
    },
    
    // HUD positioning
    hud: {
      top: config.isMobile ? `${config.safeAreaTop + 10}px` : '20px',
      left: config.isMobile ? '10px' : '20px',
      right: config.isMobile ? '10px' : '20px',
    },
  };
}

// Performance optimization for mobile
export function useMobilePerformance(config: MobileConfig) {
  useEffect(() => {
    if (config.isMobile) {
      // Reduce animations for better performance on mobile
      document.documentElement.style.setProperty('--animation-duration', '0.2s');
      document.documentElement.style.setProperty('--transition-duration', '0.15s');
      
      // Optimize rendering
      if ('visualViewport' in window) {
        const viewport = window.visualViewport!;
        const updateViewport = () => {
          document.documentElement.style.setProperty('--vh', `${viewport.height * 0.01}px`);
        };
        
        viewport.addEventListener('resize', updateViewport);
        updateViewport();
        
        return () => {
          viewport.removeEventListener('resize', updateViewport);
        };
      }
    } else {
      // Desktop animations
      document.documentElement.style.setProperty('--animation-duration', '0.3s');
      document.documentElement.style.setProperty('--transition-duration', '0.2s');
    }
  }, [config.isMobile]);
}
