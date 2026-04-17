<script lang="ts">
    import { Brain, Lock, Check, ChevronDown, Apple, TrendingUp, Calendar, Globe, Star, Shield, ArrowRight, FileText, Mic, Link, Users, Zap } from 'lucide-svelte';
    import { onMount } from 'svelte';
    import { createAsciiRenderer } from 'landing-effects';

    // ── iOS-accurate color palette ──────────────────────────────────────
    // Pulled directly from ResinTheme.swift
    const C = {
        bg:           '#F5EFE7',   // warm sand — primary background
        bgSecondary:  '#EDE4D8',   // deeper warm layer
        bgTertiary:   '#E0D5C5',   // card backgrounds
        amber:        '#C8884A',   // primary copper amber
        amberLight:   '#E8BF8A',   // warm amber highlight
        amberGlow:    '#E8A857',   // saturated amber for glow
        amberDark:    '#A0663A',   // deep burnt amber
        forest:       '#4D6652',   // deeper muted sage
        forestDark:   '#344A39',   // deep forest
        earth:        '#8C7B6A',   // warmer taupe
        earthLight:   '#C4B5A8',   // light taupe for secondary text
        charcoal:     '#2E2A26',   // near-black primary text
        gray:         '#8B847D',   // mid gray
        grayLight:    '#C8C3BE',   // light borders
    } as const;

    let animatedSections = $state<{ [key: string]: boolean }>({});
    let openFaq = $state<number | null>(null);

    // ASCII fossil canvas refs — hero + 5 section decorations
    let asciiCanvas: HTMLCanvasElement;
    let fossilAmmoniteCanvas: HTMLCanvasElement;
    let fossilTrilobiteCanvas: HTMLCanvasElement;
    let fossilTrexCanvas: HTMLCanvasElement;
    let fossilFootprintCanvas: HTMLCanvasElement;
    let fossilCtaCanvas: HTMLCanvasElement;

    function toggleFaq(i: number) {
        openFaq = openFaq === i ? null : i;
    }

    const faqs = [
        {
            q: "What exactly does 'real app blocking' mean?",
            a: "Resin uses Apple's Screen Time API (FamilyControls) to block apps at the OS level — not a browser filter or timer. When you're in a focus session, YouTube, Instagram, Reddit, and any app you specify are completely inaccessible across your iPhone, iPad, and Mac. No override, no workaround, no timer to wait out."
        },
        {
            q: "How does the AI planning work?",
            a: "You write anything — a messy note, a goal, a panic-typed thought — and tap Activate. Resin's on-device AI reads it, identifies what you actually need to do, and generates a step-by-step plan with time estimates and calendar blocks. Everything runs on your iPhone's neural engine in under 10 seconds. No cloud, no API keys."
        },
        {
            q: "What does the Chrome extension do?",
            a: "The Resin Chrome extension enforces website blocking during active focus sessions. Blocked URLs (YouTube, Reddit, Twitter, etc.) are replaced with a calm focus page showing your current task. It syncs with your Resin account automatically — blocking starts and stops with your sessions, no manual toggling."
        },
        {
            q: "Is Resin a note-taking app or a planning app?",
            a: "Both. Notes in Resin are the foundation — you capture everything there first. Then, when you're ready to act on a note, you activate it: AI reads the note and generates an actionable plan. Your notes also connect in a mind map, can be shared with friends, and sync across every device."
        },
        {
            q: "Do I need the iOS app to use Resin?",
            a: "The web app handles note-taking, planning, calendar sync, and session management — everything except OS-level app blocking, which requires the iOS app. If you primarily work on a Mac with the Chrome extension, website blocking works there too."
        },
        {
            q: "Is my data private?",
            a: "Yes. On iOS, the AI runs entirely on your device — nothing leaves your phone. Your notes are encrypted. We don't read your content, sell your data, or use it to train AI models. You can export or delete everything at any time."
        },
        {
            q: "How is the iOS app free if it uses AI?",
            a: "Resin uses on-device models (Gemma, Qwen) running directly on your iPhone's neural engine. No cloud compute means no per-request cost — so we can offer the core app completely free, with no token limits or usage caps, forever."
        },
        {
            q: "How is Resin different from Notion or Obsidian?",
            a: "Notion and Obsidian are great for organizing knowledge. Resin is for getting things done. Notes aren't just stored — they become actionable plans with AI in one tap, automatically scheduled on your calendar, and enforced with real app blocking. It's the gap between knowing what to do and actually doing it."
        }
    ];

    const testimonials = [
        {
            quote: "Finally a notes app where writing something actually means it gets done. Not just filed away forever.",
            name: "Jordan L.",
            role: "UX Researcher"
        },
        {
            quote: "I dump every panicked thought into Resin. It turns it into a plan so I can stop holding it in my head.",
            name: "Priya M.",
            role: "Product Manager"
        },
        {
            quote: "The blocking is actually real. No timer, no override. Instagram just disappears. That's what I needed.",
            name: "Aisha K.",
            role: "Grad Student"
        },
        {
            quote: "Went from 'clean my room' sitting in my notes for 3 weeks to done in 45 minutes. The AI plan was actually specific.",
            name: "Daniel R.",
            role: "Freelance Designer"
        },
        {
            quote: "I have ADHD and this is the only system that works. The AI breaks things down small enough I can actually start.",
            name: "Sofia E.",
            role: "UX Researcher"
        },
        {
            quote: "Chrome extension + iOS blocking together. My laptop AND phone are locked during sessions. Zero escape routes.",
            name: "Marcus T.",
            role: "Software Engineer"
        }
    ];

    onMount(() => {
        const sections = document.querySelectorAll('[data-section]');
        sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight + 50) {
                const key = section.getAttribute('data-section');
                if (key) animatedSections[key] = true;
            }
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const key = entry.target.getAttribute('data-section');
                    if (key) animatedSections[key] = true;
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '60px' });

        sections.forEach((s) => observer.observe(s));

        // Lazy-init helper: defers ASCII renderer until element scrolls into view
        function lazily(canvas: HTMLCanvasElement, init: () => (() => void)): () => void {
            let cleanup: (() => void) | undefined;
            const obs = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting) {
                    cleanup = init();
                    obs.disconnect();
                }
            }, { rootMargin: '120px' });
            obs.observe(canvas);
            return () => { obs.disconnect(); cleanup?.(); };
        }

        // Hero — dragonfly in amber, behind phone mockup (eager, always visible)
        let cleanupAscii: (() => void) | undefined;
        if (asciiCanvas) {
            cleanupAscii = createAsciiRenderer({
                canvas: asciiCanvas,
                imageSrc: '/images/fossils/fossil_dragonfly_amber.png',
                chars: ' ·:+%#',
                fontSize: 10,
                brightnessBoost: 1.6,
                parallaxStrength: 10,
                colorFn: (lum, _dist) => {
                    const r = Math.round(140 + lum * 115);
                    const g = Math.round(80 + lum * 80);
                    const b = Math.round(30 + lum * 40);
                    return `rgba(${r},${g},${b},${0.25 + lum * 0.75})`;
                }
            });
        }

        // Amber palette shared across section fossils
        const amberFn = (lum: number) =>
            `rgba(${Math.round(145+lum*110)},${Math.round(85+lum*75)},${Math.round(28+lum*38)},${0.22+lum*0.78})`;
        const forestFn = (lum: number) =>
            `rgba(${Math.round(50+lum*70)},${Math.round(88+lum*95)},${Math.round(44+lum*55)},${0.2+lum*0.8})`;

        // Section fossils — lazy (init when scrolled into view)
        const fossilCleanups: (() => void)[] = [];

        if (fossilAmmoniteCanvas) {
            fossilCleanups.push(lazily(fossilAmmoniteCanvas, () => createAsciiRenderer({
                canvas: fossilAmmoniteCanvas,
                imageSrc: '/images/fossils/fossil_ammonite.png',
                chars: ' ·:+%#',
                fontSize: 9,
                brightnessBoost: 2.0,
                parallaxStrength: 7,
                colorFn: (lum) => amberFn(lum)
            })));
        }
        if (fossilTrilobiteCanvas) {
            fossilCleanups.push(lazily(fossilTrilobiteCanvas, () => createAsciiRenderer({
                canvas: fossilTrilobiteCanvas,
                imageSrc: '/images/fossils/fossil_trilobite_flat.png',
                chars: ' ·:+%#',
                fontSize: 9,
                brightnessBoost: 1.9,
                parallaxStrength: 5,
                colorFn: (lum) => `rgba(${Math.round(110+lum*100)},${Math.round(95+lum*85)},${Math.round(55+lum*55)},${0.2+lum*0.8})`
            })));
        }
        if (fossilTrexCanvas) {
            fossilCleanups.push(lazily(fossilTrexCanvas, () => createAsciiRenderer({
                canvas: fossilTrexCanvas,
                imageSrc: '/images/fossils/fossil_trex_flat.png',
                chars: ' ·:+%#',
                fontSize: 10,
                brightnessBoost: 1.7,
                parallaxStrength: 6,
                colorFn: (lum) => forestFn(lum)
            })));
        }
        if (fossilFootprintCanvas) {
            fossilCleanups.push(lazily(fossilFootprintCanvas, () => createAsciiRenderer({
                canvas: fossilFootprintCanvas,
                imageSrc: '/images/fossils/fossil_footprint.png',
                chars: ' ·:+%#',
                fontSize: 8,
                brightnessBoost: 2.2,
                parallaxStrength: 4,
                colorFn: (lum) => amberFn(lum)
            })));
        }
        if (fossilCtaCanvas) {
            fossilCleanups.push(lazily(fossilCtaCanvas, () => createAsciiRenderer({
                canvas: fossilCtaCanvas,
                imageSrc: '/images/fossils/fossil_ammonite_brush.png',
                chars: ' ·:+%#',
                fontSize: 11,
                brightnessBoost: 1.5,
                parallaxStrength: 8,
                colorFn: (lum) => amberFn(lum)
            })));
        }

        return () => {
            observer.disconnect();
            cleanupAscii?.();
            fossilCleanups.forEach(c => c());
        };
    });

    function visible(key: string) {
        return animatedSections[key]
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8';
    }
