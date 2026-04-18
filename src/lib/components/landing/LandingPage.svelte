<script lang="ts">
    import { Apple, ArrowRight } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { createAsciiRenderer, createPixelReveal } from 'landing-effects';
    import { C } from './landingTheme';
    import OnboardingCarousel from './OnboardingCarousel.svelte';
    import FeaturesGrid from './FeaturesGrid.svelte';
    import QuickFocusSection from './QuickFocusSection.svelte';

let pineHeroCanvas: HTMLCanvasElement;
    let pineSectionCanvas: HTMLCanvasElement;
    let pixelRevealCanvas!: HTMLCanvasElement;

    let visible = $state(false);
    let openFaq = $state<number | null>(null);

    const faqs = [
        { q: "What is real app blocking?", a: "Resin uses Apple's Screen Time API (FamilyControls) — not a timer or browser filter. Apps are blocked at the OS level across iPhone, iPad, and Mac. No override, no workaround." },
        { q: "How does AI planning work?", a: "Write anything — a messy note, a goal, a panic-typed thought. Tap Activate. On-device AI generates a step-by-step plan with time estimates in under 10 seconds. No cloud, no API keys." },
        { q: "Is my data private?", a: "AI runs entirely on your device. Nothing leaves your phone. No content reading, no data selling, no model training. Export or delete everything anytime." },
        { q: "Do I need iOS to use Resin?", a: "The web app handles notes, planning, and calendar sync. OS-level app blocking requires iOS. Website blocking via Chrome extension works on Mac too." },
        { q: "How is it free if it uses AI?", a: "On-device models (Gemma, Qwen) run on your iPhone's neural engine. No cloud compute = no per-request cost. Core app is free forever, no usage caps." },
        { q: "What does the Chrome extension do?", a: "The Chrome extension enforces website blocking during active focus sessions. Blocked URLs (YouTube, Reddit, Twitter, etc.) are replaced with a calm focus page showing your current task. It syncs with your Resin account automatically — blocking starts and stops with your sessions, no manual toggling." },
        { q: "Is Resin a notes app or a planning app?", a: "Both. Notes are the foundation — you capture everything there first. When you're ready to act, you activate: AI reads the note and generates an actionable plan. Notes also connect in a mind map, can be shared with friends, and sync across every device." },
        { q: "How is Resin different from Notion or Obsidian?", a: "Notion and Obsidian are great for organizing knowledge. Resin is for getting things done. Notes become actionable plans with AI in one tap, automatically scheduled on your calendar, and enforced with real app blocking. It's the gap between knowing what to do and actually doing it." },
    ];

    onMount(() => {
        visible = true;

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

        // Hero ASCII — transparent PNG (white removed), WebGL path, forest-green colorFn
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
            <img src="/logo.png" alt="Resin" width="28" height="28" style="display:block;" />
            <span class="tag" style="background:rgba(200,136,74,0.1); color:{C.amberDark};">beta</span>
        </div>
        <div class="flex items-center gap-3">
            <a href="/login" class="mono text-xs font-medium transition-opacity hover:opacity-70" style="color:{C.earth};">sign in</a>
            <a href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"
               class="flex items-center gap-1.5 transition-opacity hover:opacity-80"
               style="background:{C.charcoal}; color:white; padding:7px 16px; border-radius:6px; font-size:14px; font-weight:700;">
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
                            <div class="mono" style="font-size:11px; color:{C.earth}; margin-top:2px;">{label}</div>
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

            <!-- RIGHT: ASCII + pixel-reveal canvas -->
            <div class="relative hidden lg:block" style="height:85vh; border-left:1px solid rgba(46,42,38,0.1);">

                <!-- ASCII renderer — always-on parallax base layer -->
                <canvas bind:this={pineHeroCanvas}
                    class="absolute inset-0 w-full h-full"
                    style="pointer-events:none;"
                    aria-hidden="true"></canvas>

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
                        <span class="mono" style="font-size:13px; color:{C.charcoal};">on-device · private</span>
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
                        <span class="mono" style="font-size:13px; color:{C.charcoal};">plan in &lt;10 seconds</span>
                    </div>
                </div>

                <div class="absolute top-6 right-6">
                    <span class="mono" style="font-size:11px; color:{C.earthLight};">// ascii_renderer v1</span>
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
             style="font-size:13px; color:rgba(245,239,231,0.6);">
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


<!-- ══════════════════════════════════════════════════════
     STATS STRIP
══════════════════════════════════════════════════════ -->
<div style="background:{C.bgTertiary}; border-top:1px solid rgba(46,42,38,0.08); border-bottom:1px solid rgba(46,42,38,0.08);">
    <div class="max-w-6xl mx-auto px-6 py-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {#each [
                { val:'2,400+', label:'sessions completed' },
                { val:'4.8 ★',  label:'avg App Store rating' },
                { val:'100%',   label:'on-device AI' },
                { val:'Free',   label:'iOS · no credit card' },
            ] as { val, label }}
                <div class="text-center">
                    <div style="font-size:22px; font-weight:800; color:{C.charcoal}; letter-spacing:-0.02em; margin-bottom:3px;">{val}</div>
                    <div class="mono" style="font-size:12px; color:{C.earthLight};">{label}</div>
                </div>
            {/each}
        </div>
    </div>
