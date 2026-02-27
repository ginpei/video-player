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
