<script lang="ts">
    import { Apple, ArrowRight } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { createAsciiRenderer, createPixelReveal } from 'landing-effects';
    import { C } from './landingTheme';
    import OnboardingCarousel from './OnboardingCarousel.svelte';
    import FeaturesGrid from './FeaturesGrid.svelte';
    import QuickFocusSection from './QuickFocusSection.svelte';

    const PINE_PATH = `
        M 155 4
        L 163 22 L 178 14 L 171 35 L 191 24 L 180 48
        L 200 38 L 215 28 L 203 56 L 224 44 L 210 70
        L 232 58 L 248 46 L 233 78 L 252 66 L 236 95
        L 256 82 L 268 68 L 252 104 L 270 92 L 252 122
        L 269 110 L 279 94 L 262 132 L 278 120 L 257 152
        L 273 141 L 280 125 L 263 162 L 275 153 L 252 182
        L 265 172 L 269 158 L 248 192 L 258 185 L 232 214
        L 242 208 L 244 194 L 218 228 L 226 222 L 196 250
        L 200 245 L 198 232 L 173 268
        L 185 268 L 188 310 L 172 310 L 172 390 L 138 390 L 138 310 L 122 310 L 125 268
        L 137 268
        L 112 232 L 110 245 L 114 250 L 84 222 L 92 228
        L 66 194 L 68 208 L 78 214 L 52 185 L 62 192
        L 41 158 L 45 172 L 58 182 L 35 153 L 47 162
        L 30 125 L 37 141 L 53 152 L 32 120 L 48 132
        L 31 94 L 41 110 L 58 122 L 40 92 L 58 104
        L 42 68 L 54 82 L 74 95 L 58 66 L 77 78
        L 62 46 L 78 58 L 100 70 L 86 44 L 107 56
        L 95 28 L 110 38 L 130 48 L 119 24 L 139 35
        L 132 14 L 147 22
        Z
    `.trim();

    let pineHeroCanvas: HTMLCanvasElement;
    let pineSectionCanvas: HTMLCanvasElement;
    let pixelRevealCanvas!: HTMLCanvasElement;
    let pineSvgPath: SVGPathElement;

    let pineOutlineStarted = $state(false);
    let visible = $state(false);
    let openFaq = $state<number | null>(null);

    const faqs = [
        { q: "What is real app blocking?", a: "Resin uses Apple's Screen Time API (FamilyControls) — not a timer or browser filter. Apps are blocked at the OS level across iPhone, iPad, and Mac. No override, no workaround." },
        { q: "How does AI planning work?", a: "Write anything — a messy note, a goal, a panic-typed thought. Tap Activate. On-device AI generates a step-by-step plan with time estimates in under 10 seconds. No cloud, no API keys." },
        { q: "Is my data private?", a: "AI runs entirely on your device. Nothing leaves your phone. No content reading, no data selling, no model training. Export or delete everything anytime." },
        { q: "Do I need iOS to use Resin?", a: "The web app handles notes, planning, and calendar sync. OS-level app blocking requires iOS. Website blocking via Chrome extension works on Mac too." },
        { q: "How is it free if it uses AI?", a: "On-device models (Gemma, Qwen) run on your iPhone's neural engine. No cloud compute = no per-request cost. Core app is free forever, no usage caps." },
    ];

    onMount(() => {
        visible = true;

        if (pineSvgPath) {
            const len = pineSvgPath.getTotalLength();
            pineSvgPath.style.strokeDasharray = String(len);
            pineSvgPath.style.strokeDashoffset = String(len);
            requestAnimationFrame(() => { pineOutlineStarted = true; });
        }

        function lazily(canvas: HTMLCanvasElement, init: () => (() => void)): () => void {
            let cleanup: (() => void) | undefined;
            const obs = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) { cleanup = init(); obs.disconnect(); }
            }, { rootMargin: '120px' });
            obs.observe(canvas);
            return () => { obs.disconnect(); cleanup?.(); };
        }

        const amberFn = (lum: number) =>
            `rgba(${Math.round(145+lum*110)},${Math.round(85+lum*75)},${Math.round(28+lum*38)},${0.22+lum*0.78})`;

        const cleanupHero = createAsciiRenderer({
            canvas: pineHeroCanvas,
            imageSrc: '/images/pine_tree.svg',
            chars: ' ·:+#',
            fontSize: 8,
            brightnessBoost: 2.8,
            parallaxStrength: 8,
            colorFn: (lum) => {
                const r = Math.round(44 + lum * 140);
                const g = Math.round(80 + lum * 60);
                const b = Math.round(40 + lum * 20);
                return `rgba(${r},${g},${b},${0.15 + lum * 0.85})`;
            },
        });

        const cleanups = [
            lazily(pineSectionCanvas, () => createAsciiRenderer({
                canvas: pineSectionCanvas,
                imageSrc: '/images/pine_tree.svg',
                chars: ' ·:+',
                fontSize: 9,
                brightnessBoost: 2.2,
                parallaxStrength: 5,
                colorFn: amberFn,
            })),
            lazily(pixelRevealCanvas, () => createPixelReveal({
                canvas: pixelRevealCanvas,
                imageSrc: '/images/fossils/fossil_ammonite.png',
                blockSize: 14,
                pixelsPerFrame: 8,
                glitchRegion: 0.18,
                delay: 200,
            })),
        ];

        return () => {
            cleanupHero();
            cleanups.forEach(c => c());
        };
    });
