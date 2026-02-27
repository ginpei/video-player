# Svelte 5 Migration & Reference Guide

## Quick Summary
- Svelte 4 and 5 syntax can coexist; upgrade is gradual
- Runes replace implicit reactivity (`$state`, `$derived`, `$effect`)
- Events: DOM handlers are properties (`onclick` not `on:click`); components use callbacks
- Snippets replace slots (but slots still work)
- Components are functions, not classes (`mount`/`unmount` instead of `new Component()`)

---

## Reactivity Changes

### let → $state
```ts
// Svelte 4
let count = 0

// Svelte 5
let count = $state(0)
```
- Read and write directly: no `.value` wrapper needed
- Used for reactive state declarations

### $: → $derived / $effect
```ts
// Svelte 4
let count = 0
$: double = count * 2
$: if (count > 5) alert('High!')

// Svelte 5
let count = $state(0)
const double = $derived(count * 2)
$effect(() => {
  if (count > 5) alert('High!')
})
```
- `$derived`: for computed values (like Svelte 4 `$:` assignments)
- `$effect`: for side effects (replaces `$:` statements with side effects)
- `$effect` runs **after DOM updates**; use `$effect.pre` for before-DOM

### export let → $props
```ts
// Svelte 4
export let optional = 'unset'
export let required

// Svelte 5
let { optional = 'unset', required } = $props()
```
- All props via `$props()` destructuring
- Rename: `let { class: klass } = $props()`
- Rest props: `let { foo, ...rest } = $props()`
- All props: `let props = $props()` (no destructuring)

---

## Event Changes

### DOM Handlers: on:event → onevent properties
```svelte
<!-- Svelte 4 -->
<button on:click={() => count++}>
  clicks: {count}
</button>

<!-- Svelte 5 -->
<button onclick={() => count++}>
  clicks: {count}
</button>
```
- Event handlers are now **properties**, not directives
- No colon (`:`) in the name
- Use shorthand: `let function onclick() { ... }` then `<button {onclick}>`

### Event Modifiers
```ts
// Svelte 4
<button on:click|preventDefault={handler}>

// Svelte 5
// Inline logic
<button onclick={(e) => { e.preventDefault(); handler(e); }}>

// Or wrapper function
function preventDefault(fn) {
  return (e) => { e.preventDefault(); fn(e) }
}
<button onclick={preventDefault(handler)}>
```
- `capture` modifier: use `onclickcapture`
- `passive` and `nonpassive`: use actions (rarely needed)
- No multiple handlers on same event (use a wrapper function instead)

### Component Events: createEventDispatcher → callback props
```ts
// Svelte 4 (Pump.svelte)
import { createEventDispatcher } from 'svelte'
const dispatch = createEventDispatcher()
<button onclick={() => dispatch('inflate', power)}>inflate</button>

// Svelte 5 (Pump.svelte)
let { inflate, deflate } = $props()
<button onclick={() => inflate(power)}>inflate</button>
```
- Pass callbacks as props instead of emitting events
- Parent passes functions to child; child calls them
- More explicit, no event dispatcher needed

---

## Slots → Snippets

### Default slot/content
```svelte
<!-- Svelte 4 -->
<!-- Card.svelte -->
<div><slot /></div>

<!-- App.svelte -->
<Card><p>Hello</p></Card>

<!-- Svelte 5 -->
<!-- Card.svelte -->
<script>
  let { children } = $props()
</script>
<div>{@render children?.()}</div>

<!-- App.svelte -->
<Card>
  {#snippet children()}
    <p>Hello</p>
  {/snippet}
</Card>
```

### Named slots
```svelte
<!-- Svelte 4 -->
<header><slot name="header" /></header>
<main><slot /></main>
<footer><slot name="footer" /></footer>

<!-- Svelte 5 -->
<script>
  let { header, main, footer } = $props()
</script>
<header>{@render header?.()}</header>
<main>{@render main?.()}</main>
<footer>{@render footer?.()}</footer>
```

### Slots with data (let:)
```svelte
<!-- Svelte 4: List.svelte -->
{#each items as entry}
  <li><slot item={entry} /></li>
{/each}

<!-- Svelte 4: App.svelte -->
<List items={...} let:item>
  {item}
</List>

<!-- Svelte 5: List.svelte -->
<script>
  let { items, item } = $props()
</script>
{#each items as entry}
  <li>{@render item(entry)}</li>
{/each}

<!-- Svelte 5: App.svelte -->
<List items={...}>
  {#snippet item(entry)}
    {entry}
  {/snippet}
</List>
```

**Backwards compatibility**: Old slots still work; you can pass snippets into slot-based components, but not vice versa.

---

## Components: Classes → Functions

### mount / hydrate
```ts
// Svelte 4
import App from './App.svelte'
const app = new App({ target: document.getElementById("app") })

// Svelte 5
import { mount } from 'svelte'
import App from './App.svelte'
const app = mount(App, { target: document.getElementById("app") })
```
- `mount`: instantiate component functionally
- `hydrate`: mount and hydrate server-rendered HTML
- Returns object with component exports and prop accessors (if `accessors: true`)
- **Not synchronous**: `onMount` won't run immediately; use `flushSync()` if needed

