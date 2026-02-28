<script lang="ts">
  import { onDestroy, tick } from 'svelte'
  import { formatTime } from '../../shared/lib'
  import type { Bookmark } from '../../shared/types'
  import { PLAYBACK_CONFIG } from './config'

  let videoUrl = $state('')
  let videoName = $state('')
  let isDragging = $state(false)
  let showHelp = $state(false)
  let isPlaying = $state(false)
  let currentTime = $state(0)
  let duration = $state(0)
  let volume = $state(1)
  let isMuted = $state(false)
  let showOverlay = $state(false)
  let overlaySymbol = $state('')
  let overlaySide = $state<'center' | 'left' | 'right'>('center')
  let overlayTimer: ReturnType<typeof setTimeout> | null = null
  let clickTimer: ReturnType<typeof setTimeout> | null = null
  let isHolding = $state(false)
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let pointerDownTime = 0
  let lastPointerX = 0
  let originalPlaybackRate = $state(1)
  let isSeeking = false
  let wasPlayingBeforeSeeking = false
  let seekRafId: number | null = null

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
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    if (seekRafId !== null) {
      cancelAnimationFrame(seekRafId)
      seekRafId = null
    }
  }

  function loadFile(file: File) {
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
    showOverlay = false
    overlaySymbol = videoEl.paused ? '⏸' : '▶'
    overlaySide = 'center'

    if (overlayTimer) {
      clearTimeout(overlayTimer)
    }

    await tick()
    showOverlay = true
    overlayTimer = setTimeout(() => {
      showOverlay = false
      overlayTimer = null
    }, PLAYBACK_CONFIG.OVERLAY_FADE_DURATION)
  }

  async function showSeekOverlay(symbol: string, side: 'left' | 'right') {
    showOverlay = false
    overlaySymbol = symbol
    overlaySide = side

    if (overlayTimer) {
      clearTimeout(overlayTimer)
    }

    await tick()
    showOverlay = true
    overlayTimer = setTimeout(() => {
      showOverlay = false
      overlayTimer = null
    }, PLAYBACK_CONFIG.OVERLAY_FADE_DURATION)
  }

  function handleVideoPointerDown(event: PointerEvent) {
    if (event.button !== 0 || !videoEl) return
    lastPointerX = event.clientX
    pointerDownTime = Date.now()
    holdTimer = setTimeout(() => {
      if (!videoEl) return
      isHolding = true
      originalPlaybackRate = videoEl.playbackRate
      videoEl.playbackRate = PLAYBACK_CONFIG.FAST_PLAYBACK_RATE
      holdTimer = null
    }, PLAYBACK_CONFIG.HOLD_TO_2X_THRESHOLD)
  }

  function handleVideoPointerUp() {
    const pressDuration = Date.now() - pointerDownTime

    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }

    if (isHolding) {
      // Was holding for 2x speed, just restore speed
      isHolding = false
      if (videoEl) {
        videoEl.playbackRate = originalPlaybackRate
      }
      return
    }

    // Quick press, treat as potential click
    if (pressDuration < PLAYBACK_CONFIG.HOLD_TO_2X_THRESHOLD) {
      if (clickTimer) {
        // Second click within window - it's a double click, cancel single click
        clearTimeout(clickTimer)
        clickTimer = null
        // Handle double-tap seek based on pointer position
        if (videoEl) {
          const rect = videoEl.getBoundingClientRect()
          const offsetX = lastPointerX - rect.left
          const isLeftSide = offsetX < rect.width * PLAYBACK_CONFIG.LEFT_ZONE_RATIO
          const isRightSide = offsetX > rect.width * PLAYBACK_CONFIG.RIGHT_ZONE_RATIO
          if (isLeftSide || isRightSide) {
            seekBy(isLeftSide ? -PLAYBACK_CONFIG.SEEK_AMOUNT : PLAYBACK_CONFIG.SEEK_AMOUNT)
            void showSeekOverlay(isLeftSide ? '⏮' : '⏭', isLeftSide ? 'left' : 'right')
          }
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
  }

  function handleVideoPointerLeave() {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
    if (!isHolding || !videoEl) return
    isHolding = false
    videoEl.playbackRate = originalPlaybackRate
  }

  function toggleMute() {
    if (!videoEl) return
    videoEl.muted = !videoEl.muted
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

  function handleVolumeChange(event: Event) {
    const el = event.currentTarget as HTMLVideoElement
    volume = el.volume
    isMuted = el.muted
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
    isSeeking = true
    wasPlayingBeforeSeeking = isPlaying
    videoEl.pause()
  }

  function handleSeekPointerUp() {
    if (!videoEl) return
    isSeeking = false
    if (wasPlayingBeforeSeeking) {
      void videoEl.play()
    }
  }

  function handleVolumeInput(event: Event) {
    if (!videoEl) return
    const input = event.currentTarget as HTMLInputElement
    videoEl.volume = Number(input.value)
    if (videoEl.volume === 0) {
      videoEl.muted = true
    } else if (videoEl.muted) {
      videoEl.muted = false
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

  function handleBookmarkKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Delete') {
      event.preventDefault()
      deleteBookmark(index)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      const parent = (event.currentTarget as HTMLElement).closest('[role="list"]')
      const items = parent?.querySelectorAll<HTMLElement>('[role="listitem"] button:first-child')
      items?.[index + 1]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      const parent = (event.currentTarget as HTMLElement).closest('[role="list"]')
      const items = parent?.querySelectorAll<HTMLElement>('[role="listitem"] button:first-child')
      items?.[index - 1]?.focus()
    }
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
/>

<div class="w-full max-w-5xl mx-auto">
  <div
    class={
      `relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.9)] ${
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
      class="w-full aspect-video bg-black max-h-[calc(100vh-32px)] "
      src={videoUrl}
      onloadedmetadata={handleLoadedMetadata}
      ontimeupdate={handleTimeUpdate}
      onplay={handlePlay}
      onpause={handlePause}
      onvolumechange={handleVolumeChange}
      onpointerdown={handleVideoPointerDown}
      onpointerup={handleVideoPointerUp}
      onpointerleave={handleVideoPointerLeave}
    >
      <track kind="captions" />
    </video>

    {#if showOverlay}
      <div class="pointer-events-none absolute inset-0" aria-live="polite" aria-atomic="true">
        <div
          class={
            `overlay-fade absolute inset-y-0 flex items-center justify-center bg-slate-950/40 text-4xl font-semibold text-slate-100 ${
              overlaySide === 'left'
                ? 'left-0 w-1/3'
                : overlaySide === 'right'
                  ? 'right-0 w-1/3'
                  : 'left-0 w-full'
            }`
          }
        >
          {overlaySymbol}
        </div>
      </div>
    {/if}

    {#if !videoUrl}
      <div class="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur">
        <div class="text-center px-6">
          <p class="text-lg font-semibold text-slate-100">
            Drop a local video file
          </p>
          <p class="mt-2 text-sm text-slate-300">
            Or use the select button below to choose one
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
    <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3">
      <!-- Play button - After seekbar on mobile, before on desktop -->
      <button
        type="button"
        class="order-2 sm:order-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
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
            class="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700 relative z-10"
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
      
      <!-- Volume controls - New line on mobile, same line on desktop -->
      <div class="order-4 flex w-full sm:w-auto items-center gap-3">
        <button
          type="button"
          class="rounded-full border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
          onclick={toggleMute}
          disabled={!videoUrl}
          aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
          title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
        >
          {isMuted || volume === 0 ? '🔇' : '🔊'}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          class="h-1 w-28 cursor-pointer appearance-none rounded-full bg-slate-700"
          oninput={handleVolumeInput}
          disabled={!videoUrl}
        />
      </div>
    </div>

    <div class="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-slate-200">
          Bookmarks ({bookmarks.length})
        </h3>
        <button
          type="button"
          class="rounded-full bg-amber-400 px-4 py-1.5 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          onclick={addBookmark}
          disabled={!videoUrl}
          title="Bookmark current position"
        >
          🔖 Add
        </button>
      </div>
      {#if bookmarks.length === 0}
        <p class="text-sm text-slate-400">No bookmarks yet</p>
      {:else}
        <div class="space-y-2 max-h-48 overflow-y-auto" role="list">
          {#each bookmarks as bookmark, index (index)}
            <div class="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2" role="listitem">
              <button
                type="button"
                class="flex-1 text-left text-sm text-slate-100 hover:text-amber-400 transition"
                onclick={() => seekToBookmark(bookmark)}
                onkeydown={(e) => handleBookmarkKeydown(e, index)}
                title="Jump to bookmark"
              >
                <span class="font-mono">{formatTime(bookmark.time)}</span>
                <span class="ml-2 text-slate-400">{bookmark.label}</span>
              </button>
              <button
                type="button"
                class="ml-2 text-xs text-slate-400 hover:text-red-400 transition"
                onclick={() => deleteBookmark(index)}
                title="Delete bookmark"
              >
                ✕
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex flex-wrap items-center gap-3">
    <button
      type="button"
      class="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5"
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
      class="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
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

{#if showHelp}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
    role="button"
    tabindex="0"
    onclick={() => (showHelp = false)}
    onkeydown={(e) => e.key === 'Escape' && (showHelp = false)}
  >
    <div
      class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl"
      role="dialog"
      aria-labelledby="help-title"
      aria-modal="true"
      tabindex="0"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="flex items-center justify-between">
        <h2 id="help-title" class="text-lg font-semibold">Keyboard shortcuts</h2>
        <button
          type="button"
          class="text-sm font-semibold text-slate-300 hover:text-slate-100"
          onclick={() => (showHelp = false)}
        >
          Close
        </button>
      </div>
      <dl class="mt-4 grid grid-cols-[auto,1fr] gap-x-4 gap-y-2 text-sm">
        <dt class="font-semibold text-slate-200">Space</dt>
        <dd class="text-slate-300">Play or pause</dd>
        <dt class="font-semibold text-slate-200">Left</dt>
        <dd class="text-slate-300">Seek back 5 seconds</dd>
        <dt class="font-semibold text-slate-200">Right</dt>
        <dd class="text-slate-300">Seek forward 5 seconds</dd>
        <dt class="font-semibold text-slate-200">?</dt>
        <dd class="text-slate-300">Toggle this list</dd>
      </dl>
    </div>
  </div>
{/if}

<style>
  .overlay-fade {
    animation: overlay-fade 1s ease-out forwards;
  }

  @keyframes overlay-fade {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