</script>

<main style="background:{C.bg}; font-family:'Nunito', system-ui, sans-serif; overflow-x:hidden;">


<!-- ══════════════════════════════════════════════════════
     NAV
══════════════════════════════════════════════════════ -->
<nav class="fixed top-0 left-0 right-0 z-50 box"
     style="background:rgba(245,239,231,0.88); backdrop-filter:blur(16px);
            border-radius:0; border-left:none; border-right:none; border-top:none;">
    <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
            <svg viewBox="0 0 20 24" width="16" height="20" aria-hidden="true">
                <path fill="{C.forest}" d="M10,1 L12,5 L14,3 L13,7 L15,5 L14,9 L16,7 L15,11
                                           L17,9 L15,13 L13,17 L11,17 L11,22 L9,22 L9,17 L7,17
                                           L5,13 L3,9 L5,11 L4,7 L6,9 L5,5 L7,7 L6,3 L8,5 Z">
                    <animate attributeName="opacity" values="0.7;1;0.7" dur="4s" repeatCount="indefinite"
                             calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                </path>
            </svg>
            <span class="font-bold tracking-tight" style="font-size:17px; color:{C.charcoal};">resin</span>
            <span class="tag" style="background:rgba(200,136,74,0.1); color:{C.amberDark};">beta</span>
        </div>
        <div class="flex items-center gap-3">
            <a href="/login" class="mono text-xs font-medium transition-opacity hover:opacity-70" style="color:{C.earth};">sign in</a>
            <a href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"
               class="flex items-center gap-1.5 transition-opacity hover:opacity-80"
               style="background:{C.charcoal}; color:white; padding:7px 16px; border-radius:6px; font-size:13px; font-weight:700;">
                <Apple class="w-3.5 h-3.5" /> Get the app
            </a>
        </div>
    </div>
</nav>


<!-- ══════════════════════════════════════════════════════
     HERO
