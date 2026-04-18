<script lang="ts">
    import { onMount } from 'svelte';
    import { createAsciiRenderer } from 'landing-effects';
    import { C } from './landingTheme';

    let fossilTrexCanvas!: HTMLCanvasElement;
    let fossilAmmoniteCanvas!: HTMLCanvasElement;

    const platforms = ['iOS', 'Web', 'Chrome', 'Calendar'];

    onMount(() => {
        const amberFn = (lum: number) =>
            `rgba(${Math.round(145+lum*110)},${Math.round(85+lum*75)},${Math.round(28+lum*38)},${0.22+lum*0.78})`;
        const forestFn = (lum: number) =>
            `rgba(${Math.round(50+lum*70)},${Math.round(88+lum*95)},${Math.round(44+lum*55)},${0.2+lum*0.8})`;

        function lazily(canvas: HTMLCanvasElement, init: () => (() => void)): () => void {
            let cleanup: (() => void) | undefined;
            const obs = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) { cleanup = init(); obs.disconnect(); }
            }, { rootMargin: '120px' });
            obs.observe(canvas);
            return () => { obs.disconnect(); cleanup?.(); };
        }

        const cleanups = [
            lazily(fossilTrexCanvas, () => createAsciiRenderer({
                canvas: fossilTrexCanvas,
                imageSrc: '/images/fossils/fossil_trex_flat.png',
                chars: ' ·:+',
                fontSize: 10,
                brightnessBoost: 1.8,
                parallaxStrength: 5,
                colorFn: amberFn,
            })),
            lazily(fossilAmmoniteCanvas, () => createAsciiRenderer({
                canvas: fossilAmmoniteCanvas,
                imageSrc: '/images/fossils/fossil_ammonite.png',
                chars: ' ·:+',
                fontSize: 9,
                brightnessBoost: 2.0,
                parallaxStrength: 6,
                colorFn: forestFn,
            })),
        ];

        return () => cleanups.forEach(c => c());
    });
</script>

