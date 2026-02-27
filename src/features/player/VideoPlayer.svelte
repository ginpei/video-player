<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  let videoUrl = ''
  let videoName = ''
  let isDragging = false
  let showHelp = false

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
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
  >
    <video
      bind:this={videoEl}
      class="w-full aspect-video bg-black"
      controls
      src={videoUrl}
    >
      <track kind="captions" />
    </video>

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

  <div class="mt-4 flex flex-wrap items-center gap-3">
    <button
      type="button"
      class="rounded-full bg-amber-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5"
      on:click={() => fileInput?.click()}
    >
      Select video
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="video/*"
      class="hidden"
      on:change={handleFileInput}
    />
    <button
      type="button"
      class="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
      on:click={() => (showHelp = !showHelp)}
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

{#if showHelp}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
    on:click={() => (showHelp = false)}
  >
    <div
      class="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 text-slate-100 shadow-2xl"
      on:click|stopPropagation
    >
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">Keyboard shortcuts</h2>
        <button
          type="button"
          class="text-sm font-semibold text-slate-300 hover:text-slate-100"
          on:click={() => (showHelp = false)}
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
