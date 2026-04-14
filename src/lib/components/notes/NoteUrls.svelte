<script lang="ts">
    import { fade, slide } from "svelte/transition";
    import { ExternalLink, X } from "lucide-svelte";

    let { urls = [], onAddUrl, onRemoveUrl } = $props<{
        urls: string[];
        onAddUrl: (url: string) => void;
        onRemoveUrl: (url: string) => void;
    }>();

    let showInput = $state(false);
    let newUrl = $state("");
    let error = $state("");

    function validateAndAdd() {
        error = "";
        const trimmed = newUrl.trim();

        if (!trimmed) {
            error = "URL cannot be empty";
            return;
        }

        // Simple URL validation
        try {
            new URL(trimmed);
        } catch {
            error = "Invalid URL format";
            return;
        }

        if (urls.includes(trimmed)) {
            error = "This URL is already saved";
            return;
        }

        onAddUrl(trimmed);
        newUrl = "";
        showInput = false;
    }

    function getHostname(url: string): string {
        try {
            return new URL(url).hostname.replace("www.", "");
        } catch {
            return url;
        }
    }
</script>

<div class="space-y-2">
    <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-resin-earth/60 uppercase">Bookmarked URLs</label>
        {#if urls.length > 0}
            <span class="text-xs font-semibold text-resin-forest">{urls.length} link{urls.length !== 1 ? "s" : ""}</span>
        {/if}
    </div>

    {#if urls.length > 0}
        <div class="space-y-1.5" in:fade>
            {#each urls as url (url)}
                <div class="flex items-center gap-2 px-2 py-1.5 rounded bg-resin-forest/5 border border-resin-forest/10 group hover:border-resin-forest/30 transition-colors" in:slide>
                    <ExternalLink size={12} class="text-resin-forest/60 flex-shrink-0" />
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xs text-resin-forest hover:text-resin-forest/80 truncate"
                        title={url}
                    >
                        {getHostname(url)}
                    </a>
                    <button
                        onclick={() => onRemoveUrl(url)}
                        class="ml-auto flex-shrink-0 p-0.5 rounded text-resin-earth/30 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove URL"
                    >
                        <X size={14} />
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    {#if showInput}
        <div class="space-y-1.5" in:slide>
            <input
                type="text"
                placeholder="https://example.com"
                bind:value={newUrl}
                onkeydown={(e) => {
                    if (e.key === "Enter") validateAndAdd();
                    if (e.key === "Escape") {
                        showInput = false;
                        error = "";
                    };
                }}
                class="w-full px-2 py-1.5 text-xs rounded border border-resin-forest/20 bg-white focus:outline-none focus:border-resin-forest/50"
                autofocus
            />
            {#if error}
                <p class="text-[10px] text-red-600">{error}</p>
            {/if}
            <div class="flex gap-1.5">
                <button
                    onclick={validateAndAdd}
                    class="flex-1 text-[11px] font-bold px-2 py-1 rounded bg-resin-forest text-white hover:bg-resin-forest/90 transition-colors"
                >
                    Add
                </button>
                <button
                    onclick={() => {
                        showInput = false;
                        error = "";
                    }}
                    class="flex-1 text-[11px] font-bold px-2 py-1 rounded border border-resin-earth/20 text-resin-earth/60 hover:bg-resin-earth/5 transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    {:else}
        <button
            onclick={() => (showInput = true)}
            class="w-full text-xs font-semibold text-resin-forest/70 px-2 py-1.5 rounded border border-dashed border-resin-forest/30 hover:border-resin-forest/50 hover:bg-resin-forest/5 transition-colors"
        >
            + Add URL
        </button>
    {/if}
</div>
