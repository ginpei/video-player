export const PLAYBACK_CONFIG = {
  CLICK_DETECTION_WINDOW: 300,
  OVERLAY_FADE_DURATION: 1000,
  SEEK_AMOUNT: 5,
  LEFT_ZONE_RATIO: 1 / 3,
  RIGHT_ZONE_RATIO: 2 / 3,
  SWIPE_DETECTION_THRESHOLD: 10, // Minimum pixels to activate swipe mode (10px × 0.01 = 0.1s)
  SWIPE_SENSITIVITY: 0.01, // Seconds per pixel (10px = 0.1s)
} as const
