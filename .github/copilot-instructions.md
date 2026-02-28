# Video Player Project Guidelines

## Architecture

Feature-based structure: organize features in `src/features/` with barrel exports through `index.ts`. Shared utilities, types, and components live in `src/shared/`. See [src/features/player/](../src/features/player/) as the reference pattern.

## Tech Stack

- **Svelte 5.53.5**: Use `mount()` API (not `new Component()`), see [src/main.ts](../src/main.ts)
- **TypeScript 5.9.3**: Strict mode enabled, explicit event typing required (`event: DragEvent`)
- **Tailwind CSS 4.2.1**: Import via `@import "tailwindcss"` in CSS (no config file)
- **Vite 7.3.1**: Dev server and build tool

## Code Style

- **Svelte components**: Always use `<script lang="ts">`, PascalCase names
- **TypeScript**: Strict settings enabled, no unused variables/parameters allowed
- **Event handlers**: Explicitly type events (`function handle(event: DragEvent)`)
- **Tailwind classes**: Use template literals for conditional classes: `class="base {condition ? 'active' : ''}"`
- **Exports**: Barrel pattern with `index.ts` files (see [src/features/player/index.ts](../src/features/player/index.ts))

## Build Commands

```bash
npm run dev      # Start development server
npm run build    # TypeScript check + production build
npm run preview  # Preview production build
```

## Patterns

**Component structure** ([VideoPlayer.svelte](../src/features/player/VideoPlayer.svelte)):
- State at top, functions below
- Drag/drop uses native HTML5 APIs
- File handling: `URL.createObjectURL()` for local files
- Optional chaining for safe property access

**Utility functions** ([src/shared/lib/](../src/shared/lib/)):
- Pure functions with clear type signatures
- Export through barrel files

**Types** ([src/shared/types/](../src/shared/types/)):
- Interface-based, optional properties with `?`
- Export through barrel files

## Best Practices (Lessons Learned)

**Avoid These Patterns:**
- ❌ Duplicating shared utilities locally (always import from `src/shared/`)
- ❌ Using `MouseEvent` for interactions (use `PointerEvent` for touch support)
- ❌ Hardcoding magic numbers (extract to config files)
- ❌ Using `setTimeout(..., 0)` render hacks (use Svelte `tick()`)
- ❌ Letting components grow past 300 lines (extract components early)
- ❌ Leaving dead code/types in production (remove immediately)

**Follow These Patterns:**
- ✅ Use `requestAnimationFrame` for continuous updates (seeking, scrubbing)
- ✅ Group related state into objects (`overlay`, `video`, `ui`)
- ✅ Add ARIA attributes during initial implementation (not as afterthought)
- ✅ Validate inputs at boundaries (`validateFile()`, clamp values)
- ✅ Consolidate cleanup logic (`clearAllTimers()` helper functions)
- ✅ Extract repeated Tailwind classes to CSS (`.card`, `.overlay-fade`)
- ✅ Document architectural decisions (especially "no" decisions)

**When to Extract:**
- Components: at ~200-300 lines, when boundaries are clear
- State management: when second component needs same state
- Utilities: when pattern appears in 2+ places (not premature)

See [docs/retrospective/2026-02-refactoring.md](../docs/retrospective/2026-02-refactoring.md) for full retrospective and decision rationale.

