/**
 * Audio Manager for MonadRush
 * Handles sound effects and background music with Howler.js and rate limiting
 */

import { Howl, Howler } from 'howler';

interface SoundEffect {
  id: string;
  sound: Howl;
  lastPlayed: number;
  minInterval: number; // Minimum time between plays (ms)
}

interface MusicTrack {
  id: string;
  sound: Howl;
  volume: number;
  loop: boolean;
}

export class AudioManager {
  private sounds: Map<string, SoundEffect> = new Map();
  private music: Map<string, MusicTrack> = new Map();
  private currentMusicTrack: string | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private musicVolume: number = 0.3;
  private maxConcurrent: number = 5; // Max concurrent sounds
  private activeSounds: Set<string> = new Set();
  private audioUnlocked: boolean = false;

  constructor() {
    // Initialize Howler
    Howler.volume(this.volume);
    
    this.loadSounds();
    this.loadMusic();
    this.setupAudioUnlock();
  }

  private setupAudioUnlock() {
    // Only setup audio unlock in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // Setup audio unlock on first user interaction
    const unlock = () => {
      if (!this.audioUnlocked) {
        console.log('🔓 Audio context unlocked by user interaction');
        // Enable audio context
        if (Howler.ctx && Howler.ctx.state === 'suspended') {
          Howler.ctx.resume();
        }
        this.audioUnlocked = true;
        
        // Remove listeners after first unlock (only if document is available)
        if (typeof document !== 'undefined') {
          document.removeEventListener('click', unlock);
          document.removeEventListener('touchstart', unlock);
          document.removeEventListener('keydown', unlock);
        }
      }
    };

    // Listen for first user interaction
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    document.addEventListener('keydown', unlock);
  }

  private loadSounds() {
    const soundConfigs = [
      { id: 'logo_tap', src: '/audio/click.mp3', minInterval: 50 },
      { id: 'gift_open', src: '/audio/bonus.mp3', minInterval: 200 },
      { id: 'glitch_hit', src: '/audio/danger.mp3', minInterval: 100 },
      { id: 'bomb_explode', src: '/audio/bomb_explode.mp3', minInterval: 150 },
      { id: 'combo_milestone', src: '/audio/combo.mp3', minInterval: 300 },
      { id: 'time_warning', src: '/audio/time_warning.mp3', minInterval: 1000 },
      { id: 'power_up', src: '/audio/power_up.mp3', minInterval: 200 },
      { id: 'game_start', src: '/audio/game_start.mp3', minInterval: 500 },
      { id: 'game_over', src: '/audio/game_over.mp3', minInterval: 500 },
    ];

    soundConfigs.forEach(config => {
      const sound = new Howl({
        src: [config.src],
        volume: 0.7,
        preload: true,
        onend: () => {
          this.activeSounds.delete(config.id);
        },
        onloaderror: () => {
          console.warn(`Failed to load sound: ${config.id}`);
        }
      });

      this.sounds.set(config.id, {
        id: config.id,
        sound,
        lastPlayed: 0,
        minInterval: config.minInterval,
      });
    });
  }

  private loadMusic() {
    const musicConfigs = [
      { id: 'menu_theme', src: '/audio/menu_music.mp3', volume: 0.3, loop: true },
      { id: 'game_theme', src: '/audio/game_music.mp3', volume: 0.6, loop: true },
      { id: 'intense_theme', src: '/audio/intense_music.mp3', volume: 0.7, loop: true },
    ];

    musicConfigs.forEach(config => {
      const sound = new Howl({
        src: [config.src],
        volume: config.volume,
        loop: config.loop,
        preload: true,
        onloaderror: () => {
          console.warn(`Failed to load music: ${config.id}`);
        }
      });

      this.music.set(config.id, {
        id: config.id,
        sound,
        volume: config.volume,
        loop: config.loop,
      });
    });
  }

  /**
   * Play a sound effect with rate limiting
   */
  play(soundId: string, forcePlay: boolean = false): boolean {
    if (this.isMuted) return false;
    
    // Check if audio is unlocked
    if (!this.audioUnlocked) {
      console.log('🔒 Audio not yet unlocked by user interaction');
      return false;
    }
    
    const soundEffect = this.sounds.get(soundId);
    if (!soundEffect) {
      console.warn(`Sound not found: ${soundId}`);
      return false;
    }

    const now = Date.now();
    const timeSinceLastPlay = now - soundEffect.lastPlayed;

    // Rate limiting check
    if (!forcePlay && timeSinceLastPlay < soundEffect.minInterval) {
      return false;
    }

    // Concurrent sound limiting
    if (this.activeSounds.size >= this.maxConcurrent && !forcePlay) {
      return false;
    }

    try {
      soundEffect.sound.play();
      soundEffect.lastPlayed = now;
      this.activeSounds.add(soundId);
      return true;
    } catch (error) {
      console.error(`Error playing sound ${soundId}:`, error);
      return false;
    }
  }

  /**
   * Play sound with volume variation (for variety)
   */
  playWithVariation(soundId: string, volumeVariation: number = 0.2): boolean {
    const soundEffect = this.sounds.get(soundId);
    if (!soundEffect || this.isMuted) return false;

    const baseVolume = 0.7;
    const variation = (Math.random() - 0.5) * volumeVariation;
    const newVolume = Math.max(0.1, Math.min(1.0, baseVolume + variation));

    soundEffect.sound.volume(newVolume);
    const played = this.play(soundId);
    
    // Reset to base volume
    setTimeout(() => {
      soundEffect.sound.volume(baseVolume);
    }, 100);

    return played;
  }

