// This file manages audio feedback sounds
// Uses Web Audio API for real-time sound generation

// ============ UI FEEDBACK SOUNDS ============
// Generated via Web Audio API for crisp, responsive feedback

export type SoundType = 'click' | 'refresh' | 'success' | 'switch' | 'error' | 'tap';

// Notification sound options
export type NotificationSoundId = 'chime' | 'bell' | 'pop' | 'ding' | 'alert' | 'coin';

export interface NotificationSoundOption {
  id: NotificationSoundId;
  name: string;
  description: string;
}

export const NOTIFICATION_SOUNDS: NotificationSoundOption[] = [
  { id: 'chime', name: 'Chime', description: 'Soft chime' },
  { id: 'bell', name: 'Bell', description: 'Classic bell' },
  { id: 'pop', name: 'Pop', description: 'Quick pop' },
  { id: 'ding', name: 'Ding', description: 'Bright ding' },
  { id: 'alert', name: 'Alert', description: 'Attention alert' },
  { id: 'coin', name: 'Coin', description: 'Coin drop' },
];

// Web Audio API context for generating sounds
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioContext;
}

// Legacy SOUNDS object for backward compatibility (now generates real sounds)
export const SOUNDS: Record<SoundType, string> = {
  click: 'generated',
  refresh: 'generated', 
  success: 'generated',
  switch: 'generated',
  error: 'generated',
  tap: 'generated',
};

/**
 * Generate UI feedback sounds using Web Audio API
 * These are crisp, short sounds that feel native
 */
export function playUISound(type: SoundType, volume: number = 0.15): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    switch (type) {
      case 'tap':
      case 'click': {
        // Quick pop sound - short and tactile
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
      
      case 'switch': {
        // Toggle swoosh - slightly longer
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.03);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume * 0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      
      case 'success': {
        // Pleasant two-tone chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = 523.25; // C5
        osc2.frequency.value = 659.25; // E5
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc1.start(now);
        osc2.start(now + 0.08);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.25);
        break;
      }
      
      case 'error': {
        // Low buzz for errors
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 150;
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume * 0.6, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      
      case 'refresh': {
        // Whoosh sound
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.2);
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
    }
  } catch {
    // Ignore audio errors silently
  }
}

// Generate notification sounds using Web Audio API
function generateNotificationSound(soundId: NotificationSoundId, volume: number = 0.3): void {
  try {
    const ctx = getAudioContext();
    
    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.value = volume;
    
    const now = ctx.currentTime;
    
    switch (soundId) {
      case 'chime': {
        // Soft two-tone chime
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = 880;
        osc2.frequency.value = 1320;
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc1.start(now);
        osc2.start(now + 0.1);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.6);
        break;
      }
      
      case 'bell': {
        // Classic bell with harmonics
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 659.25; // E5
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
      }
      
      case 'pop': {
        // Quick pop sound
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      
      case 'ding': {
        // Bright ding
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 1200;
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      }
      
      case 'alert': {
        // Two-tone alert
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(1000, now + 0.15);
        osc.frequency.setValueAtTime(800, now + 0.3);
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
      
      case 'coin': {
        // Coin drop sound
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, now);
        osc.frequency.exponentialRampToValueAtTime(3000, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
        osc.connect(gainNode);
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
    }
  } catch {
    // Ignore audio errors
  }
}

// Play a notification sound by ID
export function playNotificationSound(soundId: NotificationSoundId, volume: number = 0.3): void {
  generateNotificationSound(soundId, volume);
}

// Play success sound for notifications (using selected sound or default)
export function playSuccessSound(): void {
  try {
    const audio = new Audio(SOUNDS.success);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore errors (e.g., autoplay blocked)
    });
  } catch {
    // Ignore errors
  }
}
