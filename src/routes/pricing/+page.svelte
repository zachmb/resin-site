<script lang="ts">
    const freeFeatures = [
        'AI plans from your brain dumps (3 per day)',
        'Real app blocking on iOS (Screen Time)',
        'Notes, mind maps, and calendar on iPhone',
        'Forest, streaks, and rewards',
        'Shareable plan cards',
    ];

    const proFeatures = [
        'Web app + Chrome extension sync',
        'Browser website blocking during focus sessions',
        'Start on iPhone, follow through on laptop',
        'Unlimited AI plans — no daily limit',
        'Smarter AI scheduling across calendar + history',
        'Full focus insights and history',
    ];
</script>

<svelte:head>
    <title>Pricing | Resin</title>
    <meta
        name="description"
        content="Resin is free on iPhone. Resin Pro unlocks web app and Chrome extension sync, browser blocking, and unlimited AI plans."
    />
</svelte:head>

<main class="flex-grow max-w-4xl mx-auto px-6 py-20 w-full font-sans">
    <div class="text-center mb-14">
        <h1 class="text-4xl font-bold font-serif text-resin-charcoal mb-4">
            Simple pricing
        </h1>
        <p class="text-resin-earth/80 text-lg max-w-xl mx-auto">
            Start free on iPhone. Upgrade when you want Resin to follow you onto your laptop.
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
                or $29.99 / year ($2.50/mo) · 7-day free trial
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
                Get Resin on iOS
            </a>
            <p class="text-xs text-resin-earth/50 text-center mt-3">
                Upgrade from inside the iOS app — Account → Resin Pro.
            </p>
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