</div>


<OnboardingCarousel />
<FeaturesGrid />
<QuickFocusSection />


<!-- ══════════════════════════════════════════════════════
     NOTES — DEEP DIVE
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bg};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-14">
            <span class="section-label" style="color:{C.earth};">03 / notes</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>

        <div class="grid lg:grid-cols-2 gap-16 items-center">

            <div>
                <h2 style="font-size:clamp(32px,4vw,52px); font-weight:800; line-height:1.05; letter-spacing:-0.02em; color:{C.charcoal}; margin-bottom:20px;">
                    Notes first.<br/>Always.
                </h2>
                <p style="font-size:15px; color:{C.earth}; line-height:1.8; max-width:460px; margin-bottom:32px;">
                    Resin starts as a blank canvas. No folders, no templates. Write whatever's in your head — a panic-typed thought, a half-formed goal, a brain dump at 11pm — and figure out the structure later. Notes don't need to be tidy to become a plan.
                </p>
                <div class="flex flex-col gap-5">
                    {#each [
                        ['Rich text + images', 'Write long-form, paste images, attach photos. OCR extracts text from photos automatically.'],
                        ['Mind map connections', 'Link notes into a knowledge graph. See how ideas relate across everything you have written.'],
                        ['Share with anyone', 'Share individual notes via public link or collaborate with other Resin users in real time.'],
                        ['One tap to activate', 'Any note can become an action plan. Tap Activate — on-device AI reads the whole note and does the rest.'],
                    ] as [title, body]}
                        <div class="flex items-start gap-3">
                            <div style="width:5px; height:5px; border-radius:50%; background:{C.amber}; margin-top:8px; flex-shrink:0;"></div>
                            <div>
                                <div style="font-size:14px; font-weight:700; color:{C.charcoal}; margin-bottom:2px;">{title}</div>
                                <div class="mono" style="font-size:13px; color:{C.earth}; line-height:1.6;">{body}</div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Phone: note editor -->
            <div class="flex justify-center lg:justify-end">
                <div style="width:226px; background:{C.bg}; border:1.5px solid rgba(46,42,38,0.18); border-radius:24px; padding:12px 12px 20px; box-shadow:0 16px 48px -12px rgba(46,42,38,0.2); position:relative;">
                    <div style="width:48px; height:5px; background:rgba(46,42,38,0.15); border-radius:3px; margin:0 auto 14px;"></div>
                    <div class="mono" style="font-size:11px; color:{C.earthLight}; margin-bottom:8px; display:flex; justify-content:space-between;">
                        <span>← notes</span><span style="color:{C.amber}; font-weight:700;">done</span>
                    </div>
                    <div style="font-size:15px; font-weight:800; color:{C.charcoal}; margin-bottom:3px; line-height:1.2;">Q2 report — due Friday</div>
                    <div class="mono" style="font-size:11px; color:{C.earthLight}; margin-bottom:12px;">Today · 4 min ago</div>
                    <div style="height:1px; background:rgba(46,42,38,0.07); margin-bottom:12px;"></div>
                    <div style="font-size:13px; color:{C.earth}; line-height:1.75; margin-bottom:14px;">
                        Still haven't started this. Deadline is Friday and Sarah keeps asking. The block is I don't know where to begin — too much data, no clear story yet.
                        <br/><br/>
                        <span style="color:{C.charcoal}; font-weight:700;">I need to:</span><br/>
                        — Pull last quarter numbers<br/>
                        — Find the 3 things that matter<br/>
                        — Write exec summary first<br/>
                        — 6 slides max
                    </div>
                    <div style="background:rgba(255,255,255,0.75); border:1px solid rgba(200,136,74,0.22); border-radius:8px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between;">
                        <div>
                            <div style="font-size:12px; font-weight:700; color:{C.charcoal};">Turn this into a plan</div>
                            <div class="mono" style="font-size:11px; color:{C.earthLight};">AI reads the whole note</div>
                        </div>
                        <div style="background:{C.amber}; color:white; border-radius:6px; padding:5px 10px; font-size:12px; font-weight:700;">✨ Activate</div>
                    </div>
                    <div style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); width:40px; height:3px; background:rgba(46,42,38,0.15); border-radius:2px;"></div>
                </div>
            </div>

        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     AI PLANNING — DEEP DIVE
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bgSecondary};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-14">
            <span class="section-label" style="color:{C.earth};">04 / planning</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>

        <div class="grid lg:grid-cols-2 gap-16 items-center">

            <!-- Terminal output -->
            <div>
                <div style="background:{C.charcoal}; border:1px solid rgba(46,42,38,0.4); border-radius:8px; overflow:hidden;">
                    <div class="mono flex items-center gap-2 px-4 py-2.5" style="background:rgba(255,255,255,0.04); border-bottom:1px solid rgba(255,255,255,0.06); font-size:12px; color:rgba(245,239,231,0.3);">
                        <span style="color:#ff6158;">●</span><span style="color:#ffbd2e;">●</span><span style="color:#28ca41;">●</span>
                        <span style="margin-left:8px;">resin · plan_generator</span>
                    </div>
                    <div class="mono px-4 py-5" style="font-size:13px; line-height:2.1; color:rgba(245,239,231,0.55);">
                        <div><span style="color:rgba(200,136,74,0.9);">$</span> activate "Q2 report due Friday"</div>
                        <div style="color:rgba(245,239,231,0.3);">&gt; reading note content…</div>
                        <div style="color:rgba(245,239,231,0.3);">&gt; running gemma-3n on-device…</div>
                        <div style="color:rgba(132,184,145,0.9); margin-top:2px;">&gt; plan ready (7.4s)</div>
                        <div style="margin-top:8px; color:rgba(245,239,231,0.75);">
                            <div style="color:rgba(232,191,138,0.9);">── Q2 Report ──────────────</div>
                            <div>1. Pull last quarter metrics <span style="color:rgba(245,239,231,0.3);">&lt;30m&gt;</span></div>
                            <div>2. Identify 3 key trends <span style="color:rgba(245,239,231,0.3);">&lt;45m&gt;</span></div>
                            <div>3. Build 6-slide deck <span style="color:rgba(245,239,231,0.3);">&lt;60m&gt;</span></div>
                            <div style="color:rgba(232,191,138,0.9); margin-top:2px;">── Thu 9:00–11:15am · calendar blocked</div>
                        </div>
                        <span style="display:inline-block; width:7px; height:14px; background:rgba(200,136,74,0.7); border-radius:1px; vertical-align:-3px; animation:blink-cursor 1s step-end infinite;"></span>
                    </div>
                </div>
                <div class="mono mt-3" style="font-size:12px; color:{C.earthLight};">// gemma-3n · qwen2.5 · neural engine · never leaves device</div>
            </div>

            <!-- Copy -->
            <div>
                <h2 style="font-size:clamp(32px,4vw,52px); font-weight:800; line-height:1.05; letter-spacing:-0.02em; color:{C.charcoal}; margin-bottom:20px;">
                    Your note becomes<br/>a plan in seconds.
                </h2>
                <p style="font-size:15px; color:{C.earth}; line-height:1.8; max-width:460px; margin-bottom:32px;">
                    Tap Activate on any note. On-device AI reads the full text, identifies what you actually need to do, and generates a step-by-step plan with time estimates. Then it blocks time on your calendar before you even start.
                </p>
                <div class="grid grid-cols-2 gap-3">
                    {#each [
                        ['No cloud', 'All AI runs on your Neural Engine. Nothing sent to a server.'],
                        ['No API key', 'Free forever. No tokens, no credits, no usage limits.'],
                        ['Steps + time', 'Each task gets a specific duration so you know the scope.'],
                        ['Calendar sync', 'Plan auto-blocks your Google Calendar before you start.'],
                    ] as [title, body]}
                        <div class="box p-4" style="background:rgba(255,255,255,0.5);">
                            <div style="font-size:14px; font-weight:700; color:{C.charcoal}; margin-bottom:4px;">{title}</div>
                            <div class="mono" style="font-size:13px; color:{C.earth}; line-height:1.5;">{body}</div>
                        </div>
                    {/each}
                </div>
            </div>

        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     EVERYWHERE — CROSS-PLATFORM
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bg};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-6">
            <span class="section-label" style="color:{C.earth};">05 / everywhere</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>
        <h2 style="font-size:clamp(28px,3.5vw,44px); font-weight:800; letter-spacing:-0.02em; color:{C.charcoal}; margin-bottom:10px;">
            Every surface. One system.
        </h2>
        <p style="font-size:15px; color:{C.earth}; line-height:1.7; max-width:520px; margin-bottom:40px;">
            Resin spans iOS, web, Chrome, and Google Calendar. Block apps on your phone and websites on your laptop — simultaneously, in the same session.
        </p>

        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {#each [
                {
                    platform: 'iOS app',
                    tag: 'free · no credit card',
                    tagColor: C.forest,
                    features: ['Notes + AI planning', 'OS-level app blocking', 'Quick Focus (1 tap)', 'Forest + streaks', 'Home screen widget'],
                },
                {
                    platform: 'Web dashboard',
                    tag: 'free to try',
                    tagColor: C.amber,
                    features: ['Notes editor + mind map', 'Session planning', 'Google Calendar sync', 'Team note sharing', 'Notes boards'],
                },
                {
                    platform: 'Chrome extension',
                    tag: 'free',
                    tagColor: C.amberDark,
                    features: ['Website blocking', 'Syncs with iOS sessions', 'Blocked URL focus page', 'Focus mode indicator', 'Auto start / stop'],
                },
                {
                    platform: 'Google Calendar',
                    tag: 'auto-sync',
                    tagColor: C.earth,
                    features: ['Plans block time slots', 'Session start reminders', 'Two-way sync', 'Rescheduling support', 'Multi-calendar support'],
                },
            ] as { platform, tag, tagColor, features }}
                <div class="box p-5 flex flex-col" style="background:rgba(255,255,255,0.4);">
                    <div style="font-size:15px; font-weight:800; color:{C.charcoal}; margin-bottom:4px;">{platform}</div>
                    <div class="mono mb-5" style="font-size:11px; color:{tagColor}; letter-spacing:0.06em; text-transform:uppercase;">{tag}</div>
                    <div class="flex flex-col gap-2.5 flex-1">
                        {#each features as feat}
                            <div class="flex items-center gap-2">
                                <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
                                    <path d="M 1,5 L 4,8 L 9,2" fill="none" stroke="{C.forest}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span style="font-size:13px; color:{C.charcoal};">{feat}</span>
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     FOREST / PROGRESS
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bgSecondary};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-14">
            <span class="section-label" style="color:{C.earth};">06 / progress</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>

        <div class="grid lg:grid-cols-2 gap-16 items-center">

            <div>
                <h2 style="font-size:clamp(32px,4vw,52px); font-weight:800; line-height:1.05; letter-spacing:-0.02em; color:{C.charcoal}; margin-bottom:20px;">
                    Your discipline<br/>becomes something<br/>you can see.
                </h2>
                <p style="font-size:15px; color:{C.earth}; line-height:1.8; max-width:440px; margin-bottom:36px;">
                    Every completed session earns stones. Stones unlock fossil rewards — from a dino footprint at your first session to a legendary T-Rex at 500. Your forest grows with your streak. Synced across iOS and web in real time.
                </p>
                <div class="flex flex-col gap-5">
                    {#each [
                        { label:'Stones', body:'Earned for every completed session. Carry over, never expire.' },
                        { label:'Fossils', body:'14 collectible fossil rewards unlocked by stones and streaks.' },
                        { label:'Streak', body:'Daily streak tracked and displayed. Flame badge when streak &gt; 1.' },
                    ] as { label, body }}
                        <div class="flex items-start gap-4">
                            <div class="box mono flex-shrink-0" style="background:{C.bg}; padding:4px 10px; font-size:13px; font-weight:700; color:{C.amber}; white-space:nowrap;">{label}</div>
                            <div style="font-size:14px; color:{C.earth}; line-height:1.6; padding-top:4px;">{@html body}</div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Fossil reward grid -->
            <div>
                <div class="grid grid-cols-4 gap-2">
                    {#each [
                        ['fossil_footprint',      'Dino Footprint',   'always'],
                        ['fossil_trace',           'Trace Fossil',     '10 stones'],
                        ['fossil_trilobite_flat',  'Trilobite',        '25 stones'],
                        ['fossil_bone_rock',       'Bone Fragment',    '50 stones'],
                        ['fossil_lizard_octagon',  'Stone Lizard',     '75 stones'],
                        ['fossil_ammonite',        'Ammonite',         '100 stones'],
                        ['fossil_ammonite_brush',  'Excavation',       '7-day streak'],
                        ['fossil_triceratops',     'Triceratops',      '14-day streak'],
                        ['fossil_trex_rock',       'T-Rex in Rock',    '21-day streak'],
                        ['fossil_trex_flat',       'T-Rex Skull',      '30-day streak'],
                        ['fossil_trex_cartoon',    'Legendary T-Rex',  '500 stones'],
                        ['fossil_dragonfly_amber', 'Amber Dragonfly',  '1000 stones'],
                    ] as [id, name, unlock]}
                        <div class="box flex flex-col items-center p-2 text-center" style="background:rgba(255,255,255,0.45);">
                            <img src="/images/fossils/{id}.png" alt="{name}" style="width:38px; height:38px; object-fit:contain; opacity:0.65; margin-bottom:4px;" />
                            <div style="font-size:11px; font-weight:700; color:{C.charcoal}; line-height:1.2;">{name}</div>
                            <div class="mono" style="font-size:11px; color:{C.earthLight}; margin-top:2px;">{unlock}</div>
                        </div>
                    {/each}
                </div>
                <div class="mono mt-3 text-center" style="font-size:12px; color:{C.earthLight};">// 14 fossils total · unlocked by stones + streaks</div>
            </div>

        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     HOW IT WORKS
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6 grid-bg" style="background:{C.bgSecondary};">
    <div class="max-w-6xl mx-auto">

        <div class="flex items-center gap-4 mb-16">
            <span class="section-label" style="color:{C.earth};">07 / how it works</span>
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
                    <div class="mono font-bold mb-6" style="font-size:13px; color:{step.accent}; letter-spacing:0.1em;">{step.n}</div>
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
            <p class="mono" style="font-size:13px; color:{C.earth}; letter-spacing:0.08em;">
                // block apps in one tap. notes become plans. plans become sessions.
            </p>
        </div>
    </div>
