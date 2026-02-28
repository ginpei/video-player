<script lang="ts">
  let { open = $bindable(false) }: { open: boolean } = $props()
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
    role="button"
    tabindex="0"
    onclick={() => (open = false)}
    onkeydown={(e) => e.key === 'Escape' && (open = false)}
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
          onclick={() => (open = false)}
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
