<script lang="ts">
    import { enhance } from "$app/forms";
    import { Settings, Shield, ToggleRight, Trash2, RefreshCw } from "lucide-svelte";
    import type { PageData, ActionData } from './$types';

    // Data from +page.server.ts load function
    let { data }: { data: PageData } = $props();
    let form: ActionData = $state(null);

    // Local state
    let extensionEnabled = $state<boolean>(data?.extensionEnabled ?? false);
    let blockingEnabled = $state<boolean>(data?.blockingEnabled ?? false);
    let autoBlockSessions = $state<boolean>(data?.autoBlockSessions ?? false);
    let notificationsEnabled = $state<boolean>(data?.notificationsEnabled ?? true);
    let blockedDomains = $state<string[]>(data?.blockedDomains ?? []);
    let newDomain = $state("");
    let saving = $state(false);
    let message = $state("");

    function addDomain() {
        if (!newDomain.trim()) return;
        const domain = newDomain.trim().toLowerCase();

        if (blockedDomains.includes(domain)) {
            message = "Domain already in list";
            return;
        }

        blockedDomains = [...blockedDomains, domain];
        newDomain = "";
        message = `Added ${domain}`;
        setTimeout(() => (message = ""), 2000);
    }

    function removeDomain(domain: string) {
        blockedDomains = blockedDomains.filter((d) => d !== domain);
        message = `Removed ${domain}`;
        setTimeout(() => (message = ""), 2000);
    }
</script>