</script>

<!-- ─── Root: warm sand background matching iOS ─── -->
<main style="background: {C.bg}; font-family: 'Nunito', system-ui, sans-serif;">

<!-- ═══════════════════════════════════════════════════════════
     HERO
═══════════════════════════════════════════════════════════ -->
<section class="relative pt-24 pb-0 overflow-hidden" data-section="hero">

    <!-- Subtle grain texture overlay -->
    <div class="absolute inset-0 pointer-events-none opacity-[0.025]" aria-hidden="true"
         style="background-image: url(&quot;data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E&quot;); background-size: 180px;">
    </div>
    <!-- Warm amber glow, top right -->
    <div class="absolute top-0 right-0 w-[700px] h-[700px] pointer-events-none" aria-hidden="true"
         style="background: radial-gradient(ellipse at 80% 0%, rgba(200,136,74,0.16) 0%, transparent 60%); filter: blur(1px);">
    </div>

    <div class="max-w-7xl mx-auto px-6 lg:px-10">
        <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center" style="min-height: 90vh;">

            <!-- ── LEFT: Copy ── -->
            <div class="transition-all duration-700 {visible('hero')} pb-24 lg:pb-0">

                <!-- Kicker -->
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-7 uppercase tracking-wider"
                     style="background:rgba(200,136,74,0.1); color:{C.amberDark};">
                    <Brain class="w-3 h-3" /> Notes · AI Planning · Real blocking
                </div>

                <h1 class="font-serif font-bold tracking-tight mb-6" style="font-size: clamp(42px, 5.8vw, 70px); line-height: 1.05; color: {C.charcoal};">
                    Write it down.<br />
                    <span class="relative inline-block">
                        <span style="background: linear-gradient(135deg, {C.amber} 0%, {C.amberDark} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Actually get it done.</span>
                        <!-- hand-drawn underline accent -->
                        <svg aria-hidden="true" class="absolute w-full overflow-visible" style="bottom:-6px; left:0;" height="8" preserveAspectRatio="none" viewBox="0 0 420 8">
                            <path d="M3,6 C70,1 140,7.5 210,4.5 C280,1.5 350,7 417,3.5" stroke="{C.amber}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.55"/>
                        </svg>
                    </span>
                </h1>

                <p class="mb-5 leading-relaxed max-w-[480px]" style="font-size:18px; color:{C.earth}; line-height:1.75; font-family:'Nunito', sans-serif;">
                    Resin is a <strong style="color:{C.charcoal}; font-weight:700;">notes app first</strong> — the kind where you can just dump whatever's in your head, no structure required. Then, one tap activates AI that turns any note into a concrete action plan. Your phone blocks distractions until it's done.
                </p>

                <!-- Notes callout -->
                <div class="flex items-start gap-3 mb-8 px-4 py-3.5 rounded-lg" style="background:rgba(200,136,74,0.07); border:1px solid rgba(200,136,74,0.15); max-width:460px;">
                    <FileText class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:{C.amber};" />
                    <p style="font-size:13.5px; color:{C.earth}; line-height:1.6; font-family:'Lora', serif; font-style:italic;">
                        Stream-of-consciousness. Half-formed thoughts. Goals you haven't started. It all starts as a note.
                    </p>
                </div>

                <!-- CTAs -->
                <div class="flex flex-col sm:flex-row items-start gap-4 mb-11">
                    <!-- App Store badge style -->
                    <a href="https://testflight.apple.com/join/yV53qa1z"
                       target="_blank" rel="noopener noreferrer"
                       class="group inline-flex items-center gap-3 transition-all duration-200 hover:-translate-y-0.5"
                       style="background:{C.charcoal}; color:white; padding:14px 26px; border-radius:14px; box-shadow: 0 6px 20px -4px rgba(46,42,38,0.4), 0 1px 3px rgba(46,42,38,0.3);">
                        <Apple class="w-5 h-5 flex-shrink-0" />
                        <div>
                            <div style="font-size:10px; opacity:0.55; line-height:1; margin-bottom:3px; letter-spacing:0.03em; text-transform:uppercase;">iOS · Free forever</div>
                            <div style="font-size:16px; font-weight:700; line-height:1; letter-spacing:-0.01em;">Download for free</div>
                        </div>
                    </a>

                    <a href="/login?next=/"
                       class="group inline-flex items-center gap-2 transition-colors"
                       style="padding:16px 24px; font-size:15px; font-weight:600; color:{C.earth}; border-bottom: 1.5px solid rgba(92,75,60,0.25);">
                        Try the web app
                        <ArrowRight class="w-4 h-4 opacity-50 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
                    </a>
                </div>

                <!-- Trust row -->
                <div class="flex flex-wrap gap-x-6 gap-y-2" style="font-size:13px; color:{C.earthLight};">
                    <span>✦ iOS app is free</span>
                    <span>✦ AI runs on-device</span>
                    <span>✦ No credit card</span>
                </div>
            </div>

            <!-- ── RIGHT: Single phone mockup + annotations ── -->
            <div class="hidden lg:flex justify-center items-center relative" style="height:640px;">

                <!-- ASCII art canvas — amber fossil rendered behind the phone -->
                <canvas
                    bind:this={asciiCanvas}
                    class="absolute inset-0 w-full h-full"
                    style="opacity: 0.28; pointer-events: none; border-radius: 24px;"
                    aria-hidden="true"
                ></canvas>

                <!-- The phone -->
                <div class="relative z-20" style="transform: rotate(1.5deg);">
                    <div class="overflow-hidden relative"
                         style="width:290px; height:600px; border-radius:50px; border:10px solid {C.charcoal}; background:white; box-shadow: 0 40px 80px -20px rgba(46,42,38,0.38), 0 0 0 1px rgba(46,42,38,0.08);">

                        <!-- Dynamic island -->
                        <div class="absolute z-10 flex items-center justify-center" style="top:12px; left:50%; transform:translateX(-50%); width:100px; height:28px; background:{C.charcoal}; border-radius: 8px;">
                            <div class="rounded-full" style="width:10px; height:10px; background:#111;"></div>
                        </div>

                        <!-- Screen content: note editor -->
                        <div class="flex flex-col h-full" style="background:{C.bg};">

                            <!-- Status bar -->
                            <div class="flex items-center justify-between px-6 pt-5 pb-1" style="font-size:11px; font-weight:600; color:{C.charcoal};">
                                <span>9:41</span>
                                <div class="flex items-center gap-1">
                                    <span style="font-size:10px;">●●●</span>
                                    <span style="font-size:10px;">WiFi</span>
                                    <span style="font-size:10px;">🔋</span>
                                </div>
                            </div>

                            <!-- Nav bar -->
                            <div class="flex items-center justify-between px-5 py-3">
                                <span style="font-size:11px; color:{C.earthLight};">← Notes</span>
                                <span style="font-size:11px; color:{C.amber}; font-weight:600;">Done</span>
                            </div>

                            <!-- Note title -->
                            <div class="px-5 pb-3">
                                <div class="font-serif font-semibold" style="font-size:17px; color:{C.charcoal}; line-height:1.3;">Q2 report — due Friday</div>
                                <div style="font-size:10px; color:{C.earthLight}; margin-top:3px;">Today · 4 min ago</div>
                            </div>

                            <!-- Divider -->
                            <div style="height:1px; background:rgba(46,42,38,0.07); margin:0 20px;"></div>

                            <!-- Note body — genuine, human writing -->
                            <div class="px-5 py-4 flex-1" style="font-size:13.5px; color:{C.earth}; line-height:1.8; font-family:'Lora', serif;">
                                <p style="margin-bottom:10px;">Still haven't started this. Sarah's already asked twice and I keep saying "almost." Deadline is Friday morning.</p>
                                <p style="margin-bottom:10px;">The block is I don't know where to even begin. There's too much data, no clear story yet.</p>
                                <p style="margin-bottom:6px; color:{C.charcoal}; font-weight:500;">I think I need to:</p>
                                <p style="padding-left:12px; color:{C.charcoal};">— Pull last quarter numbers<br/>— Find the 3 things that matter<br/>— Write exec summary first<br/>— 6 slides max, not 20</p>
                                <p style="margin-top:10px; color:{C.earthLight};">Just start with the data pull. That's the actual block.<span style="display:inline-block; width:2px; height:14px; background:{C.amber}; margin-left:2px; vertical-align:-2px; border-radius:1px;" class="animate-pulse"></span></p>
                            </div>

                            <!-- Activate button -->
                            <div class="px-4 pb-5 pt-2">
                                <div class="rounded-lg flex items-center justify-between px-4 py-3.5" style="background:white; border:1px solid rgba(200,136,74,0.22); box-shadow:0 2px 12px -2px rgba(200,136,74,0.15);">
                                    <div>
                                        <div style="font-size:11px; font-weight:600; color:{C.charcoal};">Turn this into a plan</div>
                                        <div style="font-size:9.5px; color:{C.earthLight}; margin-top:1px;">AI reads the whole note</div>
                                    </div>
                                    <div class="rounded-xl font-bold text-white flex items-center gap-1.5" style="background:{C.amber}; font-size:11px; padding:8px 14px;">
                                        ✨ Activate
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Annotation 1: top-right sticky note -->
                <div class="absolute z-30" style="top:40px; right:-10px; transform:rotate(4deg);">
                    <div style="background:#FFFBF0; padding:10px 14px; border-radius:3px; box-shadow:2px 4px 12px rgba(46,42,38,0.14), 0 1px 2px rgba(46,42,38,0.08); min-width:130px; border-top:3px solid {C.amberLight};">
                        <div style="font-size:16px; margin-bottom:4px;">⚡</div>
                        <div style="font-size:11px; font-weight:700; color:{C.charcoal}; line-height:1.3;">Plan generated<br/>in 8 seconds</div>
                    </div>
                </div>

                <!-- Annotation 2: bottom-left -->
                <div class="absolute z-30" style="bottom:80px; left:-30px; transform:rotate(-3deg);">
                    <div style="background:#F0F5F1; padding:10px 14px; border-radius:3px; box-shadow:2px 4px 12px rgba(46,42,38,0.12); min-width:140px; border-top:3px solid {C.forest};">
                        <div style="font-size:16px; margin-bottom:4px;">🔒</div>
                        <div style="font-size:11px; font-weight:700; color:{C.charcoal}; line-height:1.3;">Apps blocked<br/>automatically</div>
                        <div style="font-size:9px; color:{C.earthLight}; margin-top:3px;">iOS · iPad · Chrome</div>
                    </div>
                </div>

                <!-- Annotation 3: mid-left small chip -->
                <div class="absolute z-30" style="top:42%; left:-40px; transform:rotate(-6deg);">
                    <div style="background:white; padding:8px 12px; border-radius: 8px; box-shadow:0 4px 14px rgba(46,42,38,0.12); border:1px solid rgba(46,42,38,0.08); white-space:nowrap;">
                        <span style="font-size:11px; font-weight:600; color:{C.charcoal};">🌲 On-device AI</span>
                    </div>
                </div>
            </div>

        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     STATS STRIP