══════════════════════════════════════════════════════ -->
<section class="relative min-h-screen grid-bg flex flex-col justify-center pt-14 overflow-hidden">

    <div class="absolute top-20 left-6 section-label" style="color:{C.earth};">01 / intro</div>
    <div class="absolute top-20 right-6 section-label" style="color:{C.earth};">resin v1.0</div>

    <div class="max-w-6xl mx-auto px-6 w-full">
        <div class="grid lg:grid-cols-[1fr_1fr] gap-0 min-h-[80vh] items-center">

            <!-- LEFT: copy -->
            <div class="py-16 lg:py-0 pr-0 lg:pr-16 fade-up" class:in={visible}>

                <div class="tag mb-8 inline-block" style="background:rgba(77,102,82,0.1); color:{C.forestDark};">
                    focus · notes · planning
                </div>

                <h1 style="font-size:clamp(46px,5.5vw,72px); font-weight:800; line-height:1.0;
                            letter-spacing:-0.025em; color:{C.charcoal}; margin-bottom:24px;">
                    Block the noise.<br/>
                    Build the plan.<br/>
                    <span style="color:{C.amber};">Do the work.</span>
                </h1>

                <p class="mono" style="font-size:14px; color:{C.earth}; line-height:1.8; max-width:400px; margin-bottom:36px;">
                    One tap locks every distracting app — OS-level, no override.<br/>
                    Write a note and AI builds the plan.<br/>
                    Your phone holds you to it.
                </p>

                <div class="grid grid-cols-3 gap-2 mb-10" style="max-width:380px;">
                    {#each [['1 tap','quick focus'],['0','overrides'],['100%','on-device']] as [val, label]}
                        <div class="box py-3 px-3 text-center" style="background:rgba(255,255,255,0.5); position:relative; overflow:hidden;">
                            <svg class="absolute top-0 left-0 pointer-events-none" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
                                <path d="M 0,0 L 20,0" stroke="{C.amber}" stroke-width="1.5" opacity="0.3" fill="none">
                                    <animate attributeName="opacity" values="0.1;0.4;0.1" dur="3s" repeatCount="indefinite" />
                                </path>
                                <path d="M 0,0 L 0,20" stroke="{C.amber}" stroke-width="1.5" opacity="0.3" fill="none">
                                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="3s" repeatCount="indefinite" />
                                </path>
                            </svg>
                            <div class="mono font-semibold" style="font-size:16px; color:{C.charcoal};">{val}</div>
                            <div class="mono" style="font-size:9px; color:{C.earth}; margin-top:2px;">{label}</div>
                        </div>
                    {/each}
                </div>

                <div class="flex flex-wrap gap-3">
                    <a href="https://testflight.apple.com/join/yV53qa1z"
                       target="_blank" rel="noopener noreferrer"
                       class="flex items-center gap-2 transition-all hover:-translate-y-px"
                       style="background:{C.charcoal}; color:white; padding:13px 22px; border-radius:6px;
                              font-size:14px; font-weight:700; box-shadow:0 4px 16px -4px rgba(46,42,38,0.4);">
                        <Apple class="w-4 h-4" /> iOS · Free
                    </a>
                    <a href="/login?next=/"
                       class="flex items-center gap-2 box transition-all hover:-translate-y-px"
                       style="background:rgba(255,255,255,0.6); color:{C.charcoal}; padding:13px 22px; font-size:14px; font-weight:600;">
                        Web app <ArrowRight class="w-4 h-4" style="color:{C.amber};" />
                    </a>
                </div>

            </div>

            <!-- RIGHT: ASCII canvas + SVG pine outline -->
            <div class="relative hidden lg:block" style="height:85vh; border-left:1px solid rgba(46,42,38,0.1);">

                <canvas bind:this={pineHeroCanvas}
                    class="absolute inset-0 w-full h-full"
                    style="pointer-events:none;"
                    aria-hidden="true"></canvas>

                <svg class="absolute inset-0 w-full h-full pointer-events-none"
                     viewBox="0 0 310 400"
                     preserveAspectRatio="xMidYMid meet"
                     aria-hidden="true">
                    <defs>
                        <linearGradient id="pine-stroke-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%"   stop-color="{C.amberLight}" />
                            <stop offset="60%"  stop-color="{C.amber}" />
                            <stop offset="100%" stop-color="{C.forest}" />
                        </linearGradient>
                        <filter id="pine-glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <path bind:this={pineSvgPath} d={PINE_PATH}
                          class="pine-outline" class:drawing={pineOutlineStarted}
                          stroke="url(#pine-stroke-grad)" stroke-width="3"
                          filter="url(#pine-glow)" style="animation-duration:3.8s;" />
                    <path d={PINE_PATH} fill="none" stroke="url(#pine-stroke-grad)"
                          stroke-width="1" stroke-linejoin="round" stroke-linecap="round"
                          style="opacity:{pineOutlineStarted ? 0.45 : 0}; transition:opacity 0.4s 3.5s ease;" />
                </svg>

                <div class="absolute bottom-8 left-8 right-8 flex flex-col gap-2 pointer-events-none">
                    <div class="box flex items-center gap-3 px-4 py-3"
                         style="background:rgba(245,239,231,0.82); backdrop-filter:blur(8px); max-width:220px;">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="3" fill="{C.forest}">
                                <animate attributeName="r" values="3;4;3" dur="2s" repeatCount="indefinite"
                                         calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                                <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"
                                         calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                            </circle>
                        </svg>
                        <span class="mono" style="font-size:11px; color:{C.charcoal};">on-device · private</span>
                    </div>
                    <div class="box-amber flex items-center gap-3 px-4 py-3"
                         style="background:rgba(245,239,231,0.82); backdrop-filter:blur(8px); max-width:220px;">
                        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
                            <circle cx="4" cy="4" r="3" fill="{C.amber}">
                                <animate attributeName="r" values="3;4;3" dur="2.4s" repeatCount="indefinite"
                                         begin="0.8s" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                                <animate attributeName="opacity" values="1;0.4;1" dur="2.4s" repeatCount="indefinite"
                                         begin="0.8s" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
                            </circle>
                        </svg>
                        <span class="mono" style="font-size:11px; color:{C.charcoal};">plan in &lt;10 seconds</span>
                    </div>
                </div>

                <div class="absolute top-6 right-6">
                    <span class="mono" style="font-size:9px; color:{C.earthLight};">// ascii_renderer v1</span>
                </div>
            </div>

        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     TERMINAL STRIP
══════════════════════════════════════════════════════ -->
<div class="box relative overflow-hidden"
     style="background:{C.charcoal}; border-radius:0; border-left:none; border-right:none;">
    <div class="scan-line absolute inset-y-0 w-32 pointer-events-none"
         style="background:linear-gradient(90deg, transparent, rgba(200,136,74,0.08), transparent);"
         aria-hidden="true"></div>
    <div class="max-w-6xl mx-auto px-6 py-4 relative z-10">
        <div class="flex flex-wrap items-center gap-6 lg:gap-10 mono"
             style="font-size:12px; color:rgba(245,239,231,0.6);">
            <span><span style="color:#86b891;">$</span> focus.quick <span style="color:rgba(245,239,231,0.3);">// 1 tap · apps blocked instantly</span></span>
            <span class="hidden sm:inline" style="color:rgba(245,239,231,0.2);">|</span>
            <span><span style="color:{C.amber};">$</span> notes.capture <span style="color:rgba(245,239,231,0.3);">// no structure required</span></span>
            <span class="hidden sm:inline" style="color:rgba(245,239,231,0.2);">|</span>
            <span><span style="color:{C.amberLight};">$</span> plan.generate <span style="color:rgba(245,239,231,0.3);">// &lt;10s on-device</span></span>
            <span class="hidden lg:inline" style="color:rgba(245,239,231,0.2);">|</span>
            <span class="hidden lg:inline"><span style="color:{C.earthLight};">$</span> ai.model <span style="color:rgba(245,239,231,0.3);">// gemma · qwen · local</span></span>
        </div>
    </div>
</div>


<OnboardingCarousel />
<FeaturesGrid />
<QuickFocusSection />


<!-- ══════════════════════════════════════════════════════
     HOW IT WORKS
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6 grid-bg" style="background:{C.bgSecondary};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-16">
            <span class="section-label" style="color:{C.earth};">03 / how it works</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>

        <div class="grid lg:grid-cols-3 gap-px"
             style="border:1px solid rgba(46,42,38,0.12); border-radius:6px; overflow:hidden; background:rgba(46,42,38,0.12);">
            {#each [
                { n:'01', title:'Write', body:'Type whatever is in your head. No format, no templates. The messier the better.', accent: C.amber },
                { n:'02', title:'Activate', body:'Tap Activate. On-device AI reads the note and generates a concrete, time-blocked plan.', accent: C.forest },
                { n:'03', title:'Focus', body:'Session starts. Phone locks distracting apps. Calendar blocks time. Just work.', accent: C.amberDark },
            ] as step}
                <div class="p-8" style="background:{C.bgSecondary}; position:relative; overflow:hidden;">
                    <div class="absolute right-4 top-4 mono font-bold pointer-events-none select-none"
                         style="font-size:72px; line-height:1; color:rgba(46,42,38,0.04);">{step.n}</div>
                    {#if step.n !== '03'}
                        <div class="absolute right-0 top-1/2 hidden lg:block" style="transform:translateY(-50%);">
                            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                                <path d="M 2,12 L 20,12" fill="none" stroke="{C.grayLight}" stroke-width="1.5"
                                      stroke-dasharray="4 3" stroke-linecap="round">
                                    <animate attributeName="stroke-dashoffset" values="0;-14" dur="1.5s" repeatCount="indefinite" />
                                </path>
                                <path d="M 16,8 L 22,12 L 16,16" fill="none" stroke="{C.grayLight}" stroke-width="1.5"
                                      stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </div>
                    {/if}
                    <div class="mono font-bold mb-6" style="font-size:11px; color:{step.accent}; letter-spacing:0.1em;">{step.n}</div>
                    <div style="font-size:26px; font-weight:800; color:{C.charcoal}; margin-bottom:10px; line-height:1.1;">{step.title}</div>
                    <p style="font-size:14px; color:{C.earth}; line-height:1.7;">{step.body}</p>
                </div>
            {/each}
        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     WAVE DIVIDER
══════════════════════════════════════════════════════ -->
<div style="background:{C.bg}; position:relative; overflow:hidden; height:80px; margin-top:-1px;">
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none"
         style="position:absolute; inset:0; width:100%; height:100%;" aria-hidden="true">
        <defs>
            <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stop-color="{C.bgSecondary}" />
                <stop offset="50%"  stop-color="{C.bgTertiary}" />
                <stop offset="100%" stop-color="{C.bgSecondary}" />
            </linearGradient>
        </defs>
        <path fill="url(#wave-grad)">
            <animate attributeName="d" dur="8s" repeatCount="indefinite"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                values="M 0,40 C 240,10 480,70 720,40 C 960,10 1200,70 1440,40 L 1440,0 L 0,0 Z;
                        M 0,40 C 240,70 480,10 720,40 C 960,70 1200,10 1440,40 L 1440,0 L 0,0 Z;
                        M 0,40 C 240,10 480,70 720,40 C 960,10 1200,70 1440,40 L 1440,0 L 0,0 Z" />
        </path>
    </svg>
</div>


<!-- ══════════════════════════════════════════════════════
     PINE ASCII DIVIDER
══════════════════════════════════════════════════════ -->
<div class="relative overflow-hidden"
     style="height:280px; background:{C.bg};
            border-top:1px solid rgba(46,42,38,0.07);
            border-bottom:1px solid rgba(46,42,38,0.07);">
    <canvas bind:this={pineSectionCanvas}
        class="absolute inset-0 w-full h-full pointer-events-none"
        style="opacity:0.55;" aria-hidden="true"></canvas>
    <canvas bind:this={pixelRevealCanvas}
        width="200" height="200"
        class="absolute pointer-events-none"
        style="right:8%; top:50%; transform:translateY(-50%); opacity:0.22; border-radius:4px;"
        aria-hidden="true"></canvas>
    <div class="absolute inset-0 flex items-center justify-center">
        <div style="background:rgba(245,239,231,0.9); padding:20px 32px;
                    border:1px solid rgba(46,42,38,0.1); border-radius:4px; backdrop-filter:blur(4px);">
            <p class="mono" style="font-size:11px; color:{C.earth}; letter-spacing:0.08em;">
                // block apps in one tap. notes become plans. plans become sessions.
            </p>
        </div>
    </div>
</div>


<!-- ══════════════════════════════════════════════════════
     TESTIMONIALS
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bg};">
    <div class="max-w-6xl mx-auto">
        <div class="flex items-center gap-4 mb-12">
            <span class="section-label" style="color:{C.earth};">04 / from users</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>
        <div class="grid md:grid-cols-3 gap-4">
            {#each [
                { q:"Finally a notes app where writing something actually means it gets done.", name:"Jordan L.", role:"UX Researcher" },
                { q:"The blocking is actually real. Instagram just disappears. That's what I needed.", name:"Aisha K.", role:"Grad Student" },
                { q:"I have ADHD. This is the only system that works — AI breaks things down small enough I can start.", name:"Sofia E.", role:"UX Researcher" },
            ] as t}
                <div class="box p-6" style="background:rgba(255,255,255,0.5); position:relative; overflow:hidden;">
                    <svg class="absolute top-3 right-3 pointer-events-none" viewBox="0 0 24 20" width="24" height="20" aria-hidden="true">
                        <path d="M 3,3 C 3,3 0,9 3,12 C 5,14 8,13 8,10 C 8,7 5,7 5,10
                                 M 13,3 C 13,3 10,9 13,12 C 15,14 18,13 18,10 C 18,7 15,7 15,10"
                              fill="{C.amber}" opacity="0.15" />
                    </svg>
                    <p style="font-size:14px; color:{C.charcoal}; line-height:1.7; margin-bottom:16px;">"{t.q}"</p>
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center mono"
                             style="background:{C.bgTertiary}; font-size:10px; color:{C.earth}; font-weight:600;">
                            {t.name[0]}
                        </div>
                        <div>
                            <div class="mono" style="font-size:11px; font-weight:600; color:{C.charcoal};">{t.name}</div>
                            <div class="mono" style="font-size:10px; color:{C.earthLight};">{t.role}</div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     FAQ
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bgSecondary};">
    <div class="max-w-3xl mx-auto">
        <div class="flex items-center gap-4 mb-12">
            <span class="section-label" style="color:{C.earth};">05 / faq</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>
        <div class="flex flex-col"
             style="border:1px solid rgba(46,42,38,0.12); border-radius:6px; overflow:hidden;">
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


