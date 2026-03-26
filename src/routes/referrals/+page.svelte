<script lang="ts">
    import { Share2, Copy, Users, Gift, Zap } from "lucide-svelte";
    import type { PageData } from './$types';

    // Data from +page.server.ts load function — no more direct Supabase calls
    let { data }: { data: PageData } = $props();

    let copied = $state(false);

    function copyCode() {
        navigator.clipboard.writeText(data.referralCode);
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }

    function getShareText(): string {
        return `Join me on Resin! Use code ${data.referralCode} to get free premium. Let's focus together! 🌲`;
    }

    function shareVia(platform: string) {
        const text = getShareText();
        const urls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
            copy: () => copyCode(),
            facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encodeURIComponent(text)}`
        };

        if (platform === "copy") {
            copyCode();
        } else if (urls[platform as keyof typeof urls]) {
            window.open(urls[platform as keyof typeof urls] as string, "_blank");
        }
    }
</script>

<svelte:head>
    <title>Referrals & Free Tier | Resin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-resin-forest/5 via-white to-resin-earth/5">
    <div class="max-w-3xl mx-auto px-4 py-12">
        <!-- Header -->
        <div class="mb-10">
            <h1 class="text-4xl font-bold text-resin-charcoal flex items-center gap-3 mb-2">
                <Gift size={32} class="text-resin-forest" />
                Earn Free Premium
            </h1>
            <p class="text-lg text-resin-earth/70">
                {data.isFree
                    ? "Invite 3 friends and get 1 month of free premium!"
                    : "Thanks for being a premium member!"}
            </p>
        </div>

        <!-- Free Tier Status -->
        {#if data.isFree}
            <div class="glass-card rounded-2xl p-8 mb-8 border-2 border-resin-forest/30 bg-gradient-to-br from-resin-forest/5 to-transparent shadow-premium">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-2xl font-bold text-resin-charcoal">Your Free Tier Progress</h2>
                    <span class="text-3xl font-bold text-resin-forest">{data.referralCount}/3</span>
                </div>

                <div class="space-y-4">
                    {#each [1, 2, 3] as i}
                        <div class="flex items-center gap-3">
                            <div
                                class="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold {i <= data.referralCount
                                    ? 'bg-resin-forest'
                                    : 'bg-resin-earth/20'}"
                            >
                                {i}
                            </div>
                            <span
                                class="flex-1 text-sm font-medium {i <= data.referralCount
                                    ? 'text-resin-charcoal'
                                    : 'text-resin-earth/50'}"
                            >
                                {i <= data.referralCount ? "✓ Friend referred" : `Refer friend #${i}`}
                            </span>
                            {#if i <= data.referralCount}
                                <span class="text-xs font-bold text-resin-forest">Completed</span>
                            {/if}
                        </div>
                    {/each}
                </div>

                {#if data.referralCount >= 3}
                    <div class="mt-6 p-4 rounded-lg bg-resin-forest/10 border border-resin-forest/30">
                        <p class="text-sm font-bold text-resin-forest">🎉 You've unlocked free premium! Your access has been activated.</p>
                    </div>
                {/if}
            </div>
        {/if}

        <!-- Referral Code -->
        <div class="glass-card rounded-2xl p-8 mb-8 border border-white/20 shadow-premium">
            <h2 class="text-xl font-bold text-resin-charcoal mb-4 flex items-center gap-2">
                <Share2 size={20} class="text-resin-amber" />
                Your Referral Code
            </h2>

            <div class="flex items-center gap-3 p-4 bg-resin-amber/10 rounded-lg border-2 border-dashed border-resin-amber/30">
                <code class="flex-1 text-lg font-mono font-bold text-resin-charcoal">{data.referralCode}</code>
                <button
                    onclick={copyCode}
                    class="px-4 py-2 rounded-lg {copied
                        ? 'bg-resin-forest text-white'
                        : 'bg-resin-amber text-resin-charcoal hover:bg-resin-amber/90'} transition-colors font-bold text-sm flex items-center gap-1"
                >
                    <Copy size={14} />
                    {copied ? "Copied!" : "Copy"}
                </button>
            </div>

            <p class="text-xs text-resin-earth/60 mt-3">
                Share this code with friends. When they use it to sign up, you'll both get rewards!
            </p>
        </div>

        <!-- Share Options -->
        <div class="glass-card rounded-2xl p-8 mb-8 border border-white/20 shadow-premium">
            <h2 class="text-xl font-bold text-resin-charcoal mb-4">Share Your Referral Code</h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                    onclick={() => shareVia("twitter")}
                    class="p-4 rounded-lg bg-gradient-to-br from-sky-100 to-blue-100 hover:from-sky-200 hover:to-blue-200 transition-colors font-semibold text-blue-600 flex items-center justify-center gap-2"
                >
                    𝕏 Twitter
                </button>
                <button
                    onclick={() => shareVia("copy")}
                    class="p-4 rounded-lg bg-gradient-to-br from-resin-forest/10 to-resin-forest/5 hover:from-resin-forest/20 hover:to-resin-forest/10 transition-colors font-semibold text-resin-forest flex items-center justify-center gap-2"
                >
                    <Copy size={16} /> Copy Link
                </button>
                <button
                    onclick={() => shareVia("facebook")}
                    class="p-4 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 transition-colors font-semibold text-blue-700 flex items-center justify-center gap-2"
                >
                    f Facebook
                </button>
            </div>

            <p class="text-xs text-resin-earth/60 mt-3">Or share this text:</p>
            <p class="text-sm text-resin-charcoal mt-2 p-3 bg-white/50 rounded-lg italic">"{getShareText()}"</p>
        </div>

        <!-- Referral History -->
        {#if data.referrals.length > 0}
            <div class="glass-card rounded-2xl p-8 border border-white/20 shadow-premium">
                <h2 class="text-xl font-bold text-resin-charcoal mb-4 flex items-center gap-2">
                    <Users size={20} class="text-resin-forest" />
                    Your Referrals
                </h2>

                <div class="space-y-2">
                    {#each data.referrals as referral}
                        <div class="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-resin-forest/10">
                            <div>
                                <p class="text-sm font-semibold text-resin-charcoal">{referral.profiles?.email || "User"}</p>
                                <p class="text-xs text-resin-earth/60">
                                    Referred on {new Date(referral.referral_date).toLocaleDateString()}
                                </p>
                            </div>
                            <span
                                class="text-xs font-bold px-2.5 py-1 rounded-full {referral.reward_applied
                                    ? 'bg-resin-forest/10 text-resin-forest'
                                    : 'bg-amber-100 text-amber-700'}"
                            >
                                {referral.reward_applied ? "✓ Rewarded" : "Pending"}
                            </span>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- How It Works -->
        <div class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="text-center">
                <div class="w-12 h-12 rounded-full bg-resin-forest/10 flex items-center justify-center mx-auto mb-3">
                    <span class="text-xl font-bold text-resin-forest">1</span>
                </div>
                <h3 class="font-bold text-resin-charcoal mb-1">Share Your Code</h3>
                <p class="text-sm text-resin-earth/70">Give friends your unique referral code</p>
            </div>
            <div class="text-center">
                <div class="w-12 h-12 rounded-full bg-resin-amber/10 flex items-center justify-center mx-auto mb-3">
                    <span class="text-xl font-bold text-resin-amber">2</span>
                </div>
                <h3 class="font-bold text-resin-charcoal mb-1">They Sign Up</h3>
                <p class="text-sm text-resin-earth/70">They use your code when creating their account</p>
            </div>
            <div class="text-center">
                <div class="w-12 h-12 rounded-full bg-resin-forest/10 flex items-center justify-center mx-auto mb-3">
                    <span class="text-xl font-bold text-resin-forest">3</span>
                </div>
                <h3 class="font-bold text-resin-charcoal mb-1">Both Get Premium</h3>
                <p class="text-sm text-resin-earth/70">You each earn free premium time</p>
            </div>
        </div>
    </div>
</div>