═══════════════════════════════════════════════════════════ -->
<div style="background:{C.bgSecondary}; border-top:1px solid rgba(46,42,38,0.07); border-bottom:1px solid rgba(46,42,38,0.07);">
    <div class="max-w-6xl mx-auto px-6 py-6">
        <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            <div class="text-center">
                <div class="font-serif font-bold" style="font-size:26px; color:{C.charcoal};">2,400+</div>
                <div style="font-size:11px; color:{C.earthLight}; margin-top:1px;">focus sessions completed</div>
            </div>
            <div class="hidden sm:block w-px h-8" style="background:rgba(46,42,38,0.1);"></div>
            <div class="flex items-center gap-1.5">
                {#each [1,2,3,4,5] as _}
                    <Star class="w-3.5 h-3.5 fill-current" style="color:{C.amber};" />
                {/each}
                <span class="font-bold ml-1" style="font-size:14px; color:{C.charcoal};">4.8</span>
                <span style="font-size:11px; color:{C.earthLight}; margin-left:2px;">avg rating</span>
            </div>
            <div class="hidden sm:block w-px h-8" style="background:rgba(46,42,38,0.1);"></div>
            <div class="text-center">
                <div class="font-serif font-bold" style="font-size:26px; color:{C.charcoal};">87%</div>
                <div style="font-size:11px; color:{C.earthLight}; margin-top:1px;">plan completion rate</div>
            </div>
            <div class="hidden sm:block w-px h-8" style="background:rgba(46,42,38,0.1);"></div>
            <div class="flex items-center gap-2">
                <div class="w-5 h-5 rounded flex items-center justify-center text-xs" style="background:#E56327;">🏆</div>
                <span class="font-semibold" style="font-size:11px; color:{C.gray};">Product Hunt · Top App</span>
            </div>
        </div>
    </div>
</div>


<!-- ═══════════════════════════════════════════════════════════
     FEATURE A — Notes first
═══════════════════════════════════════════════════════════ -->
<section class="relative overflow-hidden py-28 px-6" style="background:{C.bg};" data-section="feat-notes">
    <!-- Ammonite spiral — top-right background decoration -->
    <canvas bind:this={fossilAmmoniteCanvas}
        class="absolute pointer-events-none hidden lg:block"
        style="top:-40px; right:-50px; width:280px; height:280px; opacity:0.18;"
        aria-hidden="true"></canvas>
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-notes')}">

            <!-- Text left -->
            <div>
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-8 uppercase tracking-wider"
                     style="background:rgba(200,136,74,0.1); color:{C.amberDark};">
                    <FileText class="w-3 h-3" /> Note-taking
                </div>
                <h2 class="font-serif font-bold leading-tight mb-5" style="font-size:clamp(34px,4.2vw,50px); color:{C.charcoal};">
                    Notes are the<br />foundation of everything.
                </h2>
                <p class="text-lg leading-relaxed mb-4" style="color:{C.earth}; font-family:'Nunito', sans-serif;">
                    Every plan, every blocked focus session, every scheduled task — it all starts as a note. Resin treats notes as the raw material for action, not just a filing cabinet.
                </p>
                <p class="leading-relaxed mb-8" style="font-size:15px; color:{C.earth}; font-family:'Lora', serif; font-style:italic; border-left:3px solid rgba(200,136,74,0.4); padding-left:16px; line-height:1.7;">
                    Write the messy version — the one with the excuses and the "I don't know where to start." That's exactly what the AI needs to build a plan that actually fits you.
                </p>
                <ul class="space-y-4 mb-10">
                    {#each [
                        ['Freeform writing, no structure required', 'Dump everything: brain dumps, voice memos, rough ideas, half-thoughts'],
                        ['Rich text + markdown + inline formatting', 'Bold, headers, lists — or just plain prose, whatever flows'],
                        ['Notes connect in a mind map', 'See how your ideas relate in an interactive 2D canvas'],
                        ['Every note is one tap from a plan', 'Activate any note → AI generates concrete tasks and schedules them'],
                        ['Write on any device, see it everywhere', 'iPhone, iPad, web — always in sync, always there'],
                    ] as [title, sub]}
                        <li class="flex gap-3.5 items-start">
                            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:rgba(200,136,74,0.12);">
                                <Check class="w-3 h-3" style="color:{C.amber};" />
                            </div>
                            <div>
                                <div class="font-semibold text-sm" style="color:{C.charcoal};">{title}</div>
                                <div class="text-xs mt-0.5" style="color:{C.earthLight};">{sub}</div>
                            </div>
                        </li>
                    {/each}
                </ul>
                <a href="/notes" class="inline-flex items-center gap-2 text-sm font-bold transition-colors group"
                   style="color:{C.forest};">
                    Open notes dashboard
                    <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
            </div>

            <!-- Note editor mockup right -->
            <div class="flex justify-center">
                <div class="relative w-full max-w-[420px]">
                    <!-- Main note editor card -->
                    <div class="rounded-xl overflow-hidden" style="background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 24px 60px -12px rgba(46,42,38,0.14);">
                        <!-- Editor toolbar -->
                        <div class="px-5 py-3 flex items-center justify-between" style="border-bottom:1px solid rgba(46,42,38,0.06); background:{C.bg};">
                            <div class="flex items-center gap-3">
                                <span class="font-semibold" style="font-size:11px; color:{C.earthLight};">All Notes</span>
                                <span style="color:{C.grayLight};">›</span>
                                <span class="font-serif font-semibold" style="font-size:12px; color:{C.charcoal};">Learn Spanish this month</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <Mic class="w-3.5 h-3.5" style="color:{C.earthLight};" />
                                <Link class="w-3.5 h-3.5" style="color:{C.earthLight};" />
                            </div>
                        </div>
                        <!-- Formatting bar -->
                        <div class="px-5 py-2 flex items-center gap-3" style="border-bottom:1px solid rgba(46,42,38,0.04); background:rgba(46,42,38,0.015);">
                            {#each ['B', 'I', 'H1', '—', '☑'] as fmt}
                                <span class="font-semibold cursor-pointer" style="font-size:10px; color:{C.earthLight}; padding:1px 4px; border-radius:3px;">{fmt}</span>
                            {/each}
                        </div>
                        <!-- Note body -->
                        <div class="px-5 py-4">
                            <div class="font-serif leading-relaxed mb-5 whitespace-pre-wrap" style="font-size:13.5px; color:{C.earth}; line-height:1.8;">I've been saying I'll learn Spanish for <span style="font-weight:700; color:{C.charcoal};">3 years</span>. Duolingo is on my phone — haven't opened in 9 months. My girlfriend speaks it and I feel left out at family dinners.

The real problem is I don't have a system. Maybe:
— 30 min every morning before coffee
— watch one Spanish show / week
— find a language exchange partner
— commit to a trip to Mexico City as the goal
</div>
                            <!-- Tags -->
                            <div class="flex flex-wrap gap-1.5 mb-5">
                                {#each ['Personal', 'Language', 'Self-growth'] as tag}
                                    <span class="rounded-md text-xs font-medium px-2.5 py-0.5" style="background:rgba(200,136,74,0.08); color:{C.amberDark};">{tag}</span>
                                {/each}
                            </div>
                            <!-- Activate bar -->
                            <div class="rounded-lg px-4 py-3.5 flex items-center justify-between" style="background:rgba(200,136,74,0.07); border:1px solid rgba(200,136,74,0.18);">
                                <div>
                                    <div class="font-semibold text-xs" style="color:{C.charcoal};">Ready to build a plan?</div>
                                    <div class="text-xs mt-0.5" style="color:{C.earthLight};">AI will structure this into weekly tasks</div>
                                </div>
                                <button class="rounded-xl font-bold text-xs text-white px-3.5 py-2" style="background:{C.amber}; white-space:nowrap;">
                                    ✨ Activate
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Floating mind map peek -->
                    <div class="absolute -right-6 -bottom-6 rounded-lg overflow-hidden" style="width:160px; background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 12px 32px -6px rgba(46,42,38,0.18); padding:12px;">
                        <div class="font-semibold mb-2" style="font-size:9px; color:{C.charcoal};">Mind Map · 5 notes</div>
                        <!-- SVG mini-map -->
                        <svg width="136" height="80" viewBox="0 0 136 80">
                            <line x1="68" y1="40" x2="20" y2="15" stroke="{C.amber}" stroke-width="1" stroke-opacity="0.4"/>
                            <line x1="68" y1="40" x2="116" y2="15" stroke="{C.amber}" stroke-width="1" stroke-opacity="0.4"/>
                            <line x1="68" y1="40" x2="20" y2="65" stroke="{C.forest}" stroke-width="1" stroke-opacity="0.4"/>
                            <line x1="68" y1="40" x2="116" y2="65" stroke="{C.forest}" stroke-width="1" stroke-opacity="0.4"/>
                            <circle cx="68" cy="40" r="9" fill="{C.amber}" opacity="0.9"/>
                            <circle cx="20" cy="15" r="6" fill="{C.bgTertiary}" stroke="{C.amber}" stroke-width="1.5"/>
                            <circle cx="116" cy="15" r="6" fill="{C.bgTertiary}" stroke="{C.forest}" stroke-width="1.5"/>
                            <circle cx="20" cy="65" r="6" fill="{C.bgTertiary}" stroke="{C.forest}" stroke-width="1.5"/>
                            <circle cx="116" cy="65" r="6" fill="{C.bgTertiary}" stroke="{C.amber}" stroke-width="1.5"/>
                            <text x="68" y="43.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold">✦</text>
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     FEATURE B — AI Planning (warm bg)
═══════════════════════════════════════════════════════════ -->
<section class="relative overflow-hidden py-28 px-6" style="background:{C.bgSecondary};" data-section="feat-plan">
    <!-- Trilobite — bottom-left background decoration -->
    <canvas bind:this={fossilTrilobiteCanvas}
        class="absolute pointer-events-none hidden lg:block"
        style="bottom:-50px; left:-40px; width:260px; height:260px; opacity:0.16;"
        aria-hidden="true"></canvas>
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-plan')}">

            <!-- Phone mockup left -->
            <div class="flex justify-center order-2 lg:order-1">
                <div class="relative">
                    <div class="overflow-hidden shadow-[0_32px_72px_-16px_rgba(46,42,38,0.3)]"
                         style="width:292px; min-height:560px; border-radius:46px; border:10px solid {C.charcoal}; background:white;">
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 z-10 rounded-b-2xl" style="width:100px; height:24px; background:{C.charcoal};"></div>
                        <div class="flex flex-col" style="min-height:560px; background:white;">
                            <div class="h-7"></div>
                            <!-- Plan header with amber gradient -->
                            <div class="px-5 pt-5 pb-4" style="background:linear-gradient(135deg, rgba(200,136,74,0.14) 0%, rgba(200,136,74,0.03) 100%);">
                                <div class="flex items-start justify-between mb-2">
                                    <div>
                                        <div class="font-serif font-semibold" style="font-size:13px; color:{C.charcoal}; line-height:1.3;">Learn Spanish this month</div>
                                        <div style="font-size:9px; color:{C.earthLight}; margin-top:3px;">6 tasks · 3h 45min total</div>
                                    </div>
                                    <span class="font-bold rounded-md" style="font-size:8px; color:white; background:{C.amber}; padding:2px 7px;">AI Plan</span>
                                </div>
                                <div class="flex gap-1.5">
                                    <span class="rounded-full" style="font-size:8.5px; color:{C.forestDark}; background:rgba(77,102,82,0.1); padding:2px 7px;">Starts Mon 7am</span>
                                    <span class="rounded-full" style="font-size:8.5px; color:{C.amberDark}; background:rgba(200,136,74,0.1); padding:2px 7px;">Daily recurring</span>
                                </div>
                            </div>
                            <!-- Tasks -->
                            <div class="px-4 py-4 space-y-3 flex-1">
                                {#each [
                                    ['Morning vocab: 15 new words', '15m', 'Daily — before coffee'],
                                    ['Duolingo lesson', '20m', 'Daily — after breakfast'],
                                    ['Language exchange session', '30m', 'Wed & Sat — find partner on Tandem'],
                                    ['Watch one ep La Casa de Papel', '45m', 'Weekends — subtitles in Spanish'],
                                    ['Conversation practice journal', '20m', 'Daily — write 5 sentences'],
                                    ['Book Mexico City trip', '15m', 'This week — sets the deadline'],
                                ] as [task, time, note], i}
                                    <div class="flex gap-2.5 items-start">
                                        <div class="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white mt-0.5" style="width:18px; height:18px; min-width:18px; background:{C.amber}; font-size:8px;">{i+1}</div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-baseline justify-between gap-2">
                                                <span class="font-semibold leading-tight" style="font-size:10px; color:{C.charcoal};">{task}</span>
                                                <span class="font-mono flex-shrink-0" style="font-size:9px; color:{C.earthLight};">{time}</span>
                                            </div>
                                            <div style="font-size:8.5px; color:{C.earth}; opacity:0.6; margin-top:1px; line-height:1.3;">{note}</div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                            <!-- CTA -->
                            <div class="px-4 pb-4 pt-2" style="border-top:1px solid rgba(200,136,74,0.15);">
                                <div class="w-full text-center rounded-xl font-bold text-white" style="background:{C.forestDark}; font-size:10px; padding:10px;">
                                    Schedule All Tasks →
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Speed badge -->
                    <div class="absolute -left-8 top-1/3 rounded-xl px-3 py-2.5" style="background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 6px 20px -4px rgba(46,42,38,0.15);">
                        <div style="font-size:9px; font-weight:700; color:{C.charcoal};">Generated in</div>
                        <div class="font-serif font-bold" style="font-size:18px; color:{C.charcoal};">8.4s</div>
                        <div style="font-size:8px; color:{C.forest}; font-weight:600;">on your iPhone</div>
                    </div>
                </div>
            </div>

            <!-- Text right -->
            <div class="order-1 lg:order-2">
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-8 uppercase tracking-wider"
                     style="background:rgba(77,102,82,0.1); color:{C.forestDark};">
                    <Brain class="w-3 h-3" /> On-Device AI
                </div>
                <h2 class="font-serif font-bold leading-tight mb-6" style="font-size:clamp(34px,4.2vw,50px); color:{C.charcoal};">
                    AI that reads your<br />actual thoughts.
                </h2>
                <p class="text-lg leading-relaxed mb-8" style="color:{C.earth};">
                    Not a template, not a wizard. Resin reads your note — the real version, with the excuses and context — and generates an honest, specific, granular plan. Powered by on-device models that run in seconds with no internet required.
                </p>
                <ul class="space-y-4 mb-10">
                    {#each [
                        ['Understands messy, emotional writing', 'Context, resistance, and goals — not just keywords'],
                        ['Concrete micro-steps, not vague goals', '"Write 5 sentences" not "practice Spanish"'],
                        ['Time estimates for every task', 'So you know how long your day actually needs'],
                        ['Learns your pace over time', 'Rate sessions → AI adapts to how you actually work'],
                    ] as [title, sub]}
                        <li class="flex gap-3.5 items-start">
                            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:rgba(77,102,82,0.1);">
                                <Check class="w-3 h-3" style="color:{C.forest};" />
                            </div>
                            <div>
                                <div class="font-semibold text-sm" style="color:{C.charcoal};">{title}</div>
                                <div class="text-xs mt-0.5" style="color:{C.earthLight};">{sub}</div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     FEATURE C — App Blocking
