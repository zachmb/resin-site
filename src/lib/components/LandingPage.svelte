<script lang="ts">
    import { Brain, Lock, Zap, Check, ChevronDown, Apple, TrendingUp, Calendar, Globe, Smartphone, Star, Shield, Sparkles, ArrowRight, FileText, Mic, Link } from 'lucide-svelte';
    import { onMount } from 'svelte';

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
        return () => observer.disconnect();
    });

    function visible(key: string) {
        return animatedSections[key]
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8';
    }
</script>

<!-- ─── Root: warm sand background matching iOS ─── -->
<main style="background: {C.bg}; font-family: 'Outfit', system-ui, sans-serif;">

<!-- ═══════════════════════════════════════════════════════════
     HERO
═══════════════════════════════════════════════════════════ -->
<section class="relative pt-24 pb-0 overflow-hidden" data-section="hero">
    <!-- Soft ambient glows -->
    <div class="absolute inset-0 pointer-events-none" aria-hidden="true"
         style="background:
            radial-gradient(ellipse 900px 600px at 85% -10%, rgba(200,136,74,0.13) 0%, transparent 65%),
            radial-gradient(ellipse 500px 400px at 0% 75%, rgba(77,102,82,0.08) 0%, transparent 60%);">
    </div>

    <div class="max-w-7xl mx-auto px-6 lg:px-10">
        <div class="grid lg:grid-cols-2 gap-16 items-center" style="min-height: 88vh;">

            <!-- Left copy -->
            <div class="transition-all duration-700 {visible('hero')} pb-20 lg:pb-0">

                <!-- Headline: serif, heavy, like iOS New York -->
                <h1 class="font-serif font-bold leading-[1.04] tracking-tight mb-7"
                    style="font-size: clamp(44px, 6vw, 72px); color: {C.charcoal};">
                    The notes app<br />that turns thoughts<br />
                    <em class="not-italic" style="background: linear-gradient(135deg, {C.amber} 0%, {C.amberDark} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                        into finished work.
                    </em>
                </h1>

                <p class="text-xl leading-relaxed mb-10 max-w-[480px]" style="color: {C.earth};">
                    Capture everything. AI structures your notes into concrete plans. Real app blocking keeps you on task until it's done — on iPhone, iPad, and in Chrome.
                </p>

                <!-- CTAs -->
                <div class="flex flex-col sm:flex-row gap-4 mb-10">
                    <a href="https://testflight.apple.com/join/yV53qa1z"
                       target="_blank" rel="noopener noreferrer"
                       class="group inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-full font-bold text-base text-white transition-all duration-300 hover:-translate-y-0.5"
                       style="background: {C.charcoal}; box-shadow: 0 8px 24px -4px rgba(46,42,38,0.35);">
                        <Apple class="w-4 h-4" />
                        Download for iOS
                        <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <a href="/login?next=/"
                       class="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-base transition-all duration-300"
                       style="border: 2px solid rgba(46,42,38,0.18); color: {C.charcoal};">
                        Try Web App
                        <ArrowRight class="w-4 h-4 opacity-40 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all" />
                    </a>
                </div>

                <!-- Trust -->
                <div class="flex flex-wrap items-center gap-5 text-sm" style="color: {C.earthLight};">
                    <span class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5" style="color: {C.forest};" />iOS app free forever</span>
                    <span class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5" style="color: {C.forest};" />AI runs on-device</span>
                    <span class="flex items-center gap-1.5"><Check class="w-3.5 h-3.5" style="color: {C.forest};" />No credit card</span>
                </div>
            </div>

            <!-- Right: stacked phones -->
            <div class="hidden lg:flex justify-center items-end relative h-[620px]" data-section="hero-phones">

                <!-- Phone 1: Note editor (left, behind) -->
                <div class="absolute left-2 bottom-0 overflow-hidden shadow-[0_32px_72px_-16px_rgba(46,42,38,0.32)] transform -rotate-3 z-10"
                     style="width:248px; height:516px; border-radius:42px; border: 9px solid {C.charcoal}; background: white;">
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 z-20 rounded-b-2xl" style="width:96px; height:24px; background: {C.charcoal};"></div>
                    <div class="h-full flex flex-col" style="background: {C.bg};">
                        <div class="h-7"></div>
                        <!-- App header -->
                        <div class="px-5 pt-4 pb-3 flex items-center justify-between" style="border-bottom: 1px solid rgba(46,42,38,0.06);">
                            <div>
                                <div class="font-serif font-semibold" style="font-size:14px; color:{C.charcoal};">Notes</div>
                                <div style="font-size:9px; color:{C.earthLight}; margin-top:1px;">5 notes · 2 active</div>
                            </div>
                            <div class="rounded-full flex items-center justify-center" style="width:26px; height:26px; background:{C.amber};">
                                <span style="color:white; font-size:12px; font-weight:700;">+</span>
                            </div>
                        </div>
                        <!-- Note list -->
                        <div class="px-3 py-3 space-y-2.5 flex-1">
                            <!-- Active note card -->
                            <div class="rounded-2xl p-3.5" style="background:white; border-left: 3px solid {C.amber}; box-shadow: 0 2px 10px -2px rgba(46,42,38,0.08);">
                                <div class="flex items-center justify-between mb-1">
                                    <div class="font-serif font-semibold truncate" style="font-size:11px; color:{C.charcoal};">Redesign onboarding flow</div>
                                    <span class="rounded-md font-bold" style="font-size:8px; color:white; background:{C.amber}; padding:1px 5px;">Active</span>
                                </div>
                                <div style="font-size:9px; color:{C.earthLight};">5 tasks · Fri 2pm · Apps blocked</div>
                            </div>
                            <!-- Draft notes -->
                            {#each [
                                ['Learn Spanish this month', 'Need structure. Been saying this for a year...'],
                                ['Talk to Mum about Christmas', 'Book flights before they sell out. Also check...'],
                                ['Finish portfolio case study', 'The Instagram Redesign one — almost done'],
                            ] as [title, body]}
                                <div class="rounded-xl p-3" style="background:white; border: 1px solid rgba(46,42,38,0.06);">
                                    <div class="font-serif font-medium mb-1 truncate" style="font-size:10px; color:{C.charcoal};">{title}</div>
                                    <div class="leading-relaxed line-clamp-1" style="font-size:8.5px; color:{C.earth}; opacity:0.65;">{body}</div>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <!-- Phone 2: AI plan (right, front) -->
                <div class="absolute right-0 top-0 overflow-hidden shadow-[0_40px_80px_-20px_rgba(46,42,38,0.38)] transform rotate-3 z-20"
                     style="width:252px; height:526px; border-radius:44px; border: 9px solid {C.charcoal}; background:white;">
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 z-20 rounded-b-2xl" style="width:96px; height:24px; background: {C.charcoal};"></div>
                    <div class="h-full flex flex-col" style="background:white;">
                        <div class="h-7"></div>
                        <!-- Plan header -->
                        <div class="px-4 pt-4 pb-3" style="background: linear-gradient(135deg, rgba(200,136,74,0.12) 0%, rgba(200,136,74,0.03) 100%);">
                            <div class="flex items-start justify-between mb-2">
                                <div>
                                    <div class="font-serif font-semibold leading-tight" style="font-size:12px; color:{C.charcoal};">Redesign onboarding flow</div>
                                    <div style="font-size:9px; color:{C.earthLight}; margin-top:2px;">4 tasks · 2h 15min</div>
                                </div>
                                <span class="font-bold rounded-full" style="font-size:8px; color:white; background:{C.amber}; padding:2px 7px;">AI Plan</span>
                            </div>
                            <div class="flex gap-1.5">
                                <span class="rounded-full" style="font-size:8.5px; color:{C.forestDark}; background:rgba(77,102,82,0.1); padding:2px 7px;">Thu 3pm</span>
                                <span class="rounded-full" style="font-size:8.5px; color:{C.amberDark}; background:rgba(200,136,74,0.1); padding:2px 7px;">Apps blocked</span>
                            </div>
                        </div>
                        <!-- Tasks -->
                        <div class="px-4 py-3 space-y-2.5 flex-1">
                            {#each [
                                ['Audit current onboarding', '20m'],
                                ['Sketch 3 alternative flows', '45m'],
                                ['Build hi-fi in Figma', '50m'],
                                ['Write copy & micro-text', '20m'],
                            ] as [task, time], i}
                                <div class="flex items-center gap-2.5">
                                    <div class="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white" style="width:18px; height:18px; background:{C.amber}; font-size:8px;">{i+1}</div>
                                    <span class="flex-1 font-medium" style="font-size:10px; color:{C.charcoal}; line-height:1.3;">{task}</span>
                                    <span class="font-mono" style="font-size:9px; color:{C.earthLight};">{time}</span>
                                </div>
                            {/each}
                        </div>
                        <!-- CTA -->
                        <div class="px-4 pb-4 pt-2" style="border-top: 1px solid rgba(200,136,74,0.15);">
                            <div class="w-full text-center rounded-xl font-bold text-white" style="background:{C.forestDark}; font-size:10px; padding:10px;">
                                Schedule &amp; Block Apps ✓
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Floating chip -->
                <div class="absolute z-30 rotate-6" style="left:50%; top:48%; transform:translateX(-50%) translateY(-50%) rotate(6deg);">
                    <div class="rounded-2xl px-4 py-2.5 whitespace-nowrap" style="background:white; border:1px solid rgba(200,136,74,0.2); box-shadow:0 8px 24px -4px rgba(46,42,38,0.18);">
                        <div style="font-size:9.5px; font-weight:700; color:{C.amber};">⚡ Note → Plan in 8 seconds</div>
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
<section class="py-28 px-6" style="background:{C.bg};" data-section="feat-notes">
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-notes')}">

            <!-- Text left -->
            <div>
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-wider"
                     style="background:rgba(200,136,74,0.1); color:{C.amberDark};">
                    <FileText class="w-3 h-3" /> Note-taking
                </div>
                <h2 class="font-serif font-bold leading-tight mb-6" style="font-size:clamp(34px,4.2vw,50px); color:{C.charcoal};">
                    Your thoughts deserve<br />a better home.
                </h2>
                <p class="text-lg leading-relaxed mb-8" style="color:{C.earth};">
                    Resin is where you write before you know what you're writing. Stream-of-consciousness brain dumps, quick voice memos, half-formed ideas — it all lands here. Then, when you're ready to act, one tap turns any note into an executable plan.
                </p>
                <ul class="space-y-4 mb-10">
                    {#each [
                        ['Write anything, any way', 'Text, voice, rich formatting — or just raw stream of consciousness'],
                        ['Notes connect in a mind map', 'See how your ideas relate in an interactive 2D canvas'],
                        ['Every note is actionable', 'One tap to activate AI planning from any note'],
                        ['Synced to every device', 'Write on phone, plan on web — always in sync'],
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
                    <div class="rounded-3xl overflow-hidden" style="background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 24px 60px -12px rgba(46,42,38,0.14);">
                        <!-- Editor toolbar -->
                        <div class="px-5 py-3.5 flex items-center justify-between" style="border-bottom:1px solid rgba(46,42,38,0.06); background:{C.bg};">
                            <div class="flex items-center gap-3">
                                <div class="font-serif font-semibold" style="font-size:13px; color:{C.charcoal};">Learn Spanish this month</div>
                            </div>
                            <div class="flex items-center gap-2">
                                <Mic class="w-3.5 h-3.5" style="color:{C.earthLight};" />
                                <Link class="w-3.5 h-3.5" style="color:{C.earthLight};" />
                            </div>
                        </div>
                        <!-- Note body -->
                        <div class="px-5 py-5">
                            <div class="font-serif leading-relaxed mb-6 whitespace-pre-wrap" style="font-size:14px; color:{C.earth}; line-height:1.75;">I've been saying I'll learn Spanish for literally 3 years. I have Duolingo on my phone (haven't opened in 9 months). My girlfriend speaks it and I feel left out at family dinners.

I think the real problem is I don't have a system. Maybe I need:
— 30 min every morning before coffee
— watch one Spanish show per week (La Casa de Papel?)
— find a language exchange partner
— commit to a trip to Mexico City as the goal
</div>
                            <!-- Tags -->
                            <div class="flex flex-wrap gap-1.5 mb-5">
                                {#each ['Personal', 'Language', 'Self-growth'] as tag}
                                    <span class="rounded-full text-xs font-medium px-2.5 py-0.5" style="background:rgba(200,136,74,0.08); color:{C.amberDark};">{tag}</span>
                                {/each}
                            </div>
                            <!-- Activate bar -->
                            <div class="rounded-2xl px-4 py-3.5 flex items-center justify-between" style="background:rgba(200,136,74,0.07); border:1px solid rgba(200,136,74,0.18);">
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
                    <div class="absolute -right-6 -bottom-6 rounded-2xl overflow-hidden" style="width:160px; background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 12px 32px -6px rgba(46,42,38,0.18); padding:12px;">
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
<section class="py-28 px-6" style="background:{C.bgSecondary};" data-section="feat-plan">
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
                                    <span class="font-bold rounded-full" style="font-size:8px; color:white; background:{C.amber}; padding:2px 7px;">AI Plan</span>
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
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-wider"
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
<section class="py-28 px-6" style="background:{C.bg};" data-section="feat-block">
    <div class="max-w-7xl mx-auto">
        <div class="grid lg:grid-cols-2 gap-20 items-center transition-all duration-700 {visible('feat-block')}">

            <!-- Text left -->
            <div>
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-wider"
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
                                <div class="rounded-2xl px-10 py-4 mb-5 w-full text-center" style="background:rgba(255,255,255,0.06);">
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
                                            <span class="font-bold rounded-full" style="font-size:7.5px; color:rgba(232,168,87,0.7); background:rgba(232,168,87,0.12); padding:1px 6px;">BLOCKED</span>
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
                            <div class="rounded-2xl px-6 py-4 mb-8 w-full max-w-xs" style="background:rgba(255,255,255,0.05);">
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
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-wider"
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
                <div class="rounded-3xl p-8 hover:-translate-y-1 hover:shadow-lg transition-all duration-500 group" style="background:white; border:1px solid rgba(46,42,38,0.06);">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-105 transition-transform" style="background:{f.bg};">
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
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-wider"
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
                <div class="w-full max-w-[380px] rounded-3xl overflow-hidden" style="background:white; border:1px solid rgba(46,42,38,0.08); box-shadow:0 24px 56px -12px rgba(46,42,38,0.14);">
                    <div class="px-5 py-4" style="border-bottom:1px solid rgba(46,42,38,0.06);">
                        <div class="flex items-center justify-between">
                            <div class="font-serif font-semibold" style="font-size:14px; color:{C.charcoal};">Thursday, Apr 17</div>
                            <span class="font-bold rounded-full text-white" style="font-size:9px; background:{C.amber}; padding:2px 8px;">Today</span>
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
                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold mb-8 uppercase tracking-wider"
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
                <div class="rounded-3xl p-7 hover:shadow-md transition-shadow duration-300" style="background:white; border:1px solid rgba(46,42,38,0.06);">
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
            <div class="rounded-3xl p-10" style="background:{C.bgSecondary}; border:2px solid rgba(46,42,38,0.1);">
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
                   class="block w-full py-4 rounded-2xl text-center font-bold text-sm transition-colors"
                   style="border:2px solid rgba(46,42,38,0.18); color:{C.charcoal};">
                    Download Beta
                </a>
            </div>
            <!-- Pro tier -->
            <div class="rounded-3xl p-10 relative" style="background:{C.forestDark}; border:2px solid rgba(255,255,255,0.07); box-shadow:0 24px 48px -12px rgba(200,136,74,0.2);">
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
                <a href="/login?next=/" class="block w-full py-4 rounded-2xl text-center font-bold text-sm transition-all hover:opacity-90"
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
                <div class="rounded-2xl overflow-hidden transition-all duration-300" style="background:white; border:1px solid rgba(46,42,38,0.06);">
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
<section class="py-28 px-6" style="background:{C.bg};" data-section="cta">
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
