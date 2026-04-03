<script lang="ts">
    import { Brain, Lock, Zap, Check, ChevronDown, Apple, TrendingUp } from 'lucide-svelte';
    import { onMount } from 'svelte';

    let animatedSections = $state<{ [key: string]: boolean }>({});

    // FAQ accordion state
    let openFaq = $state<number | null>(null);
    function toggleFaq(i: number) {
        openFaq = openFaq === i ? null : i;
    }

    const faqs = [
        {
            q: "What exactly does 'real app blocking' mean?",
            a: "Resin uses Apple's Screen Time API to block apps at the OS level — not just a web filter. When you're in a focus session, YouTube, Reddit, Twitter, TikTok, Instagram, and any other app you specify become inaccessible on your iPhone, iPad, and Mac simultaneously. There's no override, no timer, no 'just 5 minutes.' The apps are simply gone until your session ends."
        },
        {
            q: "How does the AI planning actually work?",
            a: "You type anything — a messy thought, a goal, a task list — and hit Activate. Resin's AI reads it, identifies what needs to happen, and generates a structured plan with concrete steps, time estimates, and strategies. It then schedules those steps onto your calendar, blocking apps for each task's duration. The whole thing takes under 10 seconds."
        },
        {
            q: "Do I need the iOS app, or does the web app work on its own?",
            a: "The web app handles note-taking, planning, scheduling, and session management — everything except app blocking, which requires the iOS app for OS-level access. If you primarily work on a Mac with the browser extension, blocking works there too. The iOS app unlocks the full cross-device blocking experience."
        },
        {
            q: "Can I cancel a focus session if something comes up?",
            a: "Yes. You can cancel any upcoming session before it starts with a single tap. Once a session is active, you can still cancel — but there's intentional friction to prevent impulsive exits. Emergency situations are always handled."
        },
        {
            q: "Is my data private?",
            a: "Yes. Your notes and plans are encrypted. We don't read your content, sell your data, or use it for training AI models beyond your own personalization. You can export or delete everything at any time."
        },
        {
            q: "How is Resin different from Forest or Focus apps?",
            a: "Most focus apps just block apps or grow a tree — they don't help you figure out what to actually do. Resin is the only app that combines AI-powered planning, real OS-level app blocking, and cross-platform sync into one system. You don't just focus, you finish things."
        }
    ];

    const testimonials = [
        {
            quote: "I've been using productivity apps for years. Resin is the first one where I actually feel like I'm getting things done instead of just organizing them.",
            name: "Marcus T.",
            role: "Software Engineer"
        },
        {
            quote: "The blocking is real. Not 'you can override it in settings' real — actually locked. That's what I needed.",
            name: "Aisha K.",
            role: "Grad Student"
        },
        {
            quote: "Went from writing 'clean my room' in a to-do app for 3 weeks to actually cleaning it in 45 minutes. The AI plan broke it down so I just couldn't procrastinate.",
            name: "Daniel R.",
            role: "Freelance Designer"
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
        }, { threshold: 0.05, rootMargin: '50px' });

        sections.forEach((s) => observer.observe(s));

        return () => observer.disconnect();
    });
</script>