<!-- ══════════════════════════════════════════════════════
     CTA
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6 grid-bg relative overflow-hidden">
    <svg class="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" aria-hidden="true">
        <defs>
            <linearGradient id="cta-bg" x1="0%" y1="0%" x2="100%" y2="100%" class="cta-grad">
                <stop offset="0%"   stop-color="{C.charcoal}" />
                <stop offset="100%" stop-color="{C.forestDark}" />
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#cta-bg)" />
        <ellipse cx="70%" cy="30%" rx="40%" ry="40%" fill="{C.amber}" opacity="0.03">
            <animate attributeName="cx" values="70%;60%;70%" dur="12s" repeatCount="indefinite"
                     calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />
            <animate attributeName="opacity" values="0.03;0.06;0.03" dur="12s" repeatCount="indefinite" />
        </ellipse>
    </svg>
    <div class="max-w-3xl mx-auto text-center relative z-10">
        <div class="tag mb-8 inline-block" style="background:rgba(200,136,74,0.2); color:{C.amberLight};">free to start</div>
        <h2 style="font-size:clamp(36px,5vw,58px); font-weight:800; line-height:1.05;
                   letter-spacing:-0.02em; color:rgba(245,239,231,0.95); margin-bottom:16px;">
            Block the noise.<br/>
            <span style="color:{C.amber};">Do the work.</span>
        </h2>
        <p class="mono mb-12" style="font-size:13px; color:rgba(245,239,231,0.4); line-height:1.8;">
            iOS app · free forever · 1-tap focus · no credit card
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="https://testflight.apple.com/join/yV53qa1z"
               target="_blank" rel="noopener noreferrer"
               class="flex items-center gap-2 transition-all hover:-translate-y-0.5 relative overflow-hidden"
               style="background:{C.amber}; color:white; padding:15px 28px; border-radius:6px;
                      font-size:15px; font-weight:800; box-shadow:0 6px 24px -4px rgba(200,136,74,0.5);">
                <span class="absolute inset-0 pointer-events-none" aria-hidden="true"
                      style="background:linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%);
                             animation:shimmer 3s ease-in-out infinite;"></span>
                <Apple class="w-4 h-4 relative z-10" />
                <span class="relative z-10">Download iOS · Free</span>
            </a>
            <a href="/login?next=/"
               class="flex items-center gap-2 transition-all hover:-translate-y-0.5"
               style="background:rgba(245,239,231,0.08); color:rgba(245,239,231,0.7); padding:15px 28px;
                      border-radius:6px; font-size:15px; font-weight:600;
                      border:1px solid rgba(245,239,231,0.12);">
                Try web app <ArrowRight class="w-4 h-4" />
            </a>
        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     FOOTER