### unmount / $destroy
```ts
// Svelte 4
app.$destroy()

// Svelte 5
import { unmount } from 'svelte'
unmount(app)
```

### Component props (reactive)
```ts
// Svelte 4: use $set
const app = new App({ ... })
app.$set({ foo: 'bar' })

// Svelte 5: use reactive state
import { mount } from 'svelte'
const props = $state({ foo: 'bar' })
const app = mount(App, { target: ..., props })
props.foo = 'baz'  // updates component
```

### Component events
```ts
// Svelte 4: use $on
const app = new App({ ... })
app.$on('myevent', (e) => console.log(e.detail))

// Svelte 5: pass callback via props
const app = mount(App, { 
  target: ..., 
  events: { myevent: (e) => console.log(e.detail) }
})
// Or better: pass as regular props
const app = mount(SomeComponent, { 
  target: ..., 
  props: { onMyevent: (e) => console.log(e.detail) }
})
```

### Backwards compat: createClassComponent
```ts
import { createClassComponent } from 'svelte/legacy'
const app = createClassComponent({ component: App, target: ... })
// Now has $on, $set, $destroy like Svelte 4
```

---

## Runes Mode Breaking Changes

### $bindable for two-way props
```ts
// Svelte 4: all export let are bindable
export let myValue = 'default'

// Svelte 5: must opt-in
let { myValue = $bindable('default') } = $props()
```
- If default value, must pass non-`undefined` to use binding

### Component exports can't be bound
```ts
// Not allowed in runes mode
<ChildComponent bind:foo />  // ❌ Error

// Instead: use bind:this and access exports
let child
<ChildComponent bind:this={child} />
{child.foo}
```

### accessors option ignored
- In SVelte 5 runes, props are not accessible on component instance
- Use component exports instead: `export const getName = () => name`

### immutable option ignored
- Concept replaced by how `$state` works

### Classes not auto-reactive
```ts
// Svelte 4: reactive
let foo = new Foo()
foo.value = 1  // triggers reactivity

// Svelte 5: must use $state on fields
class Foo {
  value = $state(0)
}
let foo = new Foo()  // $state(new Foo()) won't make fields reactive
```

---

## Other Key Changes

### Event attribute syntax
- `onclick`, `onchange`, `ontouchstart`, etc. now work like props
- Touch events (`ontouchstart`, `ontouchmove`) are **passive** by default
- No string values: `onclick="alert('hi')"` not allowed

### Dynamic components
```svelte
<!-- Svelte 4 -->
<svelte:component this={Thing} />

<!-- Svelte 5 (can do either) -->
<Thing />
<svelte:component this={Thing} />
```

### Whitespace handling stricter
- Whitespace between nodes → collapsed to one
- Whitespace at start/end of tag → removed
- Exception: `<pre>` and `preserveWhitespace` option

### HTML structure stricter
- Compiler throws error if DOM is malformed (browser would auto-repair)
- Example: `<tr>` outside `<tbody>` now errors

### Bindings
- `bind:files` is two-way; values must be `null`/`undefined`/`FileList`
- Bindings now react to form `reset` events
- Input-range bindings only use `input` event (no `change` fallback)

### null / undefined → empty string
```ts
{null}      // Svelte 4: "null"  → Svelte 5: ""
{undefined} // Svelte 4: "undefined" → Svelte 5: ""
```

### Scoped CSS uses :where()
```css
/* Svelte 5 adds :where(.svelte-xyz) to reduce specificity issues */
.my-class { ... } 
/* becomes */
:where(.svelte-xyz123) .my-class { ... }
```

---

## Migration Script

```bash
npx sv migrate svelte-5
```

Automatically converts:
- `let` → `$state`
- `$:` → `$derived`/`$effect`
- `export let` → `$props()`
- `on:event` → `onevent`
- `<slot />` → `{@render children?.()}`
- `new Component(...)` → `mount(Component, ...)`

**Manual fixes needed**:
- `createEventDispatcher` → callback props
- `beforeUpdate`/`afterUpdate` → `$effect.pre`/`$effect`
- Event modifiers (except `capture`)
- Complex `$:` logic may need manual review

---

## TypeScript / Components

### Component type definition
```ts
import type { Component } from 'svelte'

export declare const MyComponent: Component<{
  foo: string
  bar?: number
}>
```

### Deprecated utilities
- `SvelteComponent` → use `Component` type
- `ComponentEvents` → no longer needed (events are callback props)
- `ComponentType` → use `Component` directly

---

## Development Notes

- Modern browsers only (no IE; uses Proxy, ResizeObserver)
- No `legacy` compiler option
- `hydratable` removed (always hydratable)
- Always generates source maps
- Build via `npm run build` (TypeScript check + production build)

