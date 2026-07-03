<script lang="ts">
    const freeFeatures = [
        'AI plans from your brain dumps (3 per day)',
        'Real app blocking on iOS (Screen Time)',
        'Chrome extension website blocking',
        'Notes, mind maps, and calendar',
        'Forest, streaks, and rewards',
        'Web app at noteresin.com',
    ];

    const proFeatures = [
        'Unlimited AI plans — no daily limit',
        'Everything in Free, everywhere you work',
        'Hardened no-exit focus sessions',
        'Full focus insights and history',
        'Support an independent app',
    ];
</script>

<svelte:head>
    <title>Pricing | Resin</title>
    <meta
        name="description"
        content="Resin is free to start. Resin Pro unlocks unlimited AI plans for $4.99/month or $29.99/year with a 7-day free trial."
    />
</svelte:head>

<main class="flex-grow max-w-4xl mx-auto px-6 py-20 w-full font-sans">
    <div class="text-center mb-14">
        <h1 class="text-4xl font-bold font-serif text-resin-charcoal mb-4">
            Simple pricing
        </h1>
        <p class="text-resin-earth/80 text-lg max-w-xl mx-auto">
            Start free — no card needed. Upgrade when you want unlimited plans.
        </p>
    </div>

    <div class="grid md:grid-cols-2 gap-6 mb-12">
        <!-- Free -->
        <div class="glass-card rounded-xl p-8 border border-resin-forest/15">
            <h2 class="text-2xl font-semibold font-serif text-resin-charcoal mb-1">Free</h2>
            <p class="text-3xl font-bold text-resin-charcoal mb-6">
                $0 <span class="text-sm font-normal text-resin-earth/60">forever</span>
            </p>
            <ul class="space-y-3 mb-8">
                {#each freeFeatures as feature}
                    <li class="flex items-start gap-2 text-resin-earth/90 text-sm">
                        <span class="text-resin-forest mt-0.5">✓</span>
                        {feature}
                    </li>
                {/each}
            </ul>
            <a
                href="https://testflight.apple.com/join/yV53qa1z"
                target="_blank"
                rel="noopener noreferrer"
                class="block text-center w-full px-6 py-3 rounded-lg border border-resin-forest/25 text-resin-charcoal font-semibold hover:bg-resin-bg transition-colors"
            >
                Get the iOS app
            </a>
        </div>

        <!-- Pro -->
        <div class="glass-card rounded-xl p-8 border-2 border-resin-amber/40 relative">
            <span
                class="absolute -top-3 left-8 px-3 py-1 rounded-full bg-resin-amber text-resin-charcoal text-xs font-bold tracking-wide"
            >
                RESIN PRO
            </span>
            <h2 class="text-2xl font-semibold font-serif text-resin-charcoal mb-1">Pro</h2>
            <p class="text-3xl font-bold text-resin-charcoal mb-1">
                $4.99 <span class="text-sm font-normal text-resin-earth/60">/ month</span>
            </p>
            <p class="text-sm text-resin-earth/60 mb-6">
                or $29.99 / year · 7-day free trial
            </p>
            <ul class="space-y-3 mb-8">
                {#each proFeatures as feature}
                    <li class="flex items-start gap-2 text-resin-earth/90 text-sm">
                        <span class="text-resin-amber mt-0.5">✓</span>
                        {feature}
                    </li>
                {/each}
            </ul>
            <a
                href="https://testflight.apple.com/join/yV53qa1z"
                target="_blank"
                rel="noopener noreferrer"
                class="block text-center w-full px-6 py-3 rounded-lg bg-resin-charcoal text-white font-semibold hover:bg-resin-forest transition-colors"
            >
                Upgrade in the iOS app
            </a>
        </div>
    </div>

    <div class="text-center text-sm text-resin-earth/60 space-y-2 max-w-xl mx-auto">
        <p>
            Resin Pro is a subscription purchased inside the iOS app through the
            App Store. It auto-renews until canceled in your App Store settings.
        </p>
        <p>
            Questions? <a href="/support" class="text-resin-forest underline">Contact support</a>.
        </p>
    </div>
</main>
