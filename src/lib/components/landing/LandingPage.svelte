<script lang="ts">
    import { Apple, ArrowRight } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { createAsciiRenderer } from 'landing-effects';
    import { C } from './landingTheme';
    import OnboardingCarousel from './OnboardingCarousel.svelte';
    import FeaturesGrid from './FeaturesGrid.svelte';
    import QuickFocusSection from './QuickFocusSection.svelte';

    let pineHeroCanvas: HTMLCanvasElement;
    let visible = $state(false);
    let openFaq = $state<number | null>(null);

    const faqs = [
        {
            q: 'What is real blocking?',
            a: "On iOS/macOS, Resin uses Apple's Screen Time API (FamilyControls) — not a timer or browser filter. During a focus session, blocked apps are inaccessible at the OS level."
        },
        {
            q: 'Where does the AI run?',
            a: 'On iOS, planning can run fully on-device. On web/Chrome, Resin can schedule plans via a secure server pipeline (so you can activate from your laptop without local models).'
        },
        {
            q: 'What does the Chrome extension do?',
            a: 'During active focus sessions, the extension blocks distracting domains and replaces them with a calm focus page that keeps you pointed at the current task.'
        },
        {
            q: 'Do I need the iOS app?',
            a: 'No. The web app handles notes, sessions, and calendar sync. iOS is required for OS-level app blocking.'
        }
    ];

    onMount(() => {
        visible = true;

        const cleanupHero = createAsciiRenderer({
            canvas: pineHeroCanvas,
            imageSrc: '/images/heropine_noback.png',
            chars: ' ·:+#',
            fontSize: 8,
            brightnessBoost: 2.2,
            parallaxStrength: 8,
            colorFn: (lum) => {
                if (lum < 0.02) return 'rgba(0,0,0,0)';
                const r = Math.round(44 + lum * 60);
                const g = Math.round(82 + lum * 50);
                const b = Math.round(38 + lum * 20);
                return `rgba(${r},${g},${b},${Math.min(1, lum * 1.5 + 0.2)})`;
            }
        });

        return () => cleanupHero();
    });
</script>

