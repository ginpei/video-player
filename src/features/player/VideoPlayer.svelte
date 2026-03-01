<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { formatTime, validateFile } from '../../shared/lib'
  import type { Bookmark, OverlayState } from '../../shared/types'
  import { PLAYBACK_CONFIG } from './config'
  import HelpDialog from './HelpDialog.svelte'
  import BookmarkPanel from './BookmarkPanel.svelte'

  let videoUrl = $state('')
  let videoName = $state('')
  let isDragging = $state(false)
  let showHelp = $state(false)
  let isPlaying = $state(false)
  let currentTime = $state(0)
  let duration = $state(0)
  let overlay = $state<OverlayState>({ show: false, symbol: '', side: 'center', fade: false })
  let overlayTimer: ReturnType<typeof setTimeout> | null = null
  let clickTimer: ReturnType<typeof setTimeout> | null = null
  let lastPointerX = 0
  let wasPlayingBeforeSeeking = false
  let seekRafId: number | null = null

  // Swipe state
  let isSwiping = $state(false)
  let isPointerDownOnVideo = false
  let swipeStartX = 0
  let swipeStartY = 0
  let swipeStartTime = 0
  let swipeCurrentX = 0
  let swipeCurrentY = 0
  let swipePointerId: number | null = null
  let swipeTargetEl: HTMLElement | null = null

  let bookmarks = $state<Bookmark[]>([])

  let fileInput: HTMLInputElement | null = null
  let videoEl: HTMLVideoElement | null = null
  let objectUrl: string | null = null

  function clearAllTimers() {
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    if (overlayTimer) {
      clearTimeout(overlayTimer)
      overlayTimer = null
    }
    if (seekRafId !== null) {
      cancelAnimationFrame(seekRafId)
      seekRafId = null
    }
  }

  function loadFile(file: File) {
    const error = validateFile(file)
    if (error) {
      console.warn(error)
      return
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }

    objectUrl = URL.createObjectURL(file)
    videoUrl = objectUrl
    videoName = file.name
    bookmarks = []
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    loadFile(files[0])
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    isDragging = false
    handleFiles(event.dataTransfer?.files ?? null)
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    isDragging = true
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault()
    if (event.currentTarget === event.target) {
      isDragging = false
    }
  }

  function handleFileInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    handleFiles(input.files)
    input.value = ''
  }

  function togglePlay() {
    if (!videoEl) return
    if (videoEl.paused) {
      void videoEl.play()
    } else {
      videoEl.pause()
    }
  }

  async function showPlaybackOverlay() {
    if (!videoEl) return
    overlay.show = false
    overlay.symbol = videoEl.paused ? '⏸' : '▶'
    overlay.side = 'center'
    overlay.fade = true

    if (overlayTimer) {
      clearTimeout(overlayTimer)
    }

    await tick()
    overlay.show = true
    overlayTimer = setTimeout(() => {
      overlay.show = false
      overlayTimer = null
    }, PLAYBACK_CONFIG.OVERLAY_FADE_DURATION)
  }

  async function showSeekOverlay(symbol: string, side: 'left' | 'right') {
    overlay.show = false
    overlay.symbol = symbol
    overlay.side = side
    overlay.fade = true

    if (overlayTimer) {
      clearTimeout(overlayTimer)
    }

    await tick()
    overlay.show = true
    overlayTimer = setTimeout(() => {
      overlay.show = false
      overlayTimer = null
    }, PLAYBACK_CONFIG.OVERLAY_FADE_DURATION)
  }

  function updateSwipeOverlay(offsetSeconds: number) {
    // Just update the overlay text, don't toggle visibility
    const rounded = Number(offsetSeconds.toFixed(1))
    const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : ''
    overlay.symbol = `${sign}${Math.abs(rounded).toFixed(1)}s`
    overlay.side = 'center'
  }

  function calculateSwipeOffset(distance: number): number {
    // Apply gradient sensitivity: short distances = fine control, long distances = coarse control
    // Formula: offset = baseSensitivity * distance + acceleration * distance^2
    const absDistance = Math.abs(distance)
    const sign = Math.sign(distance)
    const baseOffset = PLAYBACK_CONFIG.SWIPE_BASE_SENSITIVITY * absDistance
    const acceleratedOffset = PLAYBACK_CONFIG.SWIPE_ACCELERATION * absDistance * absDistance
    return sign * (baseOffset + acceleratedOffset)
  }

  function showSeekingOverlay() {
    // Show overlay when entering seeking mode (no fade animation)
    overlay.fade = false
    overlay.show = true
  }

  function hideSeekingOverlay() {
    // Hide overlay when exiting seeking mode
    overlay.show = false
  }

  function handleVideoPointerDown(event: PointerEvent) {
    if (event.button !== 0) return
    if (!videoEl) return
    lastPointerX = event.clientX
    
    // Initialize swipe state
    isPointerDownOnVideo = true
    swipeStartX = event.clientX
    swipeStartY = event.clientY
    swipeCurrentX = event.clientX
    swipeCurrentY = event.clientY
    swipeStartTime = videoEl.currentTime
    isSwiping = false
    
    // Store pointer info for later capture (only capture when we detect horizontal swipe)
    swipePointerId = event.pointerId
    swipeTargetEl = event.currentTarget as HTMLElement
  }

  function handleVideoPointerMove(event: PointerEvent) {
    if (!videoEl) return
    
    // Only process if pointer is actually down on the video
    if (!isPointerDownOnVideo) return
    
    // Only allow swipe when video is paused
    if (!videoEl.paused) return
    
    swipeCurrentX = event.clientX
    swipeCurrentY = event.clientY
    const horizontalDistance = swipeCurrentX - swipeStartX
    const verticalDistance = swipeCurrentY - swipeStartY
    const absHorizontal = Math.abs(horizontalDistance)
    const absVertical = Math.abs(verticalDistance)
    
    // Enter seeking mode if moved beyond threshold AND movement is more horizontal than vertical
    if (!isSwiping && absHorizontal > PLAYBACK_CONFIG.SWIPE_DETECTION_THRESHOLD) {
      // Only activate if swipe is more horizontal than vertical
      if (absHorizontal > absVertical) {
        isSwiping = true
        // Cancel any pending click timer when swipe is detected
        if (clickTimer) {
          clearTimeout(clickTimer)
          clickTimer = null
        }
        // Capture pointer now that we confirmed horizontal swipe
        if (swipePointerId !== null && swipeTargetEl) {
          swipeTargetEl.setPointerCapture(swipePointerId)
        }
        // Show overlay when entering seeking mode
        showSeekingOverlay()
      }
    }
    
    // Once in seeking mode, continue updating regardless of distance
    if (isSwiping) {
      // Calculate offset with gradient sensitivity
      const swipeOffset = calculateSwipeOffset(horizontalDistance)
      const targetTime = swipeStartTime + swipeOffset
      
      // Clamp to valid range
      const dur = Number.isFinite(videoEl.duration) ? videoEl.duration : Infinity
      videoEl.currentTime = Math.min(Math.max(0, targetTime), dur)
      
      // Update overlay text during seeking
      updateSwipeOverlay(swipeOffset)
    }
  }

  function handleVideoPointerUp() {
    if (!videoEl) return

    // Only process if pointer was actually down on the video
    // (prevents seek bar from triggering play/pause)
    if (!isPointerDownOnVideo && !isSwiping) return

    // Reset pointer down state
    isPointerDownOnVideo = false
    swipePointerId = null
    swipeTargetEl = null

    // If it was a swipe, exit seeking mode and hide overlay
    if (isSwiping) {
      isSwiping = false
      // Hide overlay immediately when releasing pointer
      hideSeekingOverlay()
      return
    }

    if (clickTimer) {
      // Second click within window - it's a double click, cancel single click
      clearTimeout(clickTimer)
      clickTimer = null
      // Handle double-tap seek based on pointer position
      const rect = videoEl.getBoundingClientRect()
      const offsetX = lastPointerX - rect.left
      const isLeftSide = offsetX < rect.width * PLAYBACK_CONFIG.LEFT_ZONE_RATIO
      const isRightSide = offsetX > rect.width * PLAYBACK_CONFIG.RIGHT_ZONE_RATIO
      if (isLeftSide || isRightSide) {
        seekBy(isLeftSide ? -PLAYBACK_CONFIG.SEEK_AMOUNT : PLAYBACK_CONFIG.SEEK_AMOUNT)
        void showSeekOverlay(isLeftSide ? '⏮' : '⏭', isLeftSide ? 'left' : 'right')
      }
    } else {
      // First click, wait to see if there's a double click
      clickTimer = setTimeout(() => {
        togglePlay()
        void showPlaybackOverlay()
        clickTimer = null
      }, PLAYBACK_CONFIG.CLICK_DETECTION_WINDOW)
    }
  }

  function handleVideoPointerCancel() {
    // Reset state if pointer interaction is cancelled
    isPointerDownOnVideo = false
    swipePointerId = null
    swipeTargetEl = null
    if (isSwiping) {
      isSwiping = false
      hideSeekingOverlay()
    }
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
  }

  function seekBy(seconds: number) {
    if (!videoEl) return
    const dur = Number.isFinite(videoEl.duration) ? videoEl.duration : Infinity
    const nextTime = Math.min(Math.max(0, videoEl.currentTime + seconds), dur)
    videoEl.currentTime = nextTime
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ignore keydown when typing in input fields
    const target = event.target as HTMLElement | null
    const tagName = target?.tagName?.toLowerCase()
    if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) {
      return
    }

    if (event.key === ' ') {
      event.preventDefault()
      togglePlay()
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      seekBy(-PLAYBACK_CONFIG.SEEK_AMOUNT)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      seekBy(PLAYBACK_CONFIG.SEEK_AMOUNT)
      return
    }

    if (event.key === '?') {
      event.preventDefault()
      showHelp = !showHelp
    }
  }

  function handleTimeUpdate(event: Event) {
    const el = event.currentTarget as HTMLVideoElement
    currentTime = el.currentTime
  }

  function handleLoadedMetadata(event: Event) {
    const el = event.currentTarget as HTMLVideoElement
    duration = Number.isFinite(el.duration) ? el.duration : 0
    currentTime = el.currentTime
  }

  function handlePlay() {
    isPlaying = true
  }

  function handlePause() {
    isPlaying = false
  }

  function handleSeekInput(event: Event) {
    if (!videoEl) return
    const input = event.currentTarget as HTMLInputElement
    const time = Number(input.value)

    if (seekRafId !== null) {
      cancelAnimationFrame(seekRafId)
    }
    seekRafId = requestAnimationFrame(() => {
      if (videoEl) videoEl.currentTime = time
      seekRafId = null
    })
  }

  function handleSeekPointerDown() {
    if (!videoEl) return
    wasPlayingBeforeSeeking = isPlaying
    videoEl.pause()
  }

  function handleSeekPointerUp() {
    if (!videoEl) return
    if (wasPlayingBeforeSeeking) {
      void videoEl.play()
    }
  }

  function addBookmark() {
    if (!videoEl || !Number.isFinite(videoEl.currentTime)) return
    const label = `Bookmark ${formatTime(videoEl.currentTime)}`
    bookmarks = [...bookmarks, { time: videoEl.currentTime, label }]
    sortBookmarks()
  }

  function sortBookmarks() {
    bookmarks = bookmarks.sort((a, b) => a.time - b.time)
  }

  function seekToBookmark(bookmark: Bookmark) {
    if (!videoEl) return
    videoEl.currentTime = bookmark.time
  }

  function deleteBookmark(index: number) {
    bookmarks = bookmarks.filter((_, i) => i !== index)
  }

  function handleWindowDragOver(event: DragEvent) {
    event.preventDefault()
    isDragging = true
  }

  function handleWindowDragLeave(event: DragEvent) {
    if (!event.relatedTarget) {
      isDragging = false
    }
  }

  function handleWindowDrop(event: DragEvent) {
    event.preventDefault()
    isDragging = false
    handleFiles(event.dataTransfer?.files ?? null)
  }

  onDestroy(() => {
    clearAllTimers()
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  })
</script>