<svelte:head>
    <title>Extension Settings | Resin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-resin-earth/5 via-white to-resin-forest/5">
    <div class="max-w-2xl mx-auto px-4 py-12">
        <!-- Header -->
        <div class="mb-10">
            <h1 class="text-4xl font-bold text-resin-charcoal flex items-center gap-3 mb-2">
                <Settings size={32} class="text-resin-forest" />
                Extension Settings
            </h1>
            <p class="text-lg text-resin-earth/70">Manage your browser extension and blocking rules</p>
        </div>

        {#if message}
            <div class="mb-6 p-3 rounded-lg {message.startsWith('✓') ? 'bg-resin-forest/10 text-resin-forest' : 'bg-amber-100 text-amber-700'} text-sm font-semibold">
                {message}
            </div>
        {/if}

        <!-- Extension Control -->
        <div class="glass-card rounded-2xl p-8 mb-6 border border-white/20 shadow-premium">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-bold text-resin-charcoal flex items-center gap-2">
                        <Shield size={20} class="text-resin-forest" />
                        Extension Status
                    </h2>
                    <p class="text-sm text-resin-earth/60 mt-1">Control whether the extension is active</p>
                </div>
                <button
                    onclick={() => { extensionEnabled = !extensionEnabled; }}
                    class="w-14 h-8 rounded-full transition-colors {extensionEnabled ? 'bg-resin-forest' : 'bg-resin-earth/20'} flex items-center {extensionEnabled ? 'justify-end' : 'justify-start'} p-1"
                >
                    <div class="w-6 h-6 rounded-full bg-white shadow-md"></div>
                </button>
            </div>
            <p class="text-sm text-resin-earth/70 mb-4">
                {extensionEnabled
                    ? "✓ Extension is active and monitoring your browsing"
                    : "Extension is disabled. Click the toggle to enable it."}
            </p>
        </div>

        <!-- Blocking Settings -->
        <div class="glass-card rounded-2xl p-8 mb-6 border border-white/20 shadow-premium space-y-6">
            <h2 class="text-xl font-bold text-resin-charcoal">Blocking Rules</h2>

            <!-- Blocking Enabled -->
            <div class="flex items-center justify-between p-4 bg-resin-forest/5 rounded-lg border border-resin-forest/10">
                <div>
                    <p class="font-semibold text-resin-charcoal">Block distracting sites</p>
                    <p class="text-xs text-resin-earth/60 mt-1">Prevent access during focus sessions</p>
                </div>
                <button
                    onclick={() => { blockingEnabled = !blockingEnabled; }}
                    class="w-12 h-7 rounded-full transition-colors {blockingEnabled ? 'bg-resin-forest' : 'bg-resin-earth/20'} flex items-center {blockingEnabled ? 'justify-end' : 'justify-start'} p-0.5"
                >
                    <div class="w-5 h-5 rounded-full bg-white shadow-md"></div>
                </button>
            </div>

            <!-- Auto-block -->
            <div class="flex items-center justify-between p-4 bg-resin-amber/5 rounded-lg border border-resin-amber/10">
                <div>
                    <p class="font-semibold text-resin-charcoal">Auto-block on sessions</p>
                    <p class="text-xs text-resin-earth/60 mt-1">Automatically block sites when focus sessions start</p>
                </div>
                <button
                    onclick={() => { autoBlockSessions = !autoBlockSessions; }}
                    class="w-12 h-7 rounded-full transition-colors {autoBlockSessions ? 'bg-resin-forest' : 'bg-resin-earth/20'} flex items-center {autoBlockSessions ? 'justify-end' : 'justify-start'} p-0.5"
                >
                    <div class="w-5 h-5 rounded-full bg-white shadow-md"></div>
                </button>
            </div>

            <!-- Notifications -->
            <div class="flex items-center justify-between p-4 bg-white/50 rounded-lg border border-resin-earth/10">
                <div>
                    <p class="font-semibold text-resin-charcoal">Notifications</p>
                    <p class="text-xs text-resin-earth/60 mt-1">Receive alerts when accessing blocked sites</p>
                </div>
                <button
                    onclick={() => { notificationsEnabled = !notificationsEnabled; }}
                    class="w-12 h-7 rounded-full transition-colors {notificationsEnabled ? 'bg-resin-forest' : 'bg-resin-earth/20'} flex items-center {notificationsEnabled ? 'justify-end' : 'justify-start'} p-0.5"
                >
                    <div class="w-5 h-5 rounded-full bg-white shadow-md"></div>
                </button>
            </div>
        </div>

        <!-- Blocked Domains -->
        <div class="glass-card rounded-2xl p-8 mb-6 border border-white/20 shadow-premium">
            <h2 class="text-xl font-bold text-resin-charcoal mb-4">Custom Blocked Domains</h2>
            <p class="text-sm text-resin-earth/60 mb-4">Add specific websites to block during focus sessions</p>

            <div class="space-y-3">
                {#each blockedDomains as domain (domain)}
                    <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                        <code class="text-sm font-mono text-red-600">{domain}</code>
                        <button
                            onclick={() => removeDomain(domain)}
                            class="p-1 hover:bg-red-100 rounded transition-colors text-red-500"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                {/each}

                <!-- Add Domain Input -->
                <div class="flex gap-2">
                    <input
                        type="text"
                        placeholder="e.g., youtube.com, twitter.com"
                        bind:value={newDomain}
                        onkeydown={(e) => {
                            if (e.key === "Enter") addDomain();
                        }}
                        class="flex-1 px-4 py-2.5 text-sm rounded-lg border border-resin-earth/20 focus:outline-none focus:border-resin-forest/50"
                    />
                    <button
                        onclick={addDomain}
                        class="px-4 py-2.5 bg-resin-forest text-white rounded-lg font-semibold hover:bg-resin-forest/90 transition-colors text-sm"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>

        <!-- Save Button Form -->
        <form
            method="POST"
            action="?/saveSettings"
            use:enhance={() => {
                saving = true;
                return async ({ result }) => {
                    if (result.type === 'success' && result.data) {
                        message = (result.data as any).message || '✓ Settings saved!';
                    } else if (result.type === 'failure' && result.data) {
                        message = (result.data as any).error || 'Error saving settings';
                    }
                    saving = false;
                    setTimeout(() => (message = ""), 5000);
                };
            }}
        >
            <!-- Hidden inputs for form data -->
            <input type="hidden" name="extensionEnabled" value={extensionEnabled ? 'on' : 'off'} />
            <input type="hidden" name="blockingEnabled" value={blockingEnabled ? 'on' : 'off'} />
            <input type="hidden" name="autoBlockSessions" value={autoBlockSessions ? 'on' : 'off'} />
            <input type="hidden" name="notificationsEnabled" value={notificationsEnabled ? 'on' : 'off'} />
            <input type="hidden" name="blockedDomains" value={JSON.stringify(blockedDomains)} />

            <div class="flex gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    class="flex-1 px-6 py-3 bg-resin-forest text-white rounded-lg font-bold hover:bg-resin-forest/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16} />
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>
        </form>

        <!-- Info Box -->
        <div class="mt-10 p-6 bg-resin-forest/5 rounded-lg border border-resin-forest/10">
            <h3 class="font-bold text-resin-charcoal mb-2">About the Extension</h3>
            <ul class="text-sm text-resin-earth/70 space-y-1">
                <li>✓ Blocks distracting websites during focus sessions</li>
                <li>✓ Tracks time spent on sites for productivity insights</li>
                <li>✓ Syncs settings across all your devices</li>
                <li>✓ Works locally - respects your privacy</li>
            </ul>
        </div>
    </div>
</div>