═══════════════════════════════════════════════════════════ -->
<section class="relative overflow-hidden py-28 px-6" style="background:{C.bg};" data-section="feat-block">
    <!-- T-Rex skull — bottom-right background decoration -->
    <canvas bind:this={fossilTrexCanvas}
        class="absolute pointer-events-none hidden lg:block"
        style="bottom:-60px; right:-30px; width:310px; height:280px; opacity:0.14;"
        aria-hidden="true"></canvas>
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-block')}">

            <!-- Text left -->
            <div>
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-8 uppercase tracking-wider"
                     style="background:rgba(46,42,38,0.07); color:{C.charcoal};">
                    <Lock class="w-3 h-3" /> App Blocking
                </div>
                <h2 class="font-serif font-bold leading-tight mb-6" style="font-size:clamp(34px,4.2vw,50px); color:{C.charcoal};">
                    Focus mode with<br />actual teeth.
                </h2>
                <p class="text-lg leading-relaxed mb-8" style="color:{C.earth};">
                    Most focus apps grow a tree. Resin uses Apple's Screen Time API to make your distraction apps completely inaccessible. Not a reminder. Not a timer. Instagram just doesn't open until your session ends.
                </p>
                <ul class="space-y-4 mb-10">
                    {#each [
                        ['OS-level via FamilyControls API', 'Apps disappear — no override, no workaround, no 5-minute bypass'],
                        ['Blocks across iPhone, iPad, and Mac', 'All Apple devices simultaneously, from one session'],
                        ['Starts exactly when your task does', 'Auto-synced to your plan schedule'],
                        ['Unlocks automatically when done', 'No manual off — ends with the session'],
                    ] as [title, sub]}
                        <li class="flex gap-3.5 items-start">
                            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:rgba(46,42,38,0.07);">
                                <Check class="w-3 h-3" style="color:{C.charcoal};" />
                            </div>
                            <div>
                                <div class="font-semibold text-sm" style="color:{C.charcoal};">{title}</div>
                                <div class="text-xs mt-0.5" style="color:{C.earthLight};">{sub}</div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Dark focus screen mockup right -->
            <div class="flex justify-center">
                <div class="relative">
                    <div class="overflow-hidden shadow-[0_40px_80px_-20px_rgba(46,42,38,0.42)]"
                         style="width:282px; min-height:546px; border-radius:44px; border:10px solid #111; background:#111;">
                        <div class="absolute top-0 left-1/2 -translate-x-1/2 z-10 rounded-b-2xl" style="width:96px; height:24px; background:#111;"></div>
                        <div class="flex flex-col items-center" style="min-height:546px; background:linear-gradient(160deg, #1C2A1F 0%, #0E1710 100%);">
                            <div class="h-7"></div>
                            <div class="w-full px-5 pt-4 pb-2 text-center">
                                <div class="font-semibold uppercase tracking-widest" style="font-size:9.5px; color:rgba(232,168,87,0.65);">Focus in progress</div>
                            </div>
                            <div class="flex-1 flex flex-col items-center justify-center px-5 py-4 w-full">
                                <!-- Tree -->
                                <div class="text-6xl mb-5" style="filter:drop-shadow(0 0 20px rgba(232,168,87,0.45));">🌲</div>
                                <div class="font-serif font-semibold text-white mb-1" style="font-size:15px;">Learn Spanish</div>
                                <div class="mb-6" style="font-size:11px; color:rgba(255,255,255,0.35);">Morning vocab · 15 min</div>
                                <!-- Timer -->
                                <div class="rounded-lg px-10 py-4 mb-5 w-full text-center" style="background:rgba(255,255,255,0.06);">
                                    <div class="uppercase tracking-wider mb-1" style="font-size:9px; color:rgba(255,255,255,0.28);">Time remaining</div>
                                    <div class="font-mono font-bold" style="font-size:38px; color:{C.amberGlow};">11:23</div>
                                </div>
                                <!-- Blocked apps -->
                                <div class="w-full space-y-2">
                                    {#each [['YouTube', '🎥'], ['Instagram', '📸'], ['Reddit', '🔴']] as [app, emoji]}
                                        <div class="flex items-center justify-between px-3 py-2 rounded-xl" style="background:rgba(255,255,255,0.04);">
                                            <div class="flex items-center gap-2">
                                                <span style="font-size:13px;">{emoji}</span>
                                                <span style="font-size:10px; font-weight:500; color:rgba(255,255,255,0.35);">{app}</span>
                                            </div>
                                            <span class="font-bold rounded-md" style="font-size:7.5px; color:rgba(232,168,87,0.7); background:rgba(232,168,87,0.12); padding:1px 6px;">BLOCKED</span>
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- OS label -->
                    <div class="absolute -left-10 top-1/2 -translate-y-1/2 rounded-xl px-3 py-2.5" style="background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 6px 20px -4px rgba(46,42,38,0.15);">
                        <div class="font-bold" style="font-size:9px; color:{C.charcoal};">Screen Time</div>
                        <div style="font-size:8px; color:{C.earthLight};">OS-level · no override</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     FEATURE D — Chrome Extension
═══════════════════════════════════════════════════════════ -->
<section class="py-28 px-6" style="background:{C.bgSecondary};" data-section="feat-ext">
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-ext')}">

            <!-- Browser mockup left -->
            <div class="flex justify-center order-2 lg:order-1">
                <div class="w-full max-w-[460px]">
                    <div class="rounded-t-xl overflow-hidden flex items-center gap-3 px-4 py-2.5" style="background:{C.bgTertiary}; border:1px solid rgba(46,42,38,0.1); border-bottom:none;">
                        <div class="flex gap-1.5">
                            <div class="w-3 h-3 rounded-full" style="background:#FF5F56;"></div>
                            <div class="w-3 h-3 rounded-full" style="background:#FEBC2E;"></div>
                            <div class="w-3 h-3 rounded-full" style="background:#27C93F;"></div>
                        </div>
                        <div class="flex-1 flex items-center gap-2 rounded-lg px-3 py-1.5" style="background:white; border:1px solid rgba(46,42,38,0.08);">
                            <div class="w-2.5 h-2.5 rounded-full" style="background:rgba(46,42,38,0.15);"></div>
                            <span style="font-size:11px; color:{C.earthLight}; flex:1;">youtube.com/watch?v=...</span>
                            <div class="rounded flex items-center justify-center font-bold" style="width:18px; height:18px; background:{C.amber}; font-size:8px; color:white;">R</div>
                        </div>
                    </div>
                    <!-- Focus page -->
                    <div class="rounded-b-xl overflow-hidden" style="background:linear-gradient(160deg, #1A2B1F 0%, #0F1B13 100%); border:1px solid rgba(46,42,38,0.1); border-top:none; min-height:320px;">
                        <div class="flex flex-col items-center justify-center py-14 px-8 text-center">
                            <div class="text-5xl mb-5" style="filter:drop-shadow(0 0 16px rgba(232,168,87,0.5));">🌲</div>
                            <div class="font-serif font-semibold mb-1" style="color:rgba(255,255,255,0.9); font-size:15px;">YouTube is blocked</div>
                            <div class="mb-8" style="font-size:11px; color:rgba(255,255,255,0.3);">You're in a Resin focus session</div>
                            <div class="rounded-lg px-6 py-4 mb-8 w-full max-w-xs" style="background:rgba(255,255,255,0.05);">
                                <div class="uppercase tracking-wider mb-1.5" style="font-size:8.5px; color:rgba(255,255,255,0.25);">Current task</div>
                                <div class="font-serif font-medium" style="font-size:13px; color:rgba(255,255,255,0.85);">Morning vocab: 15 new words</div>
                                <div style="font-size:10px; margin-top:3px; color:rgba(232,168,87,0.65);">15 min · task 1 of 6</div>
                            </div>
                            <p class="italic" style="font-size:11px; color:rgba(255,255,255,0.25); max-width:280px; line-height:1.6;">"Focus is deciding what you're not going to do." — Steve Jobs</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Text right -->
            <div class="order-1 lg:order-2">
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-8 uppercase tracking-wider"
                     style="background:rgba(77,102,82,0.1); color:{C.forestDark};">
                    <Globe class="w-3 h-3" /> Chrome Extension
                </div>
                <h2 class="font-serif font-bold leading-tight mb-6" style="font-size:clamp(34px,4.2vw,50px); color:{C.charcoal};">
                    Blocks your browser<br />too.
                </h2>
                <p class="text-lg leading-relaxed mb-8" style="color:{C.earth};">
                    App blocking covers your phone. The Resin Chrome extension covers your laptop. During an active session, blocked sites are replaced with a focus page showing your current task. Syncs automatically — no manual toggling.
                </p>
                <ul class="space-y-4 mb-10">
                    {#each [
                        ['Auto-syncs with active sessions', 'Blocking starts and ends with your plan — automatically'],
                        ['Block any URL', 'YouTube, Reddit, Twitter, Hacker News, or custom domains'],
                        ['Shows your current task', 'The focus page reminds you what you\'re supposed to be doing'],
                        ['Phone + browser blocked together', 'Zero escape routes — both devices at once'],
                    ] as [title, sub]}
                        <li class="flex gap-3.5 items-start">
                            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:rgba(77,102,82,0.1);">
                                <Check class="w-3 h-3" style="color:{C.forest};" />
                            </div>
                            <div>
                                <div class="font-semibold text-sm" style="color:{C.charcoal};">{title}</div>
                                <div class="text-xs mt-0.5" style="color:{C.earthLight};">{sub}</div>
                            </div>
                        </li>
                    {/each}
                </ul>
                <a href="/extension-settings" class="inline-flex items-center gap-2 text-sm font-bold transition-colors group" style="color:{C.forest};">
                    Set up the extension
                    <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
            </div>
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     3-COL MINI GRID
═══════════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bg};" data-section="grid">
    <div class="max-w-6xl mx-auto transition-all duration-700 {visible('grid')}">
        <div class="text-center mb-14">
            <p class="text-xs font-bold uppercase tracking-widest mb-4" style="color:{C.amber};">The complete system</p>
            <h2 class="font-serif font-bold" style="font-size:clamp(30px,3.5vw,42px); color:{C.charcoal};">Everything works together.</h2>
        </div>
        <div class="grid md:grid-cols-3 gap-6">
            {#each [
                { icon: FileText, color: C.amber, bg: `rgba(200,136,74,0.09)`, title: 'Capture everything', desc: 'Write anything — voice memos, quick thoughts, full brain dumps. Resin holds it all and makes it actionable when you\'re ready.', bullets: ['Rich text and voice input', 'Instant sync across devices', 'Mind map connections'] },
                { icon: Shield, color: C.charcoal, bg: `rgba(46,42,38,0.07)`, title: 'Block everything', desc: 'iOS Screen Time + Chrome extension working in parallel. When you\'re in a session, every distraction is just gone.', bullets: ['OS-level app blocking', 'Chrome URL blocking', 'Auto-synced to plan'] },
                { icon: TrendingUp, color: C.forest, bg: `rgba(77,102,82,0.09)`, title: 'Grow over time', desc: 'Post-session ratings teach the AI your real pace and resistance patterns. Plans get sharper. Your forest grows. Streaks compound.', bullets: ['Per-session reflection', 'Tree forest & streak tracking', 'AI adapts to your style'] }
            ] as f}
                <div class="rounded-xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-500 group" style="background:white; border:1px solid rgba(46,42,38,0.06);">
                    <div class="w-12 h-12 rounded-lg flex items-center justify-center mb-6 group-hover:scale-105 transition-transform" style="background:{f.bg};">
                        <f.icon class="w-5 h-5" style="color:{f.color};" />
                    </div>
                    <h3 class="font-serif font-bold mb-3 text-xl" style="color:{C.charcoal};">{f.title}</h3>
                    <p class="text-sm leading-relaxed mb-5" style="color:{C.earth}; opacity:0.8;">{f.desc}</p>
                    <div class="space-y-2">
                        {#each f.bullets as b}
                            <div class="flex items-center gap-2 text-xs" style="color:{C.earthLight};">
                                <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:{f.color}; opacity:0.5;"></div>
                                {b}
                            </div>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     FEATURE E — Calendar Sync
═══════════════════════════════════════════════════════════ -->
<section class="py-28 px-6" style="background:{C.bgSecondary};" data-section="feat-cal">
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-cal')}">
            <!-- Text left -->
            <div>
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-8 uppercase tracking-wider"
                     style="background:rgba(200,136,74,0.1); color:{C.amberDark};">
                    <Calendar class="w-3 h-3" /> Calendar Sync
                </div>
                <h2 class="font-serif font-bold leading-tight mb-6" style="font-size:clamp(34px,4.2vw,50px); color:{C.charcoal};">
                    Your calendar plans<br />itself.
                </h2>
                <p class="text-lg leading-relaxed mb-8" style="color:{C.earth};">
                    When you activate a plan, Resin creates real calendar events for every task — in Google Calendar and Apple Calendar. No copy-pasting, no manual scheduling. Drag to reschedule tasks in the web dashboard.
                </p>
                <ul class="space-y-4">
                    {#each [
                        ['Google & Apple Calendar', 'Events appear automatically the moment you activate a plan'],
                        ['Drag-to-reschedule on web', 'Move tasks between times with a drag in the web dashboard'],
                        ['Focus blocks, not just reminders', 'Actual held time — not a notification you dismiss'],
                        ['Finds open slots automatically', 'Schedules around your existing commitments'],
                    ] as [title, sub]}
                        <li class="flex gap-3.5 items-start">
                            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:rgba(200,136,74,0.12);">
                                <Check class="w-3 h-3" style="color:{C.amber};" />
                            </div>
                            <div>
                                <div class="font-semibold text-sm" style="color:{C.charcoal};">{title}</div>
                                <div class="text-xs mt-0.5" style="color:{C.earthLight};">{sub}</div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>
            <!-- Calendar mockup right -->
            <div class="flex justify-center">
                <div class="w-full max-w-[380px] rounded-xl overflow-hidden" style="background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 24px 56px -12px rgba(46,42,38,0.14);">
                    <div class="px-5 py-4" style="border-bottom:1px solid rgba(46,42,38,0.06);">
                        <div class="flex items-center justify-between">
                            <div class="font-serif font-semibold" style="font-size:14px; color:{C.charcoal};">Thursday, Apr 17</div>
                            <span class="font-bold rounded-md text-white" style="font-size:9px; background:{C.amber}; padding:2px 8px;">Today</span>
                        </div>
                    </div>
                    <div class="p-4 space-y-2">
                        {#each [
                            ['7:00', '7:15', 'Morning vocab · Resin', C.amber, true],
                            ['7:15', '7:35', 'Duolingo lesson · Resin', C.amber, true],
                            ['9:00', '10:00', 'Team standup + email', 'rgba(46,42,38,0.2)', false],
                            ['14:00', '15:30', 'Language exchange session', C.forest, true],
                            ['17:00', '18:00', 'La Casa de Papel (ep 3)', C.forestDark, true],
                            ['20:00', '20:20', 'Conversation journal', C.amber, true],
                        ] as [start, end, label, color, isResin]}
                            <div class="flex gap-3 items-start">
                                <div class="font-mono flex-shrink-0 pt-0.5" style="font-size:9px; color:{C.earthLight}; width:32px;">{start}</div>
                                <div class="flex-1 rounded-xl px-3 py-2 {isResin ? '' : 'opacity-40'}"
                                     style="border-left:3px solid {color}; background:{isResin ? `${color}14` : `rgba(46,42,38,0.04)`};">
                                    <div class="font-medium leading-tight" style="font-size:10px; color:{C.charcoal};">{label}</div>
                                    <div style="font-size:8.5px; color:{C.earthLight}; margin-top:1px;">{start}–{end}</div>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     FEATURE F — Forest & Progress
