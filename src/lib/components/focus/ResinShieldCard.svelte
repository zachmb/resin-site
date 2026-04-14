<script lang="ts">
    import { goto } from '$app/navigation';
    import { Settings } from 'lucide-svelte';

    let { extensionInstalled = false } = $props<{
        extensionInstalled?: boolean;
    }>();
</script>

{#if extensionInstalled}
    <!-- Extension Installed - Management Card -->
    <div
        class="glass-card rounded-[2.5rem] p-8 border border-resin-forest/20 shadow-premium relative overflow-hidden group bg-gradient-to-br from-resin-forest/5 to-transparent"
    >
        <!-- Background Decoration -->
        <div
            class="absolute -right-16 -top-16 w-48 h-48 bg-resin-forest/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"
        ></div>

        <div class="relative z-10">
            <div class="flex items-start justify-between mb-8">
                <div class="flex items-center gap-4">
                    <div
                        class="w-14 h-14 rounded-2xl bg-resin-forest text-white flex items-center justify-center shadow-xl group-hover:rotate-3 transition-transform"
                    >
                        <Settings size={28} />
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-resin-charcoal mb-1">
                            Extension Connected
                        </h3>
                        <div
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-resin-forest/10 border border-resin-forest/20 text-[10px] font-bold text-resin-forest uppercase tracking-wider"
                        >
                            ✓ Active
                        </div>
                    </div>
                </div>
            </div>

            <p class="text-sm text-resin-earth/70 leading-relaxed mb-8 max-w-lg">
                Your Resin Web Shield is active and protecting your focus sessions across all browser tabs.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="space-y-2">
                    <div
                        class="flex items-center gap-2 text-resin-charcoal font-bold text-sm"
                    >
                        <span>🔒</span> Blocking Active
                    </div>
                    <p class="text-xs text-resin-earth/60 leading-relaxed">
                        Focus sessions are being enforced.
                    </p>
                </div>
                <div class="space-y-2">
                    <div
                        class="flex items-center gap-2 text-resin-charcoal font-bold text-sm"
                    >
                        <span>🔄</span> Synced
                    </div>
                    <p class="text-xs text-resin-earth/60 leading-relaxed">
                        Your sessions sync automatically.
                    </p>
                </div>
                <div class="space-y-2">
                    <div
                        class="flex items-center gap-2 text-resin-charcoal font-bold text-sm"
                    >
                        <span>📊</span> Analytics
                    </div>
                    <p class="text-xs text-resin-earth/60 leading-relaxed">
                        Track your blocking history.
                    </p>
                </div>
            </div>

            <button
                onclick={() => goto('/extension-settings')}
                class="w-full sm:w-auto px-10 py-4 bg-resin-forest text-white rounded-[1.25rem] font-bold text-sm hover:bg-resin-charcoal transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
            >
                <span>Manage Settings</span>
                <Settings size={16} />
            </button>
        </div>
    </div>
{:else}
    <!-- Extension Not Installed - Activation Card -->
    <div
        class="glass-card rounded-[2.5rem] p-8 border border-resin-amber/20 shadow-premium relative overflow-hidden group bg-gradient-to-br from-resin-amber/5 to-transparent"
    >
        <!-- Background Decoration -->
        <div
            class="absolute -right-16 -top-16 w-48 h-48 bg-resin-amber/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"
        ></div>

        <div class="relative z-10">
            <div class="flex items-start justify-between mb-8">
                <div class="flex items-center gap-4">
                    <div
                        class="w-14 h-14 rounded-2xl bg-resin-charcoal text-white flex items-center justify-center shadow-xl group-hover:rotate-3 transition-transform"
                    >
                        <img
                            src="/resinext-logo.png"
                            alt="Resin Web Shield"
                            class="w-8 h-8 object-contain"
                        />
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-resin-charcoal mb-1">
                            Activate the Resin Web Shield
                        </h3>
                        <div
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-[10px] font-bold text-resin-amber uppercase tracking-wider"
                        >
                            Power Integration
                        </div>
                    </div>
                </div>
            </div>

            <p class="text-sm text-resin-earth/70 leading-relaxed mb-8 max-w-lg">
                Take your focus sessions to the next level. Stop being redirected by
                YouTube, Reddit, and distractors by syncing your sessions with our
                Chrome Extension.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div class="space-y-2">
                    <div
                        class="flex items-center gap-2 text-resin-charcoal font-bold text-sm"
                    >
                        <span>🔒</span> Total Blocking
                    </div>
                    <p class="text-xs text-resin-earth/60 leading-relaxed">
                        Enforce your focus across all browser tabs.
                    </p>
                </div>
                <div class="space-y-2">
                    <div
                        class="flex items-center gap-2 text-resin-charcoal font-bold text-sm"
                    >
                        <span>🔄</span> Instant Sync
                    </div>
                    <p class="text-xs text-resin-earth/60 leading-relaxed">
                        Automatically activates when you start a session.
                    </p>
                </div>
                <div class="space-y-2">
                    <div
                        class="flex items-center gap-2 text-resin-charcoal font-bold text-sm"
                    >
                        <span>📊</span> Focus Analytics
                    </div>
                    <p class="text-xs text-resin-earth/60 leading-relaxed">
                        Track and review your blocked attempts.
                    </p>
                </div>
            </div>

            <button
                onclick={() => goto('/extension')}
                class="w-full sm:w-auto px-10 py-4 bg-resin-charcoal text-white rounded-[1.25rem] font-bold text-sm hover:bg-resin-forest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
            >
                <span>Learn More</span>
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
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                </svg>
            </button>
        </div>
    </div>
{/if}