══════════════════════════════════════════════════════ -->
<footer style="background:{C.charcoal}; border-top:1px solid rgba(245,239,231,0.06);">
    <div class="max-w-6xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <svg viewBox="0 0 20 24" width="14" height="17" aria-hidden="true">
                <path fill="{C.forest}" opacity="0.6"
                      d="M10,1 L12,5 L14,3 L13,7 L15,5 L14,9 L16,7 L15,11
                         L17,9 L15,13 L13,17 L11,17 L11,22 L9,22 L9,17 L7,17
                         L5,13 L3,9 L5,11 L4,7 L6,9 L5,5 L7,7 L6,3 L8,5 Z" />
            </svg>
            <span class="font-bold" style="font-size:15px; color:rgba(245,239,231,0.7);">resin</span>
            <span class="mono" style="font-size:10px; color:rgba(245,239,231,0.25);">// write · plan · do</span>
        </div>
        <div class="flex flex-wrap gap-6 mono" style="font-size:11px; color:rgba(245,239,231,0.3);">
            <a href="/privacy" class="hover:opacity-70 transition-opacity">privacy</a>
            <a href="/terms" class="hover:opacity-70 transition-opacity">terms</a>
            <a href="mailto:hi@noteresin.com" class="hover:opacity-70 transition-opacity">contact</a>
        </div>
    </div>
