export const PLAYBACK_CONFIG = {
  CLICK_DETECTION_WINDOW: 300,
  OVERLAY_FADE_DURATION: 1000,
  SEEK_AMOUNT: 5,
  LEFT_ZONE_RATIO: 1 / 3,
  RIGHT_ZONE_RATIO: 2 / 3,
  SWIPE_DETECTION_THRESHOLD: 10, // Minimum pixels to activate swipe mode
  SWIPE_BASE_SENSITIVITY: 0.01, // Base seconds per pixel for short distances
  SWIPE_ACCELERATION: 0.0002, // Acceleration factor for longer distances (quadratic)
} as const