  /**
   * Play rapid sequence of sounds (for combos)
   */
  playSequence(soundIds: string[], interval: number = 100): void {
    soundIds.forEach((soundId, index) => {
      setTimeout(() => {
        this.play(soundId, true);
      }, index * interval);
    });
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.volume);
  }

  /**
   * Toggle mute
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    Howler.mute(this.isMuted);
    return this.isMuted;
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    Howler.mute(muted);
  }

  /**
   * Get current mute state
   */
  isMutedState(): boolean {
    return this.isMuted;
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Play background music
   */
  playMusic(trackId: string, fadeIn: boolean = true): boolean {
    if (this.isMuted) return false;

    // Check if audio is unlocked
    if (!this.audioUnlocked) {
      console.log('🔒 Audio not yet unlocked by user interaction (music)');
      return false;
    }

    const track = this.music.get(trackId);
    if (!track) {
      console.warn(`Music track not found: ${trackId}`);
      return false;
    }

    // Stop current music track if playing
    if (this.currentMusicTrack && this.currentMusicTrack !== trackId) {
      this.stopMusic(true);
    }

    try {
      if (fadeIn) {
        track.sound.volume(0);
        track.sound.play();
        track.sound.fade(0, track.volume * this.musicVolume, 2000);
      } else {
        track.sound.volume(track.volume * this.musicVolume);
        track.sound.play();
      }

      this.currentMusicTrack = trackId;
      console.log(`Playing music: ${trackId}`);
      return true;
    } catch (error) {
      console.error(`Error playing music ${trackId}:`, error);
      return false;
    }
  }

  /**
   * Stop background music
   */
  stopMusic(fadeOut: boolean = true): void {
    if (!this.currentMusicTrack) return;

    const track = this.music.get(this.currentMusicTrack);
    if (track) {
      if (fadeOut) {
        track.sound.fade(track.sound.volume(), 0, 1000);
        setTimeout(() => {
          track.sound.stop();
        }, 1000);
      } else {
        track.sound.stop();
      }
    }

    this.currentMusicTrack = null;
    console.log('Music stopped');
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    
    if (this.currentMusicTrack) {
      const track = this.music.get(this.currentMusicTrack);
      if (track) {
        track.sound.volume(track.volume * this.musicVolume);
      }
    }
  }

  /**
   * Get current music track
   */
  getCurrentMusicTrack(): string | null {
    return this.currentMusicTrack;
  }

  /**
   * Manually unlock audio (for explicit user interactions like audio button)
   */
  unlockAudio(): void {
    if (!this.audioUnlocked) {
      console.log('🔓 Manually unlocking audio context...');
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume();
      }
      this.audioUnlocked = true;
    }
  }

  /**
   * Check if audio is unlocked
   */
  isAudioUnlocked(): boolean {
    return this.audioUnlocked;
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.sounds.forEach(soundEffect => {
      soundEffect.sound.stop();
    });
    this.activeSounds.clear();
    this.stopMusic(false);
  }

  /**
   * Cleanup and dispose of all sounds
   */
  dispose(): void {
    this.stopAll();
    this.sounds.forEach(soundEffect => {
      soundEffect.sound.unload();
    });
    this.music.forEach(track => {
      track.sound.unload();
    });
    this.sounds.clear();
    this.music.clear();
  }

  /**
   * Get audio statistics
   */
  getStats(): {
    totalSounds: number;
    totalMusic: number;
    activeSounds: number;
    currentMusic: string | null;
    isMuted: boolean;
    volume: number;
    musicVolume: number;
  } {
    return {
      totalSounds: this.sounds.size,
      totalMusic: this.music.size,
      activeSounds: this.activeSounds.size,
      currentMusic: this.currentMusicTrack,
      isMuted: this.isMuted,
      volume: this.volume,
      musicVolume: this.musicVolume,
    };
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Convenience functions for common game actions
export const playSound = {
  logoTap: () => audioManager.playWithVariation('logo_tap', 0.3),
  giftOpen: () => audioManager.play('gift_open'),
  glitchHit: () => audioManager.playWithVariation('glitch_hit', 0.2),
  bombExplode: () => audioManager.play('bomb_explode'),
  comboMilestone: (combo: number) => {
    // Different sound patterns for different combo levels
    if (combo >= 5) {
      audioManager.playSequence(['combo_milestone', 'power_up'], 150);
    } else {
      audioManager.play('combo_milestone');
    }
  },
  timeWarning: () => audioManager.play('time_warning', true),
  powerUp: () => audioManager.play('power_up'),
  gameStart: () => audioManager.play('game_start'),
  gameOver: () => audioManager.play('game_over'),
};

// Convenience functions for music control
export const playMusic = {
  menu: () => {
    console.log('🎵 playMusic.menu() called');
    return audioManager.playMusic('menu_theme');
  },
  game: () => {
    console.log('🎵 playMusic.game() called');
    return audioManager.playMusic('game_theme');
  },
  intense: () => {
    console.log('🎵 playMusic.intense() called');
    return audioManager.playMusic('intense_theme');
  },
  stop: () => {
    console.log('🎵 playMusic.stop() called');
    audioManager.stopMusic();
  },
};
