/** Janela curta após toque do usuário — tentativa de autoplay com som no mobile */
const GESTURE_WINDOW_MS = 4000;

let gestureAt = 0;
let audioUnlocked = false;

export function signalMobilePlaybackGesture(): void {
  gestureAt = Date.now();
}

export function shouldAutoplayWithSound(): boolean {
  return Date.now() - gestureAt < GESTURE_WINDOW_MS;
}

export function unlockMobileAudio(): void {
  audioUnlocked = true;
  gestureAt = Date.now();
}

export function isMobileAudioUnlocked(): boolean {
  return audioUnlocked;
}
