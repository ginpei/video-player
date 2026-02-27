<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

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
  
  interface Bookmark {
    time: number
    label: string
  }
  
  let bookmarks = $state<Bookmark[]>([])

  let fileInput: HTMLInputElement | null = null
  let videoEl: HTMLVideoElement | null = null
  let objectUrl: string | null = null

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

  function showPlaybackOverlay() {
    if (!videoEl) return
    overlaySymbol = videoEl.paused ? '⏸' : '▶'
    overlaySide = 'center'
    showOverlay = true
    if (overlayTimer) {
      clearTimeout(overlayTimer)
    }
    overlayTimer = setTimeout(() => {
      showOverlay = false
      overlayTimer = null
    }, 1000)
  }

  function showSeekOverlay(symbol: string, side: 'left' | 'right') {
    overlaySymbol = symbol
    overlaySide = side
    showOverlay = true
    if (overlayTimer) {
      clearTimeout(overlayTimer)
    }
    overlayTimer = setTimeout(() => {
      showOverlay = false
      overlayTimer = null
    }, 1000)
  }

  function handleVideoClick() {
    if (clickTimer) clearTimeout(clickTimer)
    clickTimer = setTimeout(() => {
      togglePlay()
      showPlaybackOverlay()
      clickTimer = null
    }, 300)
  }

  function handleVideoDoubleClick(event: MouseEvent) {
    if (clickTimer) {
      clearTimeout(clickTimer)
      clickTimer = null
    }
    if (!videoEl) return
    const rect = videoEl.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const isLeftSide = offsetX < rect.width / 3
    const isRightSide = offsetX > (rect.width * 2) / 3
    if (!isLeftSide && !isRightSide) return
    seekBy(isLeftSide ? -5 : 5)
    showSeekOverlay(isLeftSide ? '⏮' : '⏭', isLeftSide ? 'left' : 'right')
  }

  function toggleMute() {
    if (!videoEl) return
    videoEl.muted = !videoEl.muted
  }


  function seekBy(seconds: number) {
    if (!videoEl) return
    const duration = Number.isFinite(videoEl.duration) ? videoEl.duration : Infinity
    const nextTime = Math.min(Math.max(0, videoEl.currentTime + seconds), duration)
    videoEl.currentTime = nextTime
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.preventDefault()
      togglePlay()
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      seekBy(-5)
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      seekBy(5)
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
    videoEl.currentTime = Number(input.value)
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

  function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
    const total = Math.floor(seconds)
    const minutes = Math.floor(total / 60)
    const remainder = total % 60
    const padded = remainder.toString().padStart(2, '0')
    return `${minutes}:${padded}`
  }

  function addBookmark() {
    if (!videoEl || !Number.isFinite(videoEl.currentTime)) return
    const label = `Bookmark ${formatTime(videoEl.currentTime)}`
    bookmarks = [...bookmarks, { time: videoEl.currentTime, label }]
  }

  function seekToBookmark(bookmark: Bookmark) {
    if (!videoEl) return
    videoEl.currentTime = bookmark.time
  }

  function deleteBookmark(index: number) {
    bookmarks = bookmarks.filter((_, i) => i !== index)
  }

  onMount(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName?.toLowerCase()
      if (tagName === 'input' || tagName === 'textarea' || target?.isContentEditable) {
        return
      }

      handleKeydown(event)
    }

    const handleWindowDragOver = (event: DragEvent) => {
      event.preventDefault()
      isDragging = true
    }

    const handleWindowDragLeave = (event: DragEvent) => {
      if (!event.relatedTarget) {
        isDragging = false
      }
    }

    const handleWindowDrop = (event: DragEvent) => {
      event.preventDefault()
      isDragging = false
      handleFiles(event.dataTransfer?.files ?? null)
    }

    window.addEventListener('keydown', handler)
    window.addEventListener('dragover', handleWindowDragOver)
    window.addEventListener('dragleave', handleWindowDragLeave)
    window.addEventListener('drop', handleWindowDrop)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('dragover', handleWindowDragOver)
      window.removeEventListener('dragleave', handleWindowDragLeave)
      window.removeEventListener('drop', handleWindowDrop)
    }
  })

  onDestroy(() => {
    if (clickTimer) {
      clearTimeout(clickTimer)
    }
    if (overlayTimer) {
      clearTimeout(overlayTimer)
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
  })
</script>

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
      class="w-full aspect-video bg-black"
      src={videoUrl}
      onloadedmetadata={handleLoadedMetadata}
      ontimeupdate={handleTimeUpdate}
      onplay={handlePlay}
      onpause={handlePause}
      onvolumechange={handleVolumeChange}
      onclick={handleVideoClick}
      ondblclick={handleVideoDoubleClick}
    >
      <track kind="captions" />
    </video>

    {#if showOverlay}
      <div class="pointer-events-none absolute inset-0">
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
      <button
        type="button"
        class="rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        onclick={togglePlay}
        disabled={!videoUrl}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>
      <div class="flex min-w-[180px] flex-1 items-center gap-3 text-sm text-slate-200">
        <span class="tabular-nums">{formatTime(currentTime)}</span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime}
          class="h-1 w-full cursor-pointer appearance-none rounded-full bg-slate-700"
          oninput={handleSeekInput}
          disabled={!videoUrl || !duration}
        />
        <span class="tabular-nums">{formatTime(duration)}</span>
      </div>
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

    <div class="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div class="mb-3 flex items-center justify-between">
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
          🔖 Bookmark
        </button>
      </div>
      {#if bookmarks.length === 0}
        <p class="text-sm text-slate-400">No bookmarks yet</p>
      {:else}
        <div class="space-y-2 max-h-48 overflow-y-auto">
          {#each bookmarks as bookmark, index (index)}
            <div class="flex items-center justify-between rounded-lg bg-slate-900/50 px-3 py-2">
              <button
                type="button"
                class="flex-1 text-left text-sm text-slate-100 hover:text-amber-400 transition"
                onclick={() => seekToBookmark(bookmark)}
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