</footer>

</main>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .mono { font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace; }
    .box       { border: 1px solid rgba(46,42,38,0.12); border-radius: 6px; }
    .box-amber { border: 1px solid rgba(200,136,74,0.3);  border-radius: 6px; }

    .fade-up    { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
    .fade-up.in { opacity: 1; transform: translateY(0); }

    .grid-bg {
        background-image:
            linear-gradient(rgba(46,42,38,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(46,42,38,0.04) 1px, transparent 1px);
        background-size: 32px 32px;
    }

    .tag {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px; font-weight: 600;
        letter-spacing: 0.08em; text-transform: uppercase;
        padding: 4px 10px; border-radius: 4px;
    }

    .section-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px; font-weight: 500;
        letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.45;
    }

    .pine-outline {
        fill: none; stroke-width: 2;
        stroke-linejoin: round; stroke-linecap: round;
        opacity: 0; transition: opacity 0.4s ease;
    }
    .pine-outline.drawing {
        opacity: 0.65;
        animation: pine-draw 3.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
    }
    @keyframes pine-draw { to { stroke-dashoffset: 0; } }

    .scan-line { animation: scan 4s linear infinite; }
    @keyframes scan {
        from { transform: translateX(-200px); }
        to   { transform: translateX(100vw); }
    }

    .cta-grad stop:first-child { animation: grad-a 8s ease-in-out infinite; }
    .cta-grad stop:last-child  { animation: grad-b 8s ease-in-out infinite; }
    @keyframes grad-a { 0%, 100% { stop-color: #2E2A26; } 50% { stop-color: #344A39; } }
    @keyframes grad-b { 0%, 100% { stop-color: #344A39; } 50% { stop-color: #2E2A26; } }

    @keyframes shimmer {
        0%        { transform: translateX(-100%); }
        60%, 100% { transform: translateX(200%); }
    }

    @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
    }
</style>
