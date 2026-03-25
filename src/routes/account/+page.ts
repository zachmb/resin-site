// Disable SSR for account page - AccountView relies on client-side Svelte 5 reactivity
// SSR hydration mismatch was preventing $state updates from re-rendering the tab content
export const ssr = false;