<main class="flex-grow pt-20 pb-20 relative z-10 w-full overflow-hidden">

    <!-- ─── AMBIENT GLOW ─── -->
    <div class="pointer-events-none absolute top-0 right-0 w-[900px] h-[900px] z-0" aria-hidden="true">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 100% 0%, rgba(234,118,20,0.52) 0%, rgba(245,158,50,0.28) 28%, rgba(251,185,80,0.10) 54%, transparent 78%);filter:blur(72px);"></div>
        <div style="position:absolute;inset:0;background-image:url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='250' height='250'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='250' height='250' filter='url(%23grain)' opacity='1'/%3E%3C/svg%3E&quot;);background-repeat:repeat;background-size:200px 200px;opacity:0.55;mix-blend-mode:soft-light;mask-image:radial-gradient(ellipse 900px 900px at 100% 0%, black 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.55) 32%, rgba(0,0,0,0.25) 52%, rgba(0,0,0,0.07) 68%, transparent 82%);-webkit-mask-image:radial-gradient(ellipse 900px 900px at 100% 0%, black 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.55) 32%, rgba(0,0,0,0.25) 52%, rgba(0,0,0,0.07) 68%, transparent 82%);"></div>
    </div>

    <!-- ─── HERO ─── -->
    <section class="max-w-7xl mx-auto px-6 mb-24 pt-8">
        <div class="grid md:grid-cols-2 gap-16 items-center">

            <!-- Left: Copy -->
            <div data-section="hero" class="transition-all duration-700 {animatedSections['hero'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}">

                <!-- Eyebrow -->
                <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber text-xs font-semibold mb-6 tracking-wide uppercase">
                    <Zap class="w-3.5 h-3.5" />
                    AI Planning + Real App Blocking
                </div>

                <h1 class="text-5xl md:text-[64px] font-bold text-resin-charcoal font-serif mb-6 tracking-tight leading-[1.1]">
                    What you intend<br />to do,<br />
                    <span class="text-resin-amber">actually done.</span>
                </h1>

                <p class="text-lg md:text-xl text-resin-earth/70 mb-8 font-light leading-relaxed max-w-md">
                    Brain dump your idea. AI builds the plan. Resin locks out distractions and gets you across the finish line.
                </p>

                <!-- CTAs -->
                <div class="flex flex-col sm:flex-row gap-4 mb-10">
                    <a href="/login?next=/" class="group relative inline-flex items-center justify-center px-8 py-4 bg-resin-charcoal text-white rounded-full font-semibold text-base hover:bg-resin-amber transition-all duration-300 shadow-premium hover:shadow-2xl hover:-translate-y-0.5 w-full sm:w-auto text-center">
                        Start for Free
                        <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </a>
                    <a href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer" class="group inline-flex items-center justify-center px-8 py-4 bg-transparent text-resin-charcoal rounded-full font-semibold text-base border border-resin-charcoal/20 hover:border-resin-amber hover:text-resin-amber transition-all duration-300 w-full sm:w-auto text-center">
                        <Apple class="w-4 h-4 mr-2" />
                        iOS App (Beta)
                    </a>
                </div>

                <!-- Trust signals -->
                <div class="flex flex-wrap items-center gap-4 text-xs text-resin-earth/50">
                    <span class="flex items-center gap-1.5">
                        <Check class="w-3.5 h-3.5 text-resin-forest" />
                        Free to start
                    </span>
                    <span class="flex items-center gap-1.5">
                        <Check class="w-3.5 h-3.5 text-resin-forest" />
                        End-to-end encrypted
                    </span>
                    <span class="flex items-center gap-1.5">
                        <Check class="w-3.5 h-3.5 text-resin-forest" />
                        No card required
                    </span>
                </div>
            </div>

            <!-- Right: App Mockups -->
            <div class="hidden md:flex justify-center items-center relative h-[520px]" data-section="hero-visual">

                <!-- Back: Scheduled plan card -->
                <div class="absolute bottom-8 right-12 w-[300px] rounded-2xl shadow-2xl transform -rotate-6 opacity-90 z-10">
                    <div class="bg-white/70 backdrop-blur-md rounded-2xl border border-resin-forest/10 overflow-hidden">
                        <div class="px-5 py-4 bg-resin-forest/5 border-b border-resin-forest/10">
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-bold text-resin-charcoal">Deep Work Block</span>
                                <span class="text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-resin-amber">Today 2pm</span>
                            </div>
                        </div>
                        <div class="p-4 space-y-2.5">
                            {#each [['Put away clothes', '15m', true], ['Organize desk', '20m', true], ['Sweep & tidy', '15m', false]] as [task, time, done]}
                                <div class="flex items-center gap-2.5">
                                    <div class="w-4.5 h-4.5 rounded-full flex items-center justify-center flex-shrink-0 {done ? 'bg-resin-forest' : 'border-2 border-resin-earth/20'}">
                                        {#if done}<Check class="w-2.5 h-2.5 text-white" />{/if}
                                    </div>
                                    <span class="text-xs {done ? 'line-through text-resin-earth/40' : 'text-resin-charcoal'} flex-1">{task}</span>
                                    <span class="text-[10px] text-resin-earth/40 font-mono">{time}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <!-- Middle: Brain dump phone -->
                <div class="absolute left-0 bottom-0 w-[260px] bg-gradient-to-b from-white to-stone-50 rounded-[36px] border-[8px] border-black shadow-2xl overflow-hidden transform -rotate-2 z-20">
                    <div class="bg-black h-6 flex items-center justify-center">
                        <div class="w-20 h-4 bg-black rounded-b-xl border-t-0"></div>
                    </div>
                    <div class="px-5 py-5 space-y-4">
                        <p class="text-resin-earth/50 text-[11px] font-light">What's on your mind?</p>
                        <div class="bg-resin-amber/5 rounded-xl p-3 border border-resin-amber/20 min-h-24 text-xs text-resin-charcoal leading-relaxed">
                            Need to clean my room. Been putting it off all week. Clothes everywhere, desk is disaster zone. Have to do it today.
                        </div>
                        <div class="flex gap-2">
                            <button class="flex-1 text-resin-forest font-semibold text-[11px] py-2.5 rounded-lg border border-resin-forest/30 bg-resin-forest/8 flex items-center justify-center gap-1">
                                <span>↓</span> Save
                            </button>
                            <button class="flex-1 bg-resin-forest text-white font-bold text-[11px] py-2.5 rounded-lg flex items-center justify-center gap-1">
                                <span>✨</span> Activate
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Front: AI Plan phone -->
                <div class="absolute right-0 top-0 w-[260px] bg-gradient-to-b from-white to-stone-50 rounded-[36px] border-[8px] border-black shadow-2xl overflow-hidden transform rotate-3 z-30">
                    <div class="bg-black h-6 flex items-center justify-center">
                        <div class="w-20 h-4 bg-black rounded-b-xl border-t-0"></div>
                    </div>
                    <!-- Amber gradient header -->
                    <div class="px-5 py-4" style="background: linear-gradient(135deg, rgba(212,147,58,0.15) 0%, rgba(212,147,58,0.04) 100%);">
                        <div class="flex items-start justify-between mb-0.5">
                            <h3 class="font-bold text-sm text-resin-charcoal leading-tight">Clean my room</h3>
                            <span class="text-[9px] text-resin-amber font-bold ml-2 mt-0.5 whitespace-nowrap">4 tasks</span>
                        </div>
                        <div class="flex gap-2 mt-2">
                            <span class="text-[10px] text-resin-earth/60 bg-resin-earth/8 px-2 py-0.5 rounded-full">60 min</span>
                            <span class="text-[10px] text-resin-forest bg-resin-forest/10 px-2 py-0.5 rounded-full font-medium">Scheduled</span>
                        </div>
                    </div>
                    <div class="px-4 py-3 space-y-2.5">
                        {#each [['Put away clothes', '15m'], ['Organize desk', '20m'], ['Sweep & tidy', '15m'], ['Make bed & check', '10m']] as [task, time], i}
                            <div class="flex items-center gap-2.5">
                                <span class="w-4.5 h-4.5 rounded-full bg-resin-amber text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                <span class="text-[11px] text-resin-charcoal flex-1 font-medium">{task}</span>
                                <span class="text-[10px] text-resin-earth/40 font-mono">{time}</span>
                            </div>
                        {/each}
                    </div>
                    <div class="px-4 py-3 border-t border-resin-amber/15">
                        <div class="w-full bg-resin-amber text-white font-bold text-[11px] py-2.5 rounded-lg text-center">Apps Blocked at 2pm ✓</div>
                    </div>
                </div>

            </div>
        </div>
    </section>

    <!-- ─── PROBLEM STATEMENT (dark) ─── -->
    <section
        data-section="problem"
        class="w-full bg-resin-charcoal py-20 px-6 mb-24 transition-all duration-700 {animatedSections['problem'] ? 'opacity-100' : 'opacity-0'}"
    >
        <div class="max-w-4xl mx-auto">
            <p class="text-resin-amber/80 text-sm font-semibold uppercase tracking-widest mb-10">Sound familiar?</p>
            <div class="space-y-8">
                <div class="flex gap-6 items-start">
                    <div class="text-resin-amber/30 font-serif text-5xl leading-none select-none mt-1">"</div>
                    <p class="text-white/90 text-2xl md:text-3xl font-light leading-relaxed">
                        You know what you need to do. You've known for weeks. But you open your phone and two hours disappear.
                    </p>
                </div>
                <div class="flex gap-6 items-start pl-8">
                    <div class="text-resin-forest/40 font-serif text-5xl leading-none select-none mt-1">"</div>
                    <p class="text-white/70 text-xl md:text-2xl font-light leading-relaxed">
                        You make a to-do list. You feel good about it. You don't do any of it.
                    </p>
                </div>
                <div class="flex gap-6 items-start pl-16">
                    <div class="text-white/20 font-serif text-5xl leading-none select-none mt-1">"</div>
                    <p class="text-white/50 text-lg md:text-xl font-light leading-relaxed">
                        You try Forest. You try Pomodoro. You disable them both within a day.
                    </p>
                </div>
            </div>
            <div class="mt-14 pt-10 border-t border-white/10">
                <p class="text-white text-xl md:text-2xl font-semibold">
                    The problem isn't motivation. It's that nothing actually <em class="text-resin-amber not-italic">stops you</em> from getting distracted — and nothing tells you exactly what to do next.
                </p>
                <p class="text-white/60 mt-4 text-base">Resin fixes both. At the same time.</p>
            </div>
        </div>
    </section>

    <!-- ─── HOW IT WORKS ─── -->
    <section class="max-w-7xl mx-auto px-6 mb-24">
        <div class="text-center mb-16" data-section="hiw-header">
            <p class="text-resin-amber text-sm font-semibold uppercase tracking-widest mb-3">The Loop</p>
            <h2 class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif mb-4">Three steps. Then it's done.</h2>
            <p class="text-resin-earth/60 text-lg max-w-xl mx-auto">From scattered thought to finished work — in under a minute of setup.</p>
        </div>

        <!-- Step 1 -->
        <div class="grid md:grid-cols-2 gap-16 items-center mb-24"
             data-section="step1"
             class:opacity-100={animatedSections['step1']}
             class:translate-y-0={animatedSections['step1']}
             class:opacity-0={!animatedSections['step1']}
             class:translate-y-8={!animatedSections['step1']}
             style="transition: opacity 0.7s ease, transform 0.7s ease;">
            <!-- Mockup -->
            <div class="flex justify-center order-2 md:order-1">
                <div class="w-[300px] bg-gradient-to-b from-white to-stone-50 rounded-[36px] border-[8px] border-black shadow-2xl overflow-hidden">
                    <div class="bg-black h-7 flex items-center justify-center">
                        <div class="w-20 h-4 bg-black rounded-b-xl"></div>
                    </div>
                    <div class="px-5 py-6">
                        <h3 class="text-resin-charcoal font-bold text-base mb-4">What's on your mind?</h3>
                        <div class="bg-resin-amber/5 border-2 border-resin-amber/25 rounded-2xl p-4 mb-5 min-h-28">
                            <p class="text-resin-charcoal text-sm leading-relaxed">Need to prep for my presentation Friday. Terrified. Keep avoiding it. Slides aren't done, haven't practiced, no clear structure.</p>
                        </div>
                        <button class="w-full bg-resin-forest text-white rounded-full py-3 font-bold text-sm flex items-center justify-center gap-2">
                            <span>✨</span> Activate with AI
                        </button>
                    </div>
                </div>
            </div>
            <!-- Text -->
            <div class="order-1 md:order-2 space-y-5">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-full bg-resin-amber text-white flex items-center justify-center text-base font-bold shadow-lg">1</div>
                    <h3 class="text-3xl font-bold text-resin-charcoal">Brain dump anything</h3>
                </div>
                <p class="text-resin-earth/70 text-lg leading-relaxed">Don't think, don't structure — just type. Resin AI reads messy, emotional, scattered thoughts and knows what you actually need to do.</p>
                <ul class="space-y-3">
                    {#each ['Works on iPhone, iPad, web, and Mac', 'Auto-save as you type', 'Voice-to-text supported'] as item}
                        <li class="flex gap-3 items-center">
                            <span class="w-5 h-5 rounded-full bg-resin-forest/10 flex items-center justify-center flex-shrink-0">
                                <Check class="w-3 h-3 text-resin-forest" />
                            </span>
                            <span class="text-resin-earth/70">{item}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>

        <!-- Step 2 -->
        <div class="grid md:grid-cols-2 gap-16 items-center mb-24"
             data-section="step2"
             style="transition: opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s; opacity: {animatedSections['step2'] ? 1 : 0}; transform: translateY({animatedSections['step2'] ? 0 : 32}px)">
            <!-- Text -->
            <div class="space-y-5">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-full bg-resin-forest text-white flex items-center justify-center text-base font-bold shadow-lg">2</div>
                    <h3 class="text-3xl font-bold text-resin-charcoal">AI builds a real plan</h3>
                </div>
                <p class="text-resin-earth/70 text-lg leading-relaxed">Not a vague list — a concrete schedule. Granular steps with time estimates, strategies, and calendar blocks. Editable before it locks in.</p>
                <ul class="space-y-3">
                    {#each ['Instant plan in under 10 seconds', 'Step-by-step micro-tasks (not vague goals)', 'Adjust, reorder, remove before confirming'] as item}
                        <li class="flex gap-3 items-center">
                            <span class="w-5 h-5 rounded-full bg-resin-forest/10 flex items-center justify-center flex-shrink-0">
                                <Check class="w-3 h-3 text-resin-forest" />
                            </span>
                            <span class="text-resin-earth/70">{item}</span>
                        </li>
                    {/each}
                </ul>
            </div>
            <!-- Mockup -->
            <div class="flex justify-center">
                <div class="bg-white rounded-2xl border border-resin-earth/10 shadow-2xl overflow-hidden w-full max-w-sm">
                    <div class="px-5 py-4" style="background: linear-gradient(135deg, rgba(212,147,58,0.12) 0%, rgba(212,147,58,0.03) 100%);">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="font-bold text-resin-charcoal text-sm">Friday Presentation</h3>
                                <p class="text-xs text-resin-earth/50 mt-0.5">5 tasks · 2h 20min total</p>
                            </div>
                            <span class="text-[10px] font-bold text-white px-2.5 py-1 rounded-full bg-resin-amber">AI Generated</span>
                        </div>
                    </div>
                    <div class="p-5 space-y-3">
                        {#each [
                            ['Outline slide structure', '20 min', 'List main argument + 3 supporting points'],
                            ['Build slides (content only)', '45 min', 'No design yet — just text and flow'],
                            ['Add visuals & polish', '30 min', 'Charts, images, one consistent style'],
                            ['Practice out loud', '30 min', 'Record yourself once, watch it back'],
                            ['Final review', '15 min', 'Timing check, remove anything unclear']
                        ] as [task, time, hint], i}
                            <div class="flex gap-3">
                                <div class="w-6 h-6 rounded-full bg-resin-amber/15 text-resin-amber flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-baseline justify-between gap-2">
                                        <p class="text-sm font-semibold text-resin-charcoal truncate">{task}</p>
                                        <span class="text-[10px] text-resin-earth/40 font-mono whitespace-nowrap">{time}</span>
                                    </div>
                                    <p class="text-[11px] text-resin-earth/50 mt-0.5 leading-relaxed">{hint}</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                    <div class="px-5 pb-5">
                        <button class="w-full bg-resin-forest text-white rounded-full py-2.5 font-bold text-sm">Schedule & Block Apps</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 3 -->
        <div class="grid md:grid-cols-2 gap-16 items-center"
             data-section="step3"
             style="transition: opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s; opacity: {animatedSections['step3'] ? 1 : 0}; transform: translateY({animatedSections['step3'] ? 0 : 32}px)">
            <!-- Mockup -->
            <div class="flex justify-center order-2 md:order-1">
                <div class="w-[300px] bg-gradient-to-b from-resin-charcoal to-black rounded-[36px] border-[8px] border-black shadow-2xl overflow-hidden">
                    <div class="bg-black h-7 flex items-center justify-center">
                        <div class="w-20 h-4 bg-black rounded-b-xl"></div>
                    </div>
                    <div class="px-5 py-10 flex flex-col items-center justify-center text-center min-h-72">
                        <!-- Tree -->
                        <div class="text-5xl mb-5 drop-shadow-lg" style="filter: drop-shadow(0 0 16px rgba(212,147,58,0.5));">🌲</div>
                        <h3 class="text-white font-bold text-lg mb-2">Focus in progress</h3>
                        <p class="text-white/50 text-sm mb-6 max-w-48">This app is blocked. Get back to work.</p>
                        <div class="bg-white/10 rounded-2xl px-8 py-4 mb-5 w-full">
                            <div class="text-white/50 text-[11px] mb-1 uppercase tracking-wider">Time remaining</div>
                            <div class="text-resin-amber text-4xl font-bold font-mono">1:42</div>
                        </div>
                        <div class="flex gap-2">
                            <span class="text-[10px] text-white/30 bg-white/5 px-2.5 py-1 rounded-full">YouTube — blocked</span>
                            <span class="text-[10px] text-white/30 bg-white/5 px-2.5 py-1 rounded-full">Reddit — blocked</span>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Text -->
            <div class="order-1 md:order-2 space-y-5">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-full bg-resin-charcoal text-white flex items-center justify-center text-base font-bold shadow-lg">3</div>
                    <h3 class="text-3xl font-bold text-resin-charcoal">Distractions disappear</h3>
                </div>
                <p class="text-resin-earth/70 text-lg leading-relaxed">When your session starts, every distraction app on every device locks simultaneously. iPhone, iPad, Mac, browser. No timer. No override. Just the work.</p>
                <ul class="space-y-3">
                    {#each ['OS-level blocking — can\'t be disabled', 'Syncs across iPhone, iPad, Mac, web', 'Apps unlock automatically when session ends'] as item}
                        <li class="flex gap-3 items-center">
                            <span class="w-5 h-5 rounded-full bg-resin-forest/10 flex items-center justify-center flex-shrink-0">
                                <Check class="w-3 h-3 text-resin-forest" />
                            </span>
                            <span class="text-resin-earth/70">{item}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>
    </section>

    <!-- ─── FEATURE SPOTLIGHTS ─── -->
    <section class="max-w-6xl mx-auto px-6 mb-24" data-section="features">
        <div class="text-center mb-14">
            <p class="text-resin-forest text-sm font-semibold uppercase tracking-widest mb-3">Built different</p>
            <h2 class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif">Everything works together</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
            <div class="group glass-card rounded-2xl p-8 hover:border-resin-amber/40 hover:-translate-y-1 transition-all duration-500">
                <div class="w-12 h-12 rounded-xl bg-resin-amber/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Brain class="w-6 h-6 text-resin-amber" />
                </div>
                <h3 class="text-xl font-bold text-resin-charcoal mb-3">AI that understands mess</h3>
                <p class="text-resin-earth/65 text-sm leading-relaxed mb-5">Dump thoughts, voice memos, half-sentences. The AI figures out what matters and structures it into a plan you can actually execute.</p>
                <div class="space-y-1.5 text-xs text-resin-earth/50">
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-amber" /> Granular micro-steps</div>
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-amber" /> Time estimates per task</div>
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-amber" /> Learns your working style</div>
                </div>
            </div>

            <div class="group glass-card rounded-2xl p-8 hover:border-resin-forest/40 hover:-translate-y-1 transition-all duration-500">
                <div class="w-12 h-12 rounded-xl bg-resin-forest/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Lock class="w-6 h-6 text-resin-forest" />
                </div>
                <h3 class="text-xl font-bold text-resin-charcoal mb-3">Blocking that actually works</h3>
                <p class="text-resin-earth/65 text-sm leading-relaxed mb-5">Not a browser extension. Not a timer. OS-level Screen Time blocking across all your Apple devices. No workarounds, no disabling, no "just five minutes."</p>
                <div class="space-y-1.5 text-xs text-resin-earth/50">
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-forest" /> iPhone + iPad + Mac</div>
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-forest" /> Chrome extension included</div>
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-forest" /> Synced blocking start time</div>
                </div>
            </div>

            <div class="group glass-card rounded-2xl p-8 hover:border-resin-charcoal/30 hover:-translate-y-1 transition-all duration-500">
                <div class="w-12 h-12 rounded-xl bg-resin-charcoal/8 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <TrendingUp class="w-6 h-6 text-resin-charcoal" />
                </div>
                <h3 class="text-xl font-bold text-resin-charcoal mb-3">Reflect and compound</h3>
                <p class="text-resin-earth/65 text-sm leading-relaxed mb-5">After each session, Resin asks how it went. Your feedback refines future plans. Over time, the AI gets more accurate to your pace, your resistance, your style.</p>
                <div class="space-y-1.5 text-xs text-resin-earth/50">
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-charcoal" /> Post-session reflection</div>
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-charcoal" /> Streak & progress tracking</div>
                    <div class="flex items-center gap-2"><Check class="w-3 h-3 text-resin-charcoal" /> Plans adapt over time</div>
                </div>
            </div>
        </div>
    </section>

    <!-- ─── SOCIAL PROOF ─── -->
    <section class="w-full bg-[#F7F3EC] py-20 px-6 mb-24" data-section="social">
        <div class="max-w-6xl mx-auto">

            <!-- Stats row -->
            <div class="grid grid-cols-3 gap-8 mb-16 text-center">
                <div>
                    <div class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif">2,400+</div>
                    <div class="text-resin-earth/60 text-sm mt-1">sessions completed</div>
                </div>
                <div>
                    <div class="text-4xl md:text-5xl font-bold text-resin-amber font-serif">87%</div>
                    <div class="text-resin-earth/60 text-sm mt-1">of plans finished</div>
                </div>
                <div>
                    <div class="text-4xl md:text-5xl font-bold text-resin-forest font-serif">4.8★</div>
                    <div class="text-resin-earth/60 text-sm mt-1">avg session rating</div>
                </div>
            </div>

            <!-- Testimonials -->
            <div class="grid md:grid-cols-3 gap-6">
                {#each testimonials as t}
                    <div class="bg-white rounded-2xl p-7 shadow-sm border border-resin-earth/8">
                        <div class="flex gap-0.5 mb-4">
                            {#each [1,2,3,4,5] as _}
                                <span class="text-resin-amber text-sm">★</span>
                            {/each}
                        </div>
                        <p class="text-resin-charcoal text-sm leading-relaxed mb-5 italic">"{t.quote}"</p>
                        <div>
                            <div class="font-semibold text-resin-charcoal text-sm">{t.name}</div>
                            <div class="text-resin-earth/50 text-xs">{t.role}</div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </section>

    <!-- ─── COMPARISON TABLE ─── -->
    <section class="max-w-4xl mx-auto px-6 mb-24" data-section="compare">
        <div class="text-center mb-12">
            <p class="text-resin-earth/50 text-sm font-semibold uppercase tracking-widest mb-3">How it stacks up</p>
            <h2 class="text-4xl font-bold text-resin-charcoal font-serif">Why not just use Notion or Forest?</h2>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="border-b-2 border-resin-charcoal/10">
                        <th class="text-left py-4 pr-6 text-resin-earth/50 font-medium">Feature</th>
                        <th class="py-4 px-4 text-resin-charcoal font-bold text-center">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-resin-amber/10 text-resin-amber rounded-full text-xs font-bold">🌿 Resin</span>
                        </th>
                        <th class="py-4 px-4 text-resin-earth/40 font-medium text-center text-xs">Notion</th>
                        <th class="py-4 px-4 text-resin-earth/40 font-medium text-center text-xs">Todoist</th>
                        <th class="py-4 px-4 text-resin-earth/40 font-medium text-center text-xs">Forest</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-resin-earth/8">
                    {#each [
                        ['AI turns thoughts into plans', true, false, false, false],
                        ['Real OS-level app blocking', true, false, false, '⚠️'],
                        ['Cross-device sync blocking', true, false, false, false],
                        ['Task scheduling on calendar', true, '⚠️', true, false],
                        ['Reflection & AI improvement', true, false, false, false],
                        ['Works without extra setup', true, false, true, true],
                    ] as [label, resin, notion, todoist, forest]}
                        <tr class="hover:bg-resin-amber/3 transition-colors">
                            <td class="py-4 pr-6 text-resin-charcoal/80 font-medium">{label}</td>
                            <td class="py-4 px-4 text-center">
                                {#if resin === true}
                                    <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-resin-forest/10"><Check class="w-3.5 h-3.5 text-resin-forest" /></span>
                                {:else if resin === false}
                                    <span class="text-resin-earth/25 text-lg">—</span>
                                {:else}
                                    <span class="text-sm">{resin}</span>
                                {/if}
                            </td>
                            {#each [notion, todoist, forest] as val}
                                <td class="py-4 px-4 text-center">
                                    {#if val === true}
                                        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-resin-earth/8"><Check class="w-3 h-3 text-resin-earth/50" /></span>
                                    {:else if val === false}
                                        <span class="text-resin-earth/20 text-lg">—</span>
                                    {:else}
                                        <span class="text-sm text-resin-earth/40">{val}</span>
                                    {/if}
                                </td>
                            {/each}
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <p class="text-resin-earth/35 text-xs mt-4 text-center">⚠️ = partial / requires workarounds</p>
    </section>

    <!-- ─── FAQ ─── -->
    <section class="max-w-2xl mx-auto px-6 mb-24" data-section="faq">
        <div class="text-center mb-12">
            <h2 class="text-4xl font-bold text-resin-charcoal font-serif">Questions</h2>
        </div>
        <div class="space-y-3">
            {#each faqs as faq, i}
                <div class="glass-card rounded-xl overflow-hidden transition-all duration-300">
                    <button
                        onclick={() => toggleFaq(i)}
                        class="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-resin-amber/3 transition-colors"
                    >
                        <span class="font-semibold text-resin-charcoal pr-4">{faq.q}</span>
                        <ChevronDown class="w-5 h-5 text-resin-earth/40 flex-shrink-0 transition-transform duration-300 {openFaq === i ? 'rotate-180' : ''}" />
                    </button>
                    {#if openFaq === i}
                        <div class="px-6 pb-5 text-resin-earth/70 text-sm leading-relaxed border-t border-resin-earth/8 pt-4">
                            {faq.a}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </section>

    <!-- ─── FINAL CTA ─── -->
    <section class="w-full bg-resin-charcoal py-24 px-6" data-section="cta">
        <div class="max-w-3xl mx-auto text-center">
            <div class="text-5xl mb-6">🌲</div>
            <h2 class="text-4xl md:text-5xl font-bold text-white font-serif mb-5 leading-tight">
                Stop planning to do it.<br />
                <span class="text-resin-amber">Actually do it.</span>
            </h2>
            <p class="text-white/60 text-lg mb-10 max-w-xl mx-auto">
                The thought in your head right now — the one you've been putting off — Resin can turn it into a scheduled plan with blocked distractions in under 60 seconds.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
                <a href="/login?next=/" class="group inline-flex items-center justify-center px-10 py-4 bg-resin-amber text-white rounded-full font-bold text-lg hover:bg-white hover:text-resin-charcoal transition-all duration-300 shadow-2xl hover:shadow-3xl hover:-translate-y-0.5 w-full sm:w-auto">
                    Start for Free
                    <svg class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd" />
                    </svg>
                </a>
                <a href="https://testflight.apple.com/join/yV53qa1z" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center px-10 py-4 border border-white/20 text-white/70 rounded-full font-semibold text-base hover:border-white/50 hover:text-white transition-all duration-300 w-full sm:w-auto">
                    <Apple class="w-5 h-5 mr-2" />
                    iOS App (Beta)
                </a>
            </div>
            <p class="text-white/30 text-sm">Free forever for core features. No credit card.</p>
        </div>
    </section>

</main>