<section class="py-24 px-6" style="background:{C.bg};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-12">
            <span class="section-label" style="color:{C.earth};">02 / features</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>

        <div class="grid md:grid-cols-2 gap-px"
             style="border:1px solid rgba(46,42,38,0.12); border-radius:6px; overflow:hidden; background:rgba(46,42,38,0.12);">

            <!-- 1: Blocking — lead card, dark -->
            <div class="relative overflow-hidden p-8" style="background:{C.forestDark};">
                <canvas bind:this={fossilTrexCanvas}
                    class="absolute pointer-events-none"
                    style="bottom:-20px; right:-20px; width:160px; height:160px; opacity:0.08;"
                    aria-hidden="true"></canvas>

                <svg class="mb-5" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="rgba(232,191,138,0.5)" stroke-width="1">
                        <animate attributeName="r" values="13;15;13" dur="3s" repeatCount="indefinite"
                                 calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                        <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite"
                                 calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                    </circle>
                    <rect x="4" y="4" width="24" height="24" rx="4" fill="{C.amberLight}" opacity="0.12" />
                    <path d="M 16,7 L 24,10 L 24,17 C 24,21 20,24 16,25 C 12,24 8,21 8,17 L 8,10 Z"
                          fill="{C.amberLight}" opacity="0.8" />
                </svg>

                <h3 class="feature-h3" style="color:rgba(245,239,231,0.95);">Real blocking. No override.</h3>
                <p class="feature-p" style="color:rgba(245,239,231,0.55);">
                    FamilyControls API locks apps at the OS level — not a timer, not a browser filter. Instagram disappears. No workaround exists.
                </p>
                <div class="mono mt-6 text-xs" style="color:rgba(245,239,231,0.3);">iOS · macOS · chrome ext</div>
            </div>

            <!-- 2: Notes -->
            <div class="relative overflow-hidden p-8" style="background:{C.bg};">
                <canvas bind:this={fossilAmmoniteCanvas}
                    class="absolute pointer-events-none"
                    style="top:-20px; right:-20px; width:180px; height:180px; opacity:0.12;"
                    aria-hidden="true"></canvas>

                <svg class="icon-float mb-5" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"
                     style="animation-delay:0s;">
                    <rect x="4" y="4" width="24" height="24" rx="4" fill="{C.amber}" opacity="0.12">
                        <animate attributeName="opacity" values="0.12;0.2;0.12" dur="3s" repeatCount="indefinite" />
                    </rect>
                    <rect x="8" y="10" width="16" height="2" rx="1" fill="{C.amber}" />
                    <rect x="8" y="15" width="12" height="2" rx="1" fill="{C.amber}" opacity="0.6" />
                    <rect x="8" y="20" width="14" height="2" rx="1" fill="{C.amber}" opacity="0.4" />
                </svg>

                <h3 class="feature-h3" style="color:{C.charcoal};">Capture anything.</h3>
                <p class="feature-p" style="color:{C.earth};">
                    Free-form, no structure required. Stream of consciousness, fragments, panic notes. One tap to turn any note into a plan.
                </p>
                <div class="mono mt-6 text-xs" style="color:{C.earthLight};">rich text · mind map · boards</div>
            </div>

            <!-- 3: AI Planning -->
            <div class="relative p-8" style="background:{C.bgSecondary};">
                <svg class="icon-float mb-5" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true"
                     style="animation-delay:0.4s;">
                    <circle cx="16" cy="16" r="12" fill="{C.forest}" opacity="0.12">
                        <animate attributeName="r" values="12;13;12" dur="2.5s" repeatCount="indefinite"
                                 calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                    </circle>
                    <circle cx="16" cy="16" r="6" fill="{C.forest}" opacity="0.5" />
                    <circle cx="16" cy="16" r="2.5" fill="{C.forest}" />
                </svg>

                <h3 class="feature-h3" style="color:{C.charcoal};">Plan in 10 seconds.</h3>
                <p class="feature-p" style="color:{C.earth};">
                    On-device AI reads your note and generates a step-by-step plan with time estimates. No cloud, no API key, no waiting.
                </p>

                <div class="box mono mt-6 px-3 py-3"
                     style="background:rgba(46,42,38,0.04); font-size:13px; color:{C.earth};">
                    <div style="color:{C.forest};">&gt; activating note…</div>
                    <div style="opacity:0.6; margin-top:2px;">→ 3 tasks generated</div>
                    <div style="opacity:0.6;">→ scheduled 9:00–10:15am</div>
                    <div style="color:{C.amber}; margin-top:2px; display:flex; align-items:center; gap:4px;">
                        ✓ plan ready (8.2s)
                        <svg width="6" height="12" viewBox="0 0 6 12" aria-hidden="true">
                            <rect width="2" height="12" x="2" fill="{C.amber}" rx="1">
                                <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
                            </rect>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- 4: Ecosystem -->
            <div class="relative p-8" style="background:{C.bg};">
                <svg class="mb-5" viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
                    <circle cx="16" cy="16" r="10" fill="{C.amber}" opacity="0.1" />
                    <circle cx="16" cy="16" r="10" fill="none" stroke="{C.amber}" stroke-width="1" opacity="0.4" />
                    <circle r="2" fill="{C.amber}">
                        <animateMotion dur="4s" repeatCount="indefinite">
                            <mpath href="#orbit-path" />
                        </animateMotion>
                    </circle>
                    <path id="orbit-path" d="M 26,16 A 10,10 0 1 1 25.9999,15.9" fill="none" />
                </svg>

                <h3 class="feature-h3" style="color:{C.charcoal};">Every surface.</h3>
                <p class="feature-p" style="color:{C.earth};">
                    iOS app, web dashboard, Chrome extension. Plans sync to Google Calendar. Notes sync across devices.
                </p>

                <div class="flex gap-2 mt-6 flex-wrap">
                    {#each platforms as platform, i}
                        <span class="box mono"
                              style="font-size:12px; padding:4px 8px; color:{C.charcoal}; background:rgba(255,255,255,0.6);">
                            {platform}
                            <svg style="display:inline; margin-left:3px; vertical-align:-1px;"
                                 viewBox="0 0 10 10" width="8" height="8" aria-hidden="true">
                                <path d="M 1,5 L 4,8 L 9,2" fill="none" stroke="{C.forest}" stroke-width="1.5"
                                      stroke-linecap="round" stroke-linejoin="round"
                                      stroke-dasharray="15" stroke-dashoffset="15">
                                    <animate attributeName="stroke-dashoffset" from="15" to="0"
                                             dur="0.4s" begin="{i * 0.15 + 0.6}s" fill="freeze"
                                             calcMode="spline" keySplines="0.16 1 0.3 1" />
                                </path>
                            </svg>
                        </span>
                    {/each}
                </div>
            </div>

        </div>
    </div>
</section>

<style>
    .feature-h3 { font-size: 22px; font-weight: 800; margin-bottom: 10px; line-height: 1.2; }
    .feature-p  { font-size: 14px; line-height: 1.7; max-width: 320px; }

    .mono { font-family: 'JetBrains Mono', monospace; }

    .box { border: 1px solid rgba(46,42,38,0.12); border-radius: 6px; }

    .section-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px; font-weight: 500;
        letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.45;
    }

    .icon-float {
        animation: icon-float 3s ease-in-out infinite;
        transform-origin: center;
        display: block;
    }
    @keyframes icon-float {
        0%, 100% { transform: translateY(0); }
        50%       { transform: translateY(-4px); }
    }
</style>
