<script lang="ts">
    import { fade, slide } from "svelte/transition";
    import { scrollLock } from "$lib/actions/scrollLock";

    let { isOpen = $bindable(false) } = $props<{ isOpen: boolean }>();

    // Chrome Web Store listing URL. Fill this in once the extension is published
    // (Chrome Web Store → your item → "View in Chrome Web Store" → copy the URL).
    // Until then the modal shows an honest "in review" state instead of a raw
    // developer install flow — end users should never be told to `git clone`.
    const CHROME_STORE_URL = "";
    const isPublished = CHROME_STORE_URL.length > 0;

    let showDevInstall = $state(false);

    function close() {
        isOpen = false;
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
    }

    const redirectUri =
        "https://vqzaadhoccgtywewtkrm.supabase.co/auth/v1/callback";
</script>

{#if isOpen}
    <div
        class="fixed inset-0 flex items-center justify-center p-4 bg-resin-charcoal/60 backdrop-blur-sm overflow-y-auto"
        style="z-index: var(--z-modal, 100);"
        use:scrollLock={isOpen}
        transition:fade={{ duration: 200 }}
        onclick={close}
        onkeydown={(event) =>
            (event.key === "Enter" || event.key === "Escape") && close()}
        role="button"
        tabindex="0"
        aria-label="Close install guide"
    >
        <div
            class="glass-card w-full max-w-lg rounded-xl border border-white/30 shadow-2xl overflow-hidden flex flex-col my-8"
            onclick={(e) => e.stopPropagation()}
            role="presentation"
            transition:slide={{ duration: 300 }}
        >
            <!-- Header -->
            <div
                class="px-8 py-6 border-b border-resin-forest/10 flex items-center justify-between bg-white/40"
            >
                <div class="flex items-center gap-4">
                    <div
                        class="w-10 h-10 rounded-xl bg-resin-charcoal flex items-center justify-center shadow-lg"
                    >
                        <img
                            src="/resinext-logo.png"
                            alt="Resin Web Shield"
                            class="w-6 h-6 object-contain"
                        />
                    </div>
                    <div>
                        <h2 class="text-xl font-bold text-resin-charcoal">
                            Block distractions in your browser
                        </h2>
                        <p
                            class="text-xs text-resin-earth/60 font-medium uppercase tracking-wider"
                        >
                            Resin for Chrome
                        </p>
                    </div>
                </div>
                <button
                    aria-label="Close"
                    onclick={close}
                    class="w-10 h-10 rounded-full hover:bg-resin-earth/10 flex items-center justify-center text-resin-earth/60 hover:text-resin-charcoal transition-all"
                >
                    <svg
                        class="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Content -->
            <div class="p-8 space-y-6">
                <p class="text-sm text-resin-earth/80 leading-relaxed">
                    The Resin extension mutes distracting sites automatically the
                    moment a focus session starts, and lifts the block the moment
                    it ends — no willpower required.
                </p>

                {#if isPublished}
                    <!-- Real users: one tap to the Chrome Web Store -->
                    <a
                        href={CHROME_STORE_URL}
                        target="_blank"
                        rel="noopener"
                        class="flex w-full items-center justify-center gap-2 rounded-xl bg-resin-charcoal px-5 py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-resin-forest active:scale-[0.99]"
                    >
                        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2zm0 6a4 4 0 100 8 4 4 0 000-8z"/></svg>
                        Add Resin to Chrome — free
                    </a>
                    <p class="text-center text-xs text-resin-earth/60">
                        Then open the popup from your toolbar and sign in — your
                        focus sessions sync automatically.
                    </p>
                {:else}
                    <!-- Pre-launch: honest "in review" state, NOT a git-clone flow -->
                    <div
                        class="rounded-xl border border-resin-amber/25 bg-resin-amber/5 p-5 text-center"
                    >
                        <span
                            class="inline-flex items-center gap-1.5 rounded-full bg-resin-amber/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-resin-charcoal"
                        >
                            <span class="h-1.5 w-1.5 rounded-full bg-resin-amber"></span>
                            In review
                        </span>
                        <p class="mt-3 text-sm text-resin-earth/80 leading-relaxed">
                            The Resin browser blocker is on its way to the Chrome
                            Web Store. Focus sessions on your phone already protect
                            your attention today.
                        </p>
                    </div>
                {/if}

                <!-- Developer / manual install — tucked away, not the default -->
                <div class="border-t border-resin-forest/10 pt-4">
                    <button
                        onclick={() => (showDevInstall = !showDevInstall)}
                        class="flex w-full items-center justify-between text-xs font-semibold text-resin-earth/60 hover:text-resin-charcoal transition-colors"
                    >
                        <span>Developer / manual install</span>
                        <svg
                            class="w-4 h-4 transition-transform {showDevInstall ? 'rotate-180' : ''}"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            stroke-width="2"
                        >
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {#if showDevInstall}
                        <div class="mt-4 space-y-5" transition:slide={{ duration: 200 }}>
                            <div class="space-y-2">
                                <p class="text-xs font-semibold text-resin-charcoal">1. Clone & build</p>
                                <div class="bg-resin-charcoal rounded-lg p-3 flex items-center justify-between gap-3">
                                    <code class="text-[11px] text-white/80 font-mono truncate">git clone https://github.com/zachmb/resinext.git</code>
                                    <button
                                        aria-label="Copy clone command"
                                        onclick={() => copyToClipboard("git clone https://github.com/zachmb/resinext.git")}
                                        class="shrink-0 text-white/40 hover:text-white transition-colors"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m2 5h2a2 2 0 012 2v3" /></svg>
                                    </button>
                                </div>
                                <div class="bg-resin-charcoal rounded-lg p-3 flex items-center justify-between gap-3">
                                    <code class="text-[11px] text-white/80 font-mono truncate">npm install && npm run build</code>
                                    <button
                                        aria-label="Copy build command"
                                        onclick={() => copyToClipboard("npm install && npm run build")}
                                        class="shrink-0 text-white/40 hover:text-white transition-colors"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m2 5h2a2 2 0 012 2v3" /></svg>
                                    </button>
                                </div>
                            </div>
                            <p class="text-xs text-resin-earth/70 leading-relaxed">
                                2. Open <code class="bg-resin-forest/5 px-1 py-0.5 rounded font-mono text-[11px]">chrome://extensions/</code>, turn on <b>Developer Mode</b>, click <b>Load Unpacked</b>, and select the <code class="bg-resin-forest/5 px-1 py-0.5 rounded font-mono text-[11px]">/dist</code> folder. Then sign in from the popup.
                            </p>
                            <div class="rounded-lg bg-resin-amber/5 border border-resin-amber/20 p-4">
                                <p class="text-[11px] text-resin-earth/70 mb-3 leading-relaxed">
                                    Google Sign-In: add the extension's redirect URI to your Supabase <b>Allowed Redirect URLs</b>.
                                </p>
                                <div class="flex items-center gap-2">
                                    <div class="flex-1 bg-white/50 border border-resin-amber/10 rounded-lg px-3 py-2 text-[10px] font-mono text-resin-charcoal truncate">{redirectUri}</div>
                                    <button
                                        onclick={() => copyToClipboard(redirectUri)}
                                        class="px-3 py-2 bg-resin-amber text-resin-charcoal rounded-lg text-xs font-bold hover:bg-resin-amber/90 transition-all"
                                    >Copy</button>
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Footer -->
            <div
                class="px-8 py-6 border-t border-resin-forest/10 bg-white/40 flex justify-end"
            >
                <button
                    onclick={close}
                    class="px-8 py-3 bg-resin-charcoal text-white rounded-lg font-bold text-sm hover:bg-resin-forest transition-all shadow-lg active:scale-95"
                >
                    Done
                </button>
            </div>
        </div>
    </div>
{/if}
