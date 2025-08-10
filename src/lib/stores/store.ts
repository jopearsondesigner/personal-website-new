// src/lib/stores/store.ts
// CHANGELOG (2025-08-10)
// - Acts as a barrel that re-exports from layout-store.ts to keep import paths stable.
// - Ensures `{ layoutStore }` is a named export at `$lib/stores/store`.

export { layoutStore, cssVars } from './layout-store';
export type { LayoutStoreState as LayoutStore } from './layout-store';
