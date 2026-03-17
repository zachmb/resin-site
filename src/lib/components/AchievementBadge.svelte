<script lang="ts">
    import * as Icons from 'lucide-svelte';

    let {
        achievementId = '',
        name = '',
        description = '',
        icon = 'star',
        unlockedAt = null as string | null,
        isNew = false
    }: {
        achievementId: string;
        name: string;
        description: string;
        icon: string;
        unlockedAt: string | null;
        isNew: boolean;
    } = $props();

    const isUnlocked = $derived(unlockedAt !== null);

    // Map icon strings to lucide components
    const iconComponent = (iconName: string) => {
        const IconMap: Record<string, any> = {
            sprout: Icons.Sprout,
            flame: Icons.Flame,
            trophy: Icons.Trophy,
            crown: Icons.Crown,
            gem: Icons.Gem,
            diamond: Icons.Diamond,
            leaf: Icons.Leaf,
            tree: Icons.Trees,
            sparkles: Icons.Sparkles,
            sun: Icons.Sun,
            zap: Icons.Zap,
            star: Icons.Star,
            lock: Icons.Lock
        };
        return IconMap[iconName] || Icons.Star;
    };

    const formatDate = (isoString: string | null) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: '2-digit'
        });
    };

    const IconComp = $derived(iconComponent(icon));
    const LockIcon = Icons.Lock;
</script>

<div class="flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-300" title={description}>
    {#if isUnlocked}
        <div
            class={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                isNew ? 'ring-2 ring-resin-amber ring-offset-2 ring-offset-white' : ''
            }`}
            style="background: linear-gradient(135deg, rgba(232, 154, 60, 0.3), rgba(232, 154, 60, 0.1));"
        >
            <svelte:component this={IconComp} size={32} class="text-resin-amber" />
        </div>
        <p class="text-xs font-bold text-resin-charcoal text-center line-clamp-2">{name}</p>
        <p class="text-[10px] text-resin-forest/70 font-medium">{formatDate(unlockedAt)}</p>
    {:else}
        <div
            class="w-16 h-16 rounded-full flex items-center justify-center"
            style="background: rgba(0, 0, 0, 0.06);"
        >
            <div class="relative">
                <svelte:component this={IconComp} size={32} class="text-resin-earth opacity-20" />
                <div class="absolute inset-0 flex items-center justify-center">
                    <svelte:component this={LockIcon} size={16} class="text-resin-earth opacity-30" />
                </div>
            </div>
        </div>
        <p class="text-xs font-bold text-resin-charcoal opacity-40 text-center line-clamp-2">{name}</p>
        <p class="text-[10px] text-resin-earth/30 font-medium">Locked</p>
    {/if}
</div>
