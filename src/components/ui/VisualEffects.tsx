/**
 * Visual Effects Manager for MonadRush
 * Handles particle effects, screen shake, and advanced animations
 */

import { motion, useAnimationControls } from 'framer-motion';
import React, { createContext, useContext, useCallback, useState } from 'react';

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ScreenShake {
  intensity: number;
  duration: number;
  startTime: number;
}

interface VisualEffect {
  id: string;
  type: 'explosion' | 'sparkle' | 'shatter' | 'glow';
  x: number;
  y: number;
  startTime: number;
  duration: number;
  particles: Particle[];
}

interface VisualEffectsContextType {
  addEffect: (type: 'explosion' | 'sparkle' | 'shatter' | 'glow', x: number, y: number) => void;
  screenShake: (intensity: number, duration: number) => void;
  effects: VisualEffect[];
}

const VisualEffectsContext = createContext<VisualEffectsContextType | null>(null);

export function VisualEffectsProvider({ children }: { children: React.ReactNode }) {
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [shake, setShake] = useState<ScreenShake | null>(null);
  const shakeControls = useAnimationControls();

  const createParticles = useCallback((type: string, x: number, y: number, count: number): Particle[] => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = Math.random() * 200 + 100;
      
      let color = '#00f5ff'; // Default cyan
      let size = Math.random() * 4 + 2;
      let life = Math.random() * 1000 + 500;
      
      switch (type) {
        case 'explosion':
          color = Math.random() > 0.5 ? '#ff6b6b' : '#ffa726';
          size = Math.random() * 6 + 3;
          life = Math.random() * 800 + 600;
          break;
        case 'sparkle':
          color = Math.random() > 0.5 ? '#00f5ff' : '#7a5fff';
          size = Math.random() * 3 + 1;
          life = Math.random() * 1200 + 800;
          break;
        case 'shatter':
          color = '#64ffda';
          size = Math.random() * 5 + 2;
          life = Math.random() * 600 + 400;
          break;
        case 'glow':
          color = '#64ff64';
          size = Math.random() * 8 + 4;
          life = Math.random() * 1500 + 1000;
          break;
      }

      particles.push({
        id: `particle_${i}_${Date.now()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color,
        life,
        maxLife: life,
      });
    }
    
    return particles;
  }, []);

  const addEffect = useCallback((type: 'explosion' | 'sparkle' | 'shatter' | 'glow', x: number, y: number) => {
    const particleCount = {
      explosion: 12,
      sparkle: 8,
      shatter: 6,
      glow: 15,
    }[type];

    const effect: VisualEffect = {
      id: `effect_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      startTime: Date.now(),
      duration: 2000,
      particles: createParticles(type, x, y, particleCount),
    };

    setEffects(prev => [...prev, effect]);

    // Clean up effect after duration
    setTimeout(() => {
      setEffects(prev => prev.filter(e => e.id !== effect.id));
    }, effect.duration);
  }, [createParticles]);

  const screenShake = useCallback(async (intensity: number, duration: number) => {
    const shakeData: ScreenShake = {
      intensity,
      duration,
      startTime: Date.now(),
    };
    
    setShake(shakeData);

    // Animate screen shake
    await shakeControls.start({
      x: [-intensity, intensity, -intensity, intensity, 0],
      y: [-intensity/2, intensity/2, -intensity/2, intensity/2, 0],
      transition: {
        duration: duration / 1000,
        times: [0, 0.25, 0.5, 0.75, 1],
        ease: "easeOut",
      }
    });

    setShake(null);
  }, [shakeControls]);

  const contextValue: VisualEffectsContextType = {
    addEffect,
    screenShake,
    effects,
  };

  return (
    <VisualEffectsContext.Provider value={contextValue}>
      <motion.div animate={shakeControls} style={{ width: '100%', height: '100%' }}>
        {children}
      </motion.div>
      <ParticleRenderer effects={effects} />
    </VisualEffectsContext.Provider>
  );
}

function ParticleRenderer({ effects }: { effects: VisualEffect[] }) {
  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      {effects.map(effect => (
        <div key={effect.id}>
          {effect.particles.map(particle => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
              }}
              initial={{
                x: particle.x,
                y: particle.y,
                opacity: 1,
                scale: 1,
              }}
              animate={{
                x: particle.x + particle.vx * (particle.maxLife / 1000),
                y: particle.y + particle.vy * (particle.maxLife / 1000) + 100, // Gravity effect
                opacity: 0,
                scale: 0,
              }}
              transition={{
                duration: particle.maxLife / 1000,
                ease: "easeOut",
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function useVisualEffects() {
  const context = useContext(VisualEffectsContext);
  if (!context) {
    throw new Error('useVisualEffects must be used within a VisualEffectsProvider');
  }
  return context;
}

// Convenience hooks for common effects
export function useGameEffects() {
  const effects = useVisualEffects();
  
  return {
    logoTap: (x: number, y: number) => effects.addEffect('sparkle', x, y),
    giftOpen: (x: number, y: number) => effects.addEffect('glow', x, y),
    glitchHit: (x: number, y: number) => {
      effects.addEffect('shatter', x, y);
      effects.screenShake(8, 200);
    },
    bombExplode: (x: number, y: number) => {
      effects.addEffect('explosion', x, y);
      effects.screenShake(15, 400);
    },
    comboMilestone: (x: number, y: number, intensity: number) => {
      effects.addEffect('glow', x, y);
      if (intensity >= 5) {
        effects.screenShake(5, 300);
      }
    },
  };
}