<main style="background:{C.bg}; font-family:'Nunito', system-ui, sans-serif;">
    <!-- HERO -->
    <section class="px-6" style="padding-top:96px; padding-bottom:56px;">
        <div class="max-w-6xl mx-auto">
            <div class="grid lg:grid-cols-2 gap-14 items-center">
                <div class="fade-up {visible ? 'in' : ''}">
                    <div class="tag inline-flex items-center gap-2 mb-6" style="background:rgba(200,136,74,0.1); color:{C.amberDark};">
                        Notes · Planning · Focus
                    </div>

                    <h1 class="font-serif font-bold tracking-tight mb-6" style="font-size: clamp(44px, 6vw, 74px); line-height: 1.02; color:{C.charcoal};">
                        Write it down.<br />
                        <span style="background: linear-gradient(135deg, {C.amber} 0%, {C.amberDark} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                            Actually do it.
                        </span>
                    </h1>

                    <p class="mb-8 leading-relaxed max-w-[520px]" style="font-size:18px; color:{C.earth}; line-height:1.75;">
                        Resin is a notes-first system that turns messy thoughts into a concrete plan — then makes distraction non-optional.
                        The web app is the pro dashboard; iOS brings OS-level app blocking.
                    </p>

                    <div class="flex flex-col sm:flex-row items-start gap-4 mb-8">
                        <a href="/login?next=/"
                           class="flex items-center gap-2 transition-all hover:-translate-y-0.5 relative overflow-hidden"
                           style="background:{C.charcoal}; color:white; padding:15px 22px; border-radius:10px; font-size:15px; font-weight:800; box-shadow:0 10px 28px -10px rgba(46,42,38,0.55);">
                            <span class="absolute inset-0 pointer-events-none" aria-hidden="true"
                                  style="background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.16) 50%,transparent 60%); animation:shimmer 3s ease-in-out infinite;"></span>
                            <span class="relative z-10">Open web app</span>
                            <ArrowRight class="w-4 h-4 relative z-10" />
                        </a>

                        <a href="https://testflight.apple.com/join/yV53qa1z"
                           target="_blank" rel="noopener noreferrer"
                           class="flex items-center gap-2 transition-all hover:-translate-y-0.5"
                           style="background:rgba(200,136,74,0.10); color:{C.charcoal}; padding:15px 22px; border-radius:10px; font-size:15px; font-weight:800; border:1px solid rgba(200,136,74,0.25);">
                            <Apple class="w-4 h-4" style="color:{C.amber};" />
                            iOS · Free
                        </a>

                        <a href="/extension"
                           class="flex items-center gap-2 transition-opacity hover:opacity-70"
                           style="padding:15px 0; font-size:14px; font-weight:700; color:{C.earth};">
                            Chrome extension <ArrowRight class="w-4 h-4" style="color:{C.earthLight};" />
                        </a>
                    </div>

                    <div class="mono" style="font-size:12px; color:{C.earthLight};">
                        <span style="color:{C.amber};">$</span> plan.generate
                        <span style="opacity:0.6;">// iOS: on-device · web: cloud</span>
                    </div>
                </div>

                <div class="relative hidden lg:block" style="height:74vh; border-left:1px solid rgba(46,42,38,0.10);">
                    <canvas bind:this={pineHeroCanvas}
                            class="absolute inset-0 w-full h-full"
                            style="pointer-events:none;"
                            aria-hidden="true"></canvas>
                    <div class="absolute top-6 right-6">
                        <span class="mono" style="font-size:11px; color:{C.earthLight};">// ascii_renderer</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <OnboardingCarousel />
    <FeaturesGrid />
    <QuickFocusSection />

    <!-- FAQ -->
    <section class="py-24 px-6" style="background:{C.bgSecondary};">
        <div class="max-w-3xl mx-auto">
            <div class="flex items-center gap-4 mb-12">
                <span class="section-label" style="color:{C.earth};">// faq</span>
                <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
            </div>
            <div class="flex flex-col" style="border:1px solid rgba(46,42,38,0.12); border-radius:6px; overflow:hidden;">
                {#each faqs as faq, i}
                    <div style="border-bottom:{i < faqs.length-1 ? '1px solid rgba(46,42,38,0.1)' : 'none'};">
                        <button class="w-full text-left px-6 py-5 flex items-center justify-between transition-colors hover:bg-black/[0.02]"
                                onclick={() => openFaq = openFaq === i ? null : i}
                                style="background:{C.bgSecondary};">
                            <span style="font-size:14px; font-weight:700; color:{C.charcoal};">{faq.q}</span>
                            <svg viewBox="0 0 16 16" width="16" height="16" style="flex-shrink:0;" aria-hidden="true">
                                <path d="M 4,6 L 8,10 L 12,6" fill="none" stroke="{C.earthLight}" stroke-width="1.5"
                                      stroke-linecap="round" stroke-linejoin="round"
                                      style="transform-origin:8px 8px; transform:rotate({openFaq === i ? 180 : 0}deg); transition:transform 0.25s ease;" />
                            </svg>
                        </button>
                        {#if openFaq === i}
                            <div class="px-6 pb-5" style="background:{C.bg}; border-top:1px solid rgba(46,42,38,0.07);">
                                <p style="font-size:14px; color:{C.earth}; line-height:1.75; padding-top:16px;">{faq.a}</p>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- CTA -->
    <section class="py-24 px-6" style="background:{C.charcoal};">
        <div class="max-w-4xl mx-auto text-center">
            <h2 style="font-size:clamp(34px,4.2vw,54px); font-weight:900; letter-spacing:-0.03em; color:rgba(245,239,231,0.96); line-height:1.05; margin-bottom:18px;">
                Start with a note.<br />End with done.
            </h2>
            <p style="font-size:15px; color:rgba(245,239,231,0.62); max-width:560px; margin:0 auto 34px; line-height:1.75;">
                Use the web app as your daily workspace. Add iOS and the extension when you want blocking everywhere.
            </p>

            <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
                <a href="/login?next=/"
                   class="flex items-center gap-2 transition-all hover:-translate-y-0.5 relative overflow-hidden"
                   style="background:{C.amber}; color:#2E2A26; padding:15px 28px; border-radius:10px; font-size:15px; font-weight:900; box-shadow:0 10px 28px -10px rgba(200,136,74,0.55);">
                    <span class="absolute inset-0 pointer-events-none" aria-hidden="true"
                          style="background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.16) 50%,transparent 60%); animation:shimmer 3s ease-in-out infinite;"></span>
                    <span class="relative z-10">Open web app</span>
                    <ArrowRight class="w-4 h-4 relative z-10" />
                </a>
                <a href="https://testflight.apple.com/join/yV53qa1z"
                   target="_blank" rel="noopener noreferrer"
                   class="flex items-center gap-2 transition-all hover:-translate-y-0.5"
                   style="background:rgba(245,239,231,0.08); color:rgba(245,239,231,0.82); padding:15px 28px; border-radius:10px; font-size:15px; font-weight:800; border:1px solid rgba(245,239,231,0.12);">
                    <Apple class="w-4 h-4" />
                    <span>Download iOS</span>
                </a>
            </div>
        </div>
    </section>
</main>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .mono { font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; }
    .tag {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px; font-weight: 700;
        letter-spacing: 0.08em; text-transform: uppercase;
        padding: 4px 10px; border-radius: 6px;
    }
    .section-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px; font-weight: 500;
        letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.45;
    }
    .fade-up { opacity: 0; transform: translateY(18px); transition: opacity 0.6s ease, transform 0.6s ease; }
    .fade-up.in { opacity: 1; transform: translateY(0); }

    @keyframes shimmer {
        0%        { transform: translateX(-100%); }
        60%, 100% { transform: translateX(200%); }
    }
    @keyframes blink-cursor {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
    }
</style>