═══════════════════════════════════════════════════════════ -->
<section class="py-28 px-6" style="background:{C.bg};" data-section="feat-forest">
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-forest')}">
            <!-- Text left -->
            <div>
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-8 uppercase tracking-wider"
                     style="background:rgba(77,102,82,0.1); color:{C.forestDark};">
                    <TrendingUp class="w-3 h-3" /> Progress & Reflection
                </div>
                <h2 class="font-serif font-bold leading-tight mb-6" style="font-size:clamp(34px,4.2vw,50px); color:{C.charcoal};">
                    Watch your focus<br />compound.
                </h2>
                <p class="text-lg leading-relaxed mb-8" style="color:{C.earth};">
                    After each session, Resin asks how it went. Your feedback trains the AI on your real pace, energy, and resistance patterns. Plans get sharper. Your forest grows. The streak builds into something you're proud of.
                </p>
                <ul class="space-y-4">
                    {#each [
                        ['Post-session reflection', 'Quick ratings that train AI to plan better for you'],
                        ['Your forest of completed work', 'Every finished task grows a tree in your personal forest'],
                        ['Streak tracking & rewards', 'Daily momentum, visualized — with unlockable tree species'],
                        ['Session insights', 'Understand when you focus best and why plans succeed or slip'],
                    ] as [title, sub]}
                        <li class="flex gap-3.5 items-start">
                            <div class="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style="background:rgba(77,102,82,0.1);">
                                <Check class="w-3 h-3" style="color:{C.forest};" />
                            </div>
                            <div>
                                <div class="font-semibold text-sm" style="color:{C.charcoal};">{title}</div>
                                <div class="text-xs mt-0.5" style="color:{C.earthLight};">{sub}</div>
                            </div>
                        </li>
                    {/each}
                </ul>
            </div>
            <!-- Forest phone right -->
            <div class="flex justify-center">
                <div class="overflow-hidden shadow-[0_32px_64px_-16px_rgba(46,42,38,0.22)]"
                     style="width:282px; min-height:546px; border-radius:44px; border:10px solid {C.charcoal}; background:{C.bg};">
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 z-10 rounded-b-2xl" style="width:96px; height:24px; background:{C.charcoal};"></div>
                    <div class="flex flex-col" style="min-height:546px; background:{C.bg};">
                        <div class="h-7"></div>
                        <div class="px-5 pt-5 pb-3 flex items-center justify-between" style="border-bottom:1px solid rgba(46,42,38,0.06);">
                            <div>
                                <div class="font-serif font-semibold" style="font-size:14px; color:{C.charcoal};">Your Forest</div>
                                <div style="font-size:9px; color:{C.earthLight}; margin-top:1px;">14-day streak 🔥</div>
                            </div>
                            <div class="text-right">
                                <div class="font-serif font-bold" style="font-size:18px; color:{C.charcoal};">28</div>
                                <div style="font-size:8px; color:{C.earthLight};">sessions</div>
                            </div>
                        </div>
                        <!-- Forest grid -->
                        <div class="px-5 py-4">
                            <div class="grid gap-1.5 mb-4" style="grid-template-columns: repeat(6, 1fr);">
                                {#each ['🌲','🌲','🌲','🌲','🌳','🌲','🌳','🌲','🌲','🌲','🌲','🌳','🌲','🌲','🌲','🌲','🌲','🌲','🌳','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲','🌲'] as tree}
                                    <div class="flex items-center justify-center rounded-lg" style="height:28px; font-size:14px; background:rgba(77,102,82,0.07);">{tree}</div>
                                {/each}
                            </div>
                            <div class="grid grid-cols-2 gap-2 mb-3">
                                {#each [['87%', 'plans completed', C.charcoal], ['38h', 'deep focus time', C.amber]] as [val, label, color]}
                                    <div class="rounded-xl p-3 text-center" style="background:white; border:1px solid rgba(46,42,38,0.06);">
                                        <div class="font-serif font-bold" style="font-size:18px; color:{color};">{val}</div>
                                        <div style="font-size:8px; color:{C.earthLight};">{label}</div>
                                    </div>
                                {/each}
                            </div>
                            <!-- Weekly bars -->
                            <div class="rounded-xl p-3" style="background:white; border:1px solid rgba(46,42,38,0.06);">
                                <div style="font-size:9px; color:{C.earthLight}; margin-bottom:8px;">This week</div>
                                <div class="flex items-end gap-1" style="height:40px;">
                                    {#each [0.5, 0.8, 0.6, 1.0, 0.7, 0.9, 0.4] as h, i}
                                        <div class="flex-1 rounded-sm" style="height:{h*100}%; background:{i === 3 ? C.amber : C.forest}; opacity:{i === 3 ? 1 : 0.22};"></div>
                                    {/each}
                                </div>
                                <div class="flex justify-between mt-1">
                                    {#each ['M','T','W','T','F','S','S'] as d}
                                        <div class="flex-1 text-center" style="font-size:7px; color:{C.earthLight};">{d}</div>
                                    {/each}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     2e IDENTITY SECTION
═══════════════════════════════════════════════════════════ -->
<section class="relative py-24 px-6 overflow-hidden" style="background:{C.bg};" data-section="twoE">
    <!-- Dino footprint — left-center background decoration -->
    <canvas bind:this={fossilFootprintCanvas}
        class="absolute pointer-events-none hidden lg:block"
        style="top:50%; left:-30px; transform:translateY(-50%); width:200px; height:220px; opacity:0.15;"
        aria-hidden="true"></canvas>
    <div class="max-w-5xl mx-auto transition-all duration-700 {visible('twoE')}">

        <!-- Header -->
        <div class="text-center mb-14">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-bold mb-7 uppercase tracking-wider"
                 style="background:rgba(200,136,74,0.1); color:{C.amberDark};">
                <Brain class="w-3 h-3" /> Built for 2e minds
            </div>
            <h2 class="font-serif font-bold leading-tight mb-5" style="font-size:clamp(30px,3.8vw,46px); color:{C.charcoal};">
                Your brain moves fast.<br />The tools should keep up.
            </h2>
            <p class="max-w-xl mx-auto leading-relaxed" style="font-size:17px; color:{C.earth}; line-height:1.8;">
                Resin is designed for twice-exceptional people — gifted minds who also live with ADHD, autism, dyslexia, or sensory differences. High horsepower, hard to start. Resin is built for that exact gap.
            </p>
        </div>

        <!-- 3-col trait cards -->
        <div class="grid md:grid-cols-3 gap-5 mb-14">
            {#each [
                {
                    icon: Brain,
                    color: C.amber,
                    bg: 'rgba(200,136,74,0.08)',
                    title: 'Working memory relief',
                    body: 'The brain dump is a pressure valve. Get it out of your head and onto the screen — then let AI sort it into steps your brain can actually start.'
                },
                {
                    icon: Zap,
                    color: C.forest,
                    bg: 'rgba(77,102,82,0.08)',
                    title: 'Task initiation, solved',
                    body: 'Knowing what to do and starting are two different neurological events. Resin breaks tasks small enough that the first step feels possible.'
                },
                {
                    icon: Lock,
                    color: C.amberDark,
                    bg: 'rgba(160,102,58,0.08)',
                    title: 'No willpower required',
                    body: 'OS-level blocking removes impulsive escape routes entirely. Your phone can\'t distract you because the apps aren\'t there. No override.'
                }
            ] as card}
                <div class="rounded-2xl p-7" style="background:white; border:1px solid rgba(46,42,38,0.06);">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style="background:{card.bg};">
                        <card.icon class="w-4.5 h-4.5" style="color:{card.color};" />
                    </div>
                    <h3 class="font-serif font-bold mb-3" style="font-size:17px; color:{C.charcoal};">{card.title}</h3>
                    <p class="text-sm leading-relaxed" style="color:{C.earth}; opacity:0.85;">{card.body}</p>
                </div>
            {/each}
        </div>

        <!-- Quiet pull quote -->
        <div class="rounded-2xl px-8 py-7 text-center" style="background:rgba(200,136,74,0.06); border:1px solid rgba(200,136,74,0.12); max-width:680px; margin:0 auto;">
            <p class="font-serif leading-relaxed mb-3" style="font-size:18px; color:{C.charcoal}; font-style:italic;">
                "Most productivity systems assume you think like a neurotypical person. This doesn't."
            </p>
            <p class="text-xs font-semibold uppercase tracking-wider" style="color:{C.earthLight};">— Morgan A., AuDHD · Software Engineer</p>
        </div>

    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     TESTIMONIALS
═══════════════════════════════════════════════════════════ -->
<section class="py-28 px-6" style="background:{C.bgSecondary};" data-section="testimonials">
    <div class="max-w-7xl mx-auto transition-all duration-700 {visible('testimonials')}">
        <div class="text-center mb-16">
            <p class="text-xs font-bold uppercase tracking-widest mb-4" style="color:{C.amber};">Real users</p>
            <h2 class="font-serif font-bold leading-tight" style="font-size:clamp(32px,4vw,52px); color:{C.charcoal};">
                The planner people<br />don't quit.
            </h2>
        </div>
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each testimonials as t}
                <div class="rounded-xl p-7 hover:shadow-md transition-shadow duration-300" style="background:white; border:1px solid rgba(46,42,38,0.06);">
                    <div class="flex gap-0.5 mb-5">
                        {#each [1,2,3,4,5] as _}
                            <Star class="w-3.5 h-3.5 fill-current" style="color:{C.amber};" />
                        {/each}
                    </div>
                    <p class="leading-relaxed mb-6" style="font-size:15px; color:{C.charcoal};">"{t.quote}"</p>
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full flex items-center justify-center font-serif font-bold text-white flex-shrink-0"
                             style="background:linear-gradient(135deg, {C.amber}, {C.forestDark}); font-size:14px;">
                            {t.name.charAt(0)}
                        </div>
                        <div>
                            <div class="font-semibold text-sm" style="color:{C.charcoal};">{t.name}</div>
                            <div class="text-xs" style="color:{C.earthLight};">{t.role}</div>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     PRICING
═══════════════════════════════════════════════════════════ -->
<section class="py-28 px-6" style="background:{C.bg};" data-section="pricing">
    <div class="max-w-5xl mx-auto transition-all duration-700 {visible('pricing')}">
        <div class="text-center mb-16">
            <p class="text-xs font-bold uppercase tracking-widest mb-4" style="color:{C.amber};">Pricing</p>
            <h2 class="font-serif font-bold mb-5" style="font-size:clamp(32px,4vw,52px); color:{C.charcoal};">
                Free on device.<br />Powerful in the cloud.
            </h2>
            <p class="text-lg leading-relaxed max-w-xl mx-auto" style="color:{C.earth};">
                On-device AI means no cloud compute costs — and no subscription required for the core iOS experience.
            </p>
        </div>
        <div class="grid md:grid-cols-2 gap-8 items-start">
            <!-- Free tier -->
            <div class="rounded-xl p-10" style="background:{C.bgSecondary}; border:2px solid rgba(46,42,38,0.1);">
                <div class="text-xs font-bold uppercase tracking-wider mb-4" style="color:{C.earthLight};">Core — iOS App</div>
                <div class="flex items-baseline gap-1 mb-3">
                    <span class="font-serif font-bold" style="font-size:52px; color:{C.charcoal};">$0</span>
                    <span class="font-medium" style="color:{C.earthLight};">/forever</span>
                </div>
                <p class="text-sm mb-8 leading-relaxed" style="color:{C.earth};">Everything you need to capture, plan, and execute — on your device, privately, always free.</p>
                <div class="space-y-3.5 mb-10">
                    {#each [
                        'Unlimited on-device AI planning',
                        'Note-taking with voice & rich text',
                        'OS-level app blocking via Screen Time',
                        'Google & Apple Calendar integration',
                        'Focus session tracking & streak',
                        'Post-session reflection & AI learning',
                        'Mind map for notes (iOS)',
                    ] as item}
                        <div class="flex items-start gap-3">
                            <Check class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:{C.forest};" />
                            <span class="text-sm" style="color:{C.charcoal};">{item}</span>
                        </div>
                    {/each}
                </div>
                <a href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer"
                   class="block w-full py-4 rounded-lg text-center font-bold text-sm transition-colors"
                   style="border:2px solid rgba(46,42,38,0.18); color:{C.charcoal};">
                    Download Beta
                </a>
            </div>
            <!-- Pro tier -->
            <div class="rounded-xl p-10 relative" style="background:{C.forestDark}; border:2px solid rgba(255,255,255,0.07); box-shadow:0 24px 48px -12px rgba(200,136,74,0.2);">
                <div class="absolute -top-3 right-8 px-4 py-1 rounded-full font-bold text-white" style="font-size:11px; background:{C.amber};">Most Popular</div>
                <div class="text-xs font-bold uppercase tracking-wider mb-4" style="color:rgba(255,255,255,0.35);">Resin Pro</div>
                <div class="flex items-baseline gap-1 mb-3">
                    <span class="font-serif font-bold text-white" style="font-size:52px;">$8</span>
                    <span class="font-medium" style="color:rgba(255,255,255,0.35);">/month</span>
                </div>
                <p class="text-sm mb-8 leading-relaxed" style="color:rgba(255,255,255,0.5);">The full system for people who do serious work at a laptop.</p>
                <div class="space-y-3.5 mb-10">
                    {#each [
                        'Everything in the free iOS app',
                        'Web dashboard for notes & planning',
                        'Chrome extension for website blocking',
                        'Real-time cloud sync across all devices',
                        'Mind map for visual note connections',
                        'Collaborative focus groups with friends',
                        'Advanced analytics & session history',
                    ] as item}
                        <div class="flex items-start gap-3">
                            <Check class="w-4 h-4 flex-shrink-0 mt-0.5" style="color:{C.amberGlow};" />
                            <span class="text-sm" style="color:rgba(255,255,255,0.75);">{item}</span>
                        </div>
                    {/each}
                </div>
                <a href="/login?next=/" class="block w-full py-4 rounded-lg text-center font-bold text-sm transition-all hover:opacity-90"
                   style="background:{C.amber}; color:{C.charcoal};">
                    Start Free Trial
                </a>
            </div>
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     FAQ
═══════════════════════════════════════════════════════════ -->
<section class="py-24 px-6" style="background:{C.bgSecondary};" data-section="faq">
    <div class="max-w-2xl mx-auto transition-all duration-700 {visible('faq')}">
        <div class="text-center mb-14">
            <h2 class="font-serif font-bold" style="font-size:clamp(30px,3.5vw,44px); color:{C.charcoal};">Common questions</h2>
        </div>
        <div class="space-y-3">
            {#each faqs as faq, i}
                <div class="rounded-lg overflow-hidden transition-all duration-300" style="background:white; border:1px solid rgba(46,42,38,0.06);">
                    <button onclick={() => toggleFaq(i)}
                            class="w-full flex items-center justify-between px-6 py-5 text-left transition-colors"
                            style="color:{C.charcoal};">
                        <span class="font-semibold pr-4 text-sm leading-relaxed" style="color:{C.charcoal};">{faq.q}</span>
                        <ChevronDown class="w-4 h-4 flex-shrink-0 transition-transform duration-300 {openFaq === i ? 'rotate-180' : ''}" style="color:{C.earthLight};" />
                    </button>
                    {#if openFaq === i}
                        <div class="px-6 pb-6 text-sm leading-relaxed pt-4" style="border-top:1px solid rgba(46,42,38,0.05); color:{C.earth};">
                            {faq.a}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</section>


<!-- ═══════════════════════════════════════════════════════════
     FINAL CTA
═══════════════════════════════════════════════════════════ -->
<section class="relative overflow-hidden py-28 px-6" style="background:{C.bg};" data-section="cta">
    <!-- Ammonite brush — large centered background watermark -->
    <canvas bind:this={fossilCtaCanvas}
        class="absolute pointer-events-none hidden lg:block"
        style="top:50%; left:50%; transform:translate(-50%,-50%); width:420px; height:420px; opacity:0.1;"
        aria-hidden="true"></canvas>
    <div class="max-w-3xl mx-auto text-center transition-all duration-700 {visible('cta')}">
        <div class="text-5xl mb-7" style="filter:drop-shadow(0 4px 16px rgba(77,102,82,0.2));">🌲</div>
        <h2 class="font-serif font-bold leading-tight mb-6" style="font-size:clamp(36px,5vw,60px); color:{C.charcoal};">
            Join the planning<br />revolution.
        </h2>
        <p class="text-xl leading-relaxed mb-12 max-w-lg mx-auto" style="color:{C.earth};">
            That thought you've been holding — the one you keep meaning to act on — write it in Resin. It becomes a scheduled plan in under 10 seconds.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <a href="https://testflight.apple.com/join/yV53qa1z"
               target="_blank" rel="noopener noreferrer"
               class="group inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-full font-bold text-base text-white transition-all duration-300 hover:-translate-y-0.5 w-full sm:w-auto"
               style="background:{C.charcoal}; box-shadow:0 8px 24px -4px rgba(46,42,38,0.3);">
                <Apple class="w-5 h-5" />
                Download for iOS — Free
            </a>
            <a href="/login?next=/"
               class="group inline-flex items-center justify-center gap-2 px-9 py-4 rounded-full font-semibold text-base transition-all duration-300 w-full sm:w-auto"
               style="border:2px solid rgba(46,42,38,0.18); color:{C.charcoal};">
                Open Web Dashboard
                <ArrowRight class="w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
            </a>
        </div>
        <p style="font-size:12px; color:{C.earthLight};">No credit card required · iOS app free forever · Web trial included</p>
    </div>
</section>

</main>
