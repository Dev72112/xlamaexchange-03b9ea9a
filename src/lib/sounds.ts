// This file generates tiny audio files for feedback sounds
// The sounds are embedded as base64 data URIs

export const SOUNDS = {
  // Subtle click sound (very short)
  click: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  
  // Refresh swoosh sound
  refresh: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  
  // Success chime
  success: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  
  // Switch toggle sound
  switch: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
} as const;

export type SoundType = keyof typeof SOUNDS;

// Play success sound for notifications
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
