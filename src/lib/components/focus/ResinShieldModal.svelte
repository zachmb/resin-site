<script lang="ts">
    import { fade, slide } from "svelte/transition";

    let { isOpen = $bindable(false) } = $props<{ isOpen: boolean }>();

    function close() {
        isOpen = false;
    }

    function copyToClipboard(text: string) {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    }

    const redirectUri =
        "https://your-supabase-project.supabase.co/auth/v1/callback"; // Placeholder or dynamic if possible
</script>

{#if isOpen}
    <div
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-resin-charcoal/60 backdrop-blur-sm overflow-y-auto"
        transition:fade={{ duration: 200 }}
        onclick={close}
    >
        <div
            class="glass-card w-full max-w-2xl rounded-xl border border-white/30 shadow-2xl overflow-hidden flex flex-col my-8"
            onclick={(e) => e.stopPropagation()}
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
                            Install Resin Web Shield
                        </h2>
                        <p
                            class="text-xs text-resin-earth/60 font-medium uppercase tracking-wider"
                        >
                            Sync your browser focus
                        </p>
                    </div>
                </div>
                <button
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
            <div class="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <!-- Step 1 -->
                <section class="space-y-4">
                    <div class="flex items-center gap-3">
                        <span
                            class="w-6 h-6 rounded-full bg-resin-amber text-white text-xs font-bold flex items-center justify-center"
                            >1</span
                        >
                        <h3 class="font-bold text-resin-charcoal">
                            Download Shield
                        </h3>
                    </div>
                    <div class="pl-9">
                        <p
                            class="text-sm text-resin-earth/80 leading-relaxed mb-3"
                        >
                            Clone the <code
                                class="bg-resin-forest/5 px-1.5 py-0.5 rounded text-resin-forest font-semibold"
                                >resinext</code
                            > repository from GitHub to your local machine.
                        </p>
                        <div
                            class="bg-resin-charcoal rounded-xl p-4 flex items-center justify-between gap-4 group"
                        >
                            <code class="text-xs text-white/80 font-mono"
                                >git clone
                                https://github.com/zachmb/resinext.git</code
                            >
                            <button
                                onclick={() =>
                                    copyToClipboard(
                                        "git clone https://github.com/zachmb/resinext.git",
                                    )}
                                class="text-white/40 hover:text-white transition-colors p-1"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Step 2 -->
                <section class="space-y-4">
                    <div class="flex items-center gap-3">
                        <span
                            class="w-6 h-6 rounded-full bg-resin-amber text-white text-xs font-bold flex items-center justify-center"
                            >2</span
                        >
                        <h3 class="font-bold text-resin-charcoal">
                            Prepare Build
                        </h3>
                    </div>
                    <div class="pl-9 space-y-3">
                        <p class="text-sm text-resin-earth/80 leading-relaxed">
                            Open your terminal inside the folder and run the
                            build process:
                        </p>
                        <div
                            class="bg-resin-charcoal rounded-xl p-4 flex items-center justify-between gap-4"
                        >
                            <code class="text-xs text-white/80 font-mono"
                                >npm install && npm run build</code
                            >
                            <button
                                onclick={() =>
                                    copyToClipboard(
                                        "npm install && npm run build",
                                    )}
                                class="text-white/40 hover:text-white transition-colors p-1"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Step 3 -->
                <section class="space-y-4">
                    <div class="flex items-center gap-3">
                        <span
                            class="w-6 h-6 rounded-full bg-resin-amber text-white text-xs font-bold flex items-center justify-center"
                            >3</span
                        >
                        <h3 class="font-bold text-resin-charcoal">
                            Load Extension
                        </h3>
                    </div>
                    <div class="pl-9 space-y-3">
                        <p class="text-sm text-resin-earth/80">
                            1. Open <code
                                class="bg-resin-forest/5 px-1 py-0.5 rounded font-mono text-xs"
                                >chrome://extensions/</code
                            >
                            in Chrome.<br />
                            2. Turn on <b>Developer Mode</b> in the top right.<br
                            />
                            3. Click <b>Load Unpacked</b> and select the
                            <code
                                class="bg-resin-forest/5 px-1 py-0.5 rounded font-mono text-xs"
                                >/dist</code
                            > folder.
                        </p>
                    </div>
                </section>

                <!-- Step 4 -->
                <section class="space-y-4">
                    <div class="flex items-center gap-3">
                        <span
                            class="w-6 h-6 rounded-full bg-resin-amber text-white text-xs font-bold flex items-center justify-center"
                            >4</span
                        >
                        <h3 class="font-bold text-resin-charcoal">
                            Connect & Activate
                        </h3>
                    </div>
                    <div class="pl-9">
                        <p class="text-sm text-resin-earth/80 leading-relaxed">
                            Open the extension popup from your toolbar, sign in
                            with your Resin account, and your focus sessions
                            will sync automatically.
                        </p>
                    </div>
                </section>

                <!-- Identity Setup -->
                <div
                    class="bg-resin-amber/5 border border-resin-amber/20 rounded-lg p-6 mt-4"
                >
                    <h4
                        class="text-sm font-bold text-resin-charcoal mb-2 flex items-center gap-2"
                    >
                        <svg
                            class="w-4 h-4 text-resin-amber"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        Identity Setup (Supabase)
                    </h4>
                    <p class="text-xs text-resin-earth/70 mb-4 leading-relaxed">
                        If you are using Google Sign-In, ensure you add the
                        Extension's Redirect URI (found in the extension
                        settings) to your Supabase <b>'Allowed Redirect URLs'</b
                        > to enable seamless syncing.
                    </p>
                    <div class="flex items-center gap-3">
                        <div
                            class="flex-1 bg-white/50 border border-resin-amber/10 rounded-lg px-3 py-2 text-[10px] font-mono text-resin-charcoal truncate"
                        >
                            {redirectUri}
                        </div>
                        <button
                            onclick={() => copyToClipboard(redirectUri)}
                            class="px-3 py-2 bg-resin-amber text-white rounded-lg text-xs font-bold hover:bg-resin-amber/90 transition-all uppercase tracking-wide"
                        >
                            Copy URI
                        </button>
                    </div>
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
                    Got it, I'm ready
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(43, 70, 52, 0.1);
        border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: rgba(43, 70, 52, 0.2);
    }
</style>