</div>


<!-- ══════════════════════════════════════════════════════
     2e — BUILT FOR NEURODIVERGENT MINDS
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bg};">
    <div class="max-w-5xl mx-auto">

        <div class="flex items-center gap-4 mb-14">
            <span class="section-label" style="color:{C.earth};">08 / built for 2e minds</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>

        <div class="text-center mb-12">
            <h2 style="font-size:clamp(30px,3.8vw,46px); font-weight:800; line-height:1.05; letter-spacing:-0.02em; color:{C.charcoal}; margin-bottom:16px;">
                Your brain moves fast.<br/>The tools should keep up.
            </h2>
            <p style="font-size:16px; color:{C.earth}; line-height:1.75; max-width:540px; margin:0 auto;">
                Resin is built for twice-exceptional people — gifted minds who also live with ADHD, autism, dyslexia, or sensory differences. High horsepower, hard to start. Resin is built for that exact gap.
            </p>
        </div>

        <div class="grid md:grid-cols-3 gap-4">
            {#each [
                {
                    title: 'Working memory relief',
                    body: 'The brain dump is a pressure valve. Get it out of your head and onto the screen — then let AI sort it into steps your brain can actually start.',
                    accent: C.amber,
                },
                {
                    title: 'Task initiation, solved',
                    body: 'Knowing what to do and starting are two different neurological events. Resin breaks tasks small enough that the first step feels possible.',
                    accent: C.forest,
                },
                {
                    title: 'No willpower required',
                    body: "OS-level blocking removes impulsive escape routes entirely. Your phone can't distract you because the apps aren't there. No override.",
                    accent: C.amberDark,
                },
            ] as { title, body, accent }}
                <div class="box p-6" style="background:rgba(255,255,255,0.5);">
                    <div style="width:8px; height:8px; border-radius:50%; background:{accent}; margin-bottom:16px;"></div>
                    <div style="font-size:16px; font-weight:800; color:{C.charcoal}; margin-bottom:10px; line-height:1.2;">{title}</div>
                    <p style="font-size:14px; color:{C.earth}; line-height:1.7;">{body}</p>
                </div>
            {/each}
        </div>

    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     TESTIMONIALS
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bgSecondary};">
    <div class="max-w-6xl mx-auto">
        <div class="flex items-center gap-4 mb-12">
            <span class="section-label" style="color:{C.earth};">09 / from users</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>
        <div class="grid md:grid-cols-3 gap-4">
            {#each [
                { q:"Finally a notes app where writing something actually means it gets done. Not just filed away forever.", name:"Jordan L.", role:"UX Researcher" },
                { q:"The blocking is actually real. No timer, no override. Instagram just disappears. That's what I needed.", name:"Aisha K.", role:"Grad Student" },
                { q:"I have ADHD. This is the only system that works — AI breaks things down small enough I can actually start.", name:"Sofia E.", role:"UX Researcher" },
                { q:"I dump every panicked thought into Resin. It turns it into a plan so I can stop holding it in my head.", name:"Priya M.", role:"Product Manager" },
                { q:"Went from 'clean my room' sitting in my notes for 3 weeks to done in 45 minutes. The AI plan was actually specific.", name:"Daniel R.", role:"Freelance Designer" },
                { q:"Chrome extension + iOS blocking together. My laptop AND phone are locked during sessions. Zero escape routes.", name:"Marcus T.", role:"Software Engineer" },
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
                             style="background:{C.bgTertiary}; font-size:12px; color:{C.earth}; font-weight:600;">
                            {t.name[0]}
                        </div>
                        <div>
                            <div class="mono" style="font-size:13px; font-weight:600; color:{C.charcoal};">{t.name}</div>
                            <div class="mono" style="font-size:12px; color:{C.earthLight};">{t.role}</div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>


<!-- ══════════════════════════════════════════════════════
     PRICING
══════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bg};">
    <div class="max-w-4xl mx-auto">

        <div class="flex items-center gap-4 mb-6">
            <span class="section-label" style="color:{C.earth};">10 / pricing</span>
            <div style="flex:1; height:1px; background:rgba(46,42,38,0.1);"></div>
        </div>
        <h2 style="font-size:clamp(28px,3.5vw,44px); font-weight:800; letter-spacing:-0.02em; color:{C.charcoal}; margin-bottom:10px;">
            Free to start. Free to keep.
        </h2>
        <p style="font-size:15px; color:{C.earth}; line-height:1.7; max-width:440px; margin-bottom:40px;">
            On-device AI means no cloud compute costs — no tokens, no credits, no usage caps. The iOS core app is free forever.
        </p>

        <div class="grid md:grid-cols-2 gap-4 max-w-2xl">
            {#each [
                {
                    platform: 'iOS App',
                    price: 'Free',
                    sub: 'forever · no credit card',
                    accent: C.forest,
                    features: ['AI planning — unlimited', 'Quick Focus sessions', 'OS-level app blocking', 'Notes + mind map', 'Fossil rewards + streaks', 'Home screen widget'],
                },
                {
                    platform: 'Web + Chrome',
                    price: 'Free',
                    sub: 'to try · team features coming',
                    accent: C.amber,
                    features: ['Notes editor + boards', 'Session planning', 'Google Calendar sync', 'Website blocking (Chrome)', 'Shared notes', 'Forest dashboard'],
                },
            ] as { platform, price, sub, accent, features }}
                <div class="box p-7" style="background:rgba(255,255,255,0.6);">
                    <div class="mono mb-1" style="font-size:12px; color:{accent}; letter-spacing:0.08em; text-transform:uppercase;">{platform}</div>
                    <div style="font-size:36px; font-weight:800; color:{C.charcoal}; margin-bottom:4px; letter-spacing:-0.03em;">{price}</div>
                    <div class="mono mb-6" style="font-size:13px; color:{C.earthLight};">{sub}</div>
                    <div class="flex flex-col gap-3">
                        {#each features as feat}
                            <div class="flex items-center gap-2">
                                <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
                                    <path d="M 1,5 L 4,8 L 9,2" fill="none" stroke="{accent}" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                <span style="font-size:14px; color:{C.charcoal};">{feat}</span>
                            </div>
                        {/each}
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
            <span class="section-label" style="color:{C.earth};">11 / faq</span>
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
        <p class="mono mb-12" style="font-size:14px; color:rgba(245,239,231,0.4); line-height:1.8;">
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
        font-size: 12px; font-weight: 600;
        letter-spacing: 0.08em; text-transform: uppercase;
        padding: 4px 10px; border-radius: 4px;
    }

    .section-label {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px; font-weight: 500;
        letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.45;
    }

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

    @keyframes blink-cursor {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
        * { animation: none !important; transition: none !important; }
    }
</style>
