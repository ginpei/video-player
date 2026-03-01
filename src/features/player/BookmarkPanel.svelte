<script lang="ts">
  import { formatTime } from "../../shared/lib";
  import type { Bookmark } from "../../shared/types";

  interface Props {
    bookmarks: Bookmark[];
    videoUrl: string;
    onAdd: () => void;
    onDelete: (index: number) => void;
    onSeek: (bookmark: Bookmark) => void;
  }

  let { bookmarks, videoUrl, onAdd, onDelete, onSeek }: Props = $props();

  function handleKeydown(event: KeyboardEvent, index: number) {
    if (event.key === "Delete") {
      event.preventDefault();
      onDelete(index);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const parent = (event.currentTarget as HTMLElement).closest(
        '[role="list"]',
      );
      const items = parent?.querySelectorAll<HTMLElement>(
        '[role="listitem"] button:first-child',
      );
      items?.[index + 1]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const parent = (event.currentTarget as HTMLElement).closest(
        '[role="list"]',
      );
      const items = parent?.querySelectorAll<HTMLElement>(
        '[role="listitem"] button:first-child',
      );
      items?.[index - 1]?.focus();
    }
  }
</script>

<div class="card p-4">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold text-slate-200">
      Bookmarks ({bookmarks.length})
    </h3>
    <button
      type="button"
      class="rounded bg-amber-400 px-4 py-1.5 text-sm font-semibold text-slate-950 shadow-sm shadow-amber-300/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      onclick={onAdd}
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
        <div
          class="flex items-center justify-between rounded bg-slate-900/50 px-3 py-2"
          role="listitem"
        >
          <button
            type="button"
            class="flex-1 text-left text-sm text-slate-100 hover:text-amber-400 transition"
            onclick={() => onSeek(bookmark)}
            onkeydown={(e) => handleKeydown(e, index)}
            title="Jump to bookmark"
          >
            <span class="font-mono">{formatTime(bookmark.time)}</span>
            <span class="ml-2 text-slate-400">{bookmark.label}</span>
          </button>
          <button
            type="button"
            class="ml-2 text-xs text-slate-400 hover:text-red-400 transition"
            onclick={() => onDelete(index)}
            title="Delete bookmark"
          >
            ✕
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>
