export interface Bookmark {
  time: number
  label: string
}

export interface OverlayState {
  show: boolean
  symbol: string
  side: 'center' | 'left' | 'right'
  fade: boolean // Whether to apply fade-out animation
}