<svelte:window
  onkeydown={handleKeydown}
  ondragover={handleWindowDragOver}
  ondragleave={handleWindowDragLeave}
  ondrop={handleWindowDrop}
  onpointerup={handleVideoPointerUp}
/>

<div class="VideoPlayer w-full mx-auto mb-32">
  <div
    class={
      `relative overflow-hidden rounded border border-slate-800 bg-slate-950/80 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.9)] ${
        isDragging ? 'ring-4 ring-amber-400/70 border-amber-300/60' : ''
      }`
    }
    role="region"
    aria-label="Video player"
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <video
      bind:this={videoEl}
      class="w-full aspect-video bg-black max-h-[calc(100vh-calc(var(--spacing)*11)-32px)]"
      style="touch-action: pan-y;"
      src={videoUrl}
      onloadedmetadata={handleLoadedMetadata}
      ontimeupdate={handleTimeUpdate}
      onplay={handlePlay}
      onpause={handlePause}
      onpointerdown={handleVideoPointerDown}
      onpointermove={handleVideoPointerMove}
      onpointercancel={handleVideoPointerCancel}
    >
      <track kind="captions" />
    </video>

    {#if overlay.show}
      <div class="pointer-events-none absolute inset-0" aria-live="polite" aria-atomic="true">
        <div
          class={
            `absolute inset-y-0 flex items-center justify-center bg-slate-950/40 text-4xl font-semibold text-slate-100 tabular-nums ${
              overlay.fade ? 'overlay-fade' : ''
            } ${
              overlay.side === 'left'
                ? 'left-0 w-1/3'
                : overlay.side === 'right'
                  ? 'right-0 w-1/3'
                  : 'left-0 w-full'
            }`
          }
        >
          {overlay.symbol}
        </div>
      </div>
    {/if}

    {#if !videoUrl}
      <div
        class="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur cursor-pointer hover:bg-slate-950/70 transition"
        role="button"
        tabindex="0"
        onclick={() => fileInput?.click()}
        onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
      >
        <div class="text-center px-6">
          <p class="text-lg font-semibold text-slate-100">
            Drop a local video file
          </p>
          <p class="mt-2 text-sm text-slate-300">
            Or click here to choose one
          </p>
        </div>
      </div>
    {/if}

    {#if isDragging}
      <div class="absolute inset-0 flex items-center justify-center bg-amber-400/10">
        <p class="text-sm font-semibold uppercase tracking-[0.3em] text-amber-200">
          Release to load
        </p>
      </div>
    {/if}
  </div>

  <div class="mt-4 flex flex-col gap-3">
    <div class="card flex flex-wrap items-center gap-3 px-4 py-3">
      <!-- Play button - After seekbar on mobile, before on desktop -->
      <button
        type="button"
        class="order-2 sm:order-1 rounded bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={togglePlay}
        disabled={!videoUrl}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      
      <!-- Seekbar - Full width on mobile, shared row on desktop -->
      <div class="order-1 sm:order-2 flex w-full sm:min-w-45 sm:flex-1 items-center gap-3 text-sm text-slate-200">
        <div class="relative w-full">
          <!-- Bookmark markers overlay -->
          {#if bookmarks.length > 0 && duration > 0}
            <div class="absolute inset-0 pointer-events-none">
              {#each bookmarks as bookmark}
                <span
                  class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-3 sm:w-1.5 sm:h-4 bg-amber-400 rounded-full shadow-sm shadow-amber-300/50"
                  style="left: {(bookmark.time / duration) * 100}%"
                  title="{formatTime(bookmark.time)} - {bookmark.label}"
                ></span>
              {/each}
            </div>
          {/if}
          
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={currentTime}
            aria-label={`Seek – ${formatTime(currentTime)} of ${formatTime(duration)}`}
            class="h-1 w-full cursor-pointer appearance-none bg-slate-700 relative z-10"
            oninput={handleSeekInput}
            onpointerdown={handleSeekPointerDown}
            onpointerup={handleSeekPointerUp}
            disabled={!videoUrl || !duration}
          />
        </div>
      </div>
      
      <!-- Time displays -->
      <span class="order-3 tabular-nums text-sm text-slate-200">{formatTime(currentTime)}</span>
      <span class="order-3 text-sm text-slate-400">/</span>
      <span class="order-3 tabular-nums text-sm text-slate-200">{formatTime(duration)}</span>
    </div>

    <BookmarkPanel
      {bookmarks}
      {videoUrl}
      onAdd={addBookmark}
      onDelete={deleteBookmark}
      onSeek={seekToBookmark}
    />

    <div class="flex flex-wrap items-center gap-3 px-4">
    <button
      type="button"
      class="rounded bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5"
      onclick={() => fileInput?.click()}
    >
      Select video
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="video/*"
      class="hidden"
      onchange={handleFileInput}
    />
    <button
      type="button"
      class="rounded border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
      onclick={() => (showHelp = !showHelp)}
    >
      Shortcuts (?)
    </button>

    {#if videoName}
      <span class="text-sm text-slate-300">
        Now playing: {videoName}
      </span>
    {/if}
    </div>
  </div>
</div>

<HelpDialog bind:open={showHelp} />

