<script lang="ts">
    import { Lightbulb, Zap, Lock, BarChart3, Brain, Shield, Cpu, Calendar, Check, Smartphone, Globe, Chrome, Apple } from 'lucide-svelte';
    import { onMount } from 'svelte';

    let sectionRefs: { [key: string]: HTMLElement | null } = {};
    let animatedSections = $state<{ [key: string]: boolean }>({});
    let elementRefs: { [key: string]: HTMLElement | null } = {};
    let animatedElements = $state<{ [key: string]: boolean }>({});

    onMount(() => {
        // Immediately show content that's in viewport on load
        const sections = document.querySelectorAll('[data-section]');
        sections.forEach((section) => {
            const rect = section.getBoundingClientRect();
            if (rect.top < window.innerHeight + 50) {
                const key = section.getAttribute('data-section');
                if (key) animatedSections[key] = true;
            }
        });

        const elements = document.querySelectorAll('[data-element]');
        elements.forEach((element) => {
            const rect = element.getBoundingClientRect();
            if (rect.top < window.innerHeight + 50) {
                const key = element.getAttribute('data-element');
                if (key) animatedElements[key] = true;
            }
        });

        // Create intersection observer to trigger animations on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const key = entry.target.getAttribute('data-section');
                    const elementKey = entry.target.getAttribute('data-element');

                    if (key) animatedSections[key] = true;
                    if (elementKey) animatedElements[elementKey] = true;

                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.05, rootMargin: '50px' });

        // Observe all sections with data-section attribute
        sections.forEach((section) => {
            observer.observe(section);
        });

        // Observe all elements with data-element attribute
        elements.forEach((element) => {
            observer.observe(element);
        });

        return () => observer.disconnect();
    });
</script>

<!-- Main Content -->
<main class="flex-grow pt-20 pb-20 px-6 relative z-10 w-full overflow-hidden">
    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto mb-16">
        <!-- Hero Content: Text Left, Visual Right -->
        <div class="grid md:grid-cols-2 gap-16 items-center">
            <!-- Left: Text -->
            <div>
                <h1
                    class="text-5xl md:text-7xl font-bold text-resin-charcoal font-serif mb-6 tracking-tight leading-[1.15]"
                >
                    What you know you need to do,<br />
                    <span class="text-resin-forest">actually done.</span>
                </h1>

                <p class="text-lg md:text-xl text-resin-earth/70 mb-8 font-light leading-relaxed">
                    Turn thoughts into plans. Block distractions. Actually follow through.
                </p>

                <!-- CTA Buttons -->
                <div class="flex flex-col sm:flex-row gap-4 mb-12">
                    <a
                        href="/login?next=/"
                        class="group relative inline-flex items-center justify-center px-8 py-4 bg-resin-forest text-white rounded-full font-semibold text-lg hover:bg-resin-charcoal transition-all duration-500 shadow-premium hover:shadow-2xl hover:-translate-y-1 w-full sm:w-auto text-center"
                    >
                        Start for Free
                        <svg
                            class="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clip-rule="evenodd"
                            />
                        </svg>
                    </a>
                    <a
                        href="https://testflight.apple.com/join/yV53qa1z"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="group relative inline-flex items-center justify-center px-8 py-4 bg-resin-charcoal/10 text-resin-charcoal rounded-full font-semibold text-lg hover:bg-resin-amber hover:text-white transition-all duration-500 border border-resin-charcoal/20 hover:border-resin-amber w-full sm:w-auto text-center"
                    >
                        <Apple class="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                        Get the iOS App
                    </a>
                </div>

                <!-- Privacy Trust Line -->
                <div class="flex items-center gap-2 text-sm text-resin-earth/60">
                    <svg class="w-4 h-4 text-resin-forest" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                    </svg>
                    <span>Your thoughts are completely encrypted and private.</span>
                </div>
            </div>

            <!-- Right: Real App UI Mockups (Exact Styling from App) -->
            <div class="hidden md:flex justify-center items-center relative h-[500px]">
                <!-- Layer 1: Web Amber Sessions List (back layer) -->
                <div class="absolute bottom-16 right-24 w-80 rounded-2xl shadow-2xl transform -rotate-6 opacity-85 z-10">
                    <div class="bg-white/60 backdrop-blur-md rounded-2xl border border-resin-forest/5 overflow-hidden">
                        <!-- Browser Header -->
                        <div class="p-4 border-b border-resin-forest/5 bg-white/40">
                            <h2 class="text-sm font-bold text-resin-charcoal">Sessions <span class="text-xs font-normal text-resin-earth/60">(2)</span></h2>
                        </div>
                        <!-- Session list -->
                        <div class="p-3 space-y-2 max-h-48">
                            <div class="p-3 rounded-lg bg-resin-forest/5 border border-resin-forest/10">
                                <div class="flex items-center justify-between mb-1">
                                    <h3 class="font-semibold text-sm text-resin-charcoal">Launch Project</h3>
                                    <span class="text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-resin-amber">Scheduled</span>
                                </div>
                                <div class="flex justify-between text-xs text-resin-earth/60">
                                    <span>Mar 10</span>
                                    <span class="font-mono">480m</span>
                                </div>
                            </div>
                            <div class="p-3 rounded-lg hover:bg-black/5">
                                <div class="flex items-center justify-between mb-1">
                                    <h3 class="font-semibold text-sm text-resin-charcoal">Finish Report</h3>
                                    <span class="text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-resin-forest">Completed</span>
                                </div>
                                <div class="flex justify-between text-xs text-resin-earth/60">
                                    <span>Mar 9</span>
                                    <span class="font-mono">120m</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Layer 2: iPhone Brain Dump (middle) -->
                <div class="absolute left-0 bottom-4 w-72 bg-gradient-to-b from-white to-stone-50 rounded-3xl border-8 border-black shadow-2xl overflow-hidden transform -rotate-2 z-20">
                    <!-- Content -->
                    <div class="px-5 py-5 space-y-4">
                        <p class="text-resin-earth/60 text-xs font-light leading-relaxed">Dump your chaotic thoughts, code snippets, and scattered ideas here...</p>
                        <div class="bg-white/80 rounded-lg p-3 border border-resin-earth/20 min-h-28 text-xs text-resin-charcoal leading-relaxed">Clean my room. Been putting it off all week. Too much stuff on the floor, clothes everywhere, desk is a mess. Need to actually do this today.</div>
                    </div>
                    <!-- Bottom buttons (exact app styling) -->
                    <div class="px-4 py-3 space-y-3 border-t border-resin-earth/10 bg-white/50">
                        <div class="flex gap-2">
                            <button class="flex-1 text-resin-forest font-semibold text-xs py-3 px-2 rounded-lg border border-resin-forest/30 bg-resin-forest/10 flex items-center justify-center gap-1.5">
                                <span class="text-sm">↓</span>
                                Save
                            </button>
                            <button class="flex-1 bg-resin-forest text-white font-bold text-xs py-3 px-2 rounded-lg flex items-center justify-center gap-1.5">
                                <span class="text-sm">✨</span>
                                Activate
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Layer 3: iPhone Plan View (front/top - exactly as it appears in app) -->
                <div class="absolute right-6 top-0 w-72 bg-gradient-to-b from-white to-stone-50 rounded-3xl border-8 border-black shadow-2xl overflow-hidden transform rotate-3 z-30">
                    <!-- Amber header (exact app colors) -->
                    <div class="bg-resin-amber px-5 py-3 text-white">
                        <div class="flex items-center justify-between mb-1">
                            <h2 class="text-sm font-bold">Clean my room</h2>
                            <span class="text-[9px] font-bold opacity-90">4 tasks</span>
                        </div>
                        <div class="text-xs font-light opacity-90">Total: 1 hour</div>
                    </div>
                    <!-- Task list (exact app styling) -->
                    <div class="px-5 py-4 space-y-3">
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-white bg-resin-forest w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">1</span>
                                <span class="font-semibold text-xs text-resin-charcoal">Put away clothes</span>
                            </div>
                            <p class="text-xs text-resin-earth/60 ml-7">15m</p>
                        </div>
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-white bg-resin-forest w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">2</span>
                                <span class="font-semibold text-xs text-resin-charcoal">Organize desk</span>
                            </div>
                            <p class="text-xs text-resin-earth/60 ml-7">20m</p>
                        </div>
                        <div class="space-y-0.5">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-white bg-resin-forest w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0">3</span>
                                <span class="font-semibold text-xs text-resin-charcoal">Sweep & tidy</span>
                            </div>
                            <p class="text-xs text-resin-earth/60 ml-7">15m</p>
                        </div>
                    </div>
                    <!-- Action button -->
                    <div class="px-4 py-3 border-t border-resin-amber/20 bg-white/50">
                        <button class="w-full bg-resin-amber text-white font-bold text-xs py-2.5 rounded-lg hover:bg-resin-amber/90 transition-colors">
                            Schedule Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Problem Section with Visual -->
    <section class="max-w-5xl mx-auto mb-16">
        <div class="grid md:grid-cols-2 gap-12 items-center">
            <!-- Left: Problems -->
            <div class="space-y-8">
                <div>
                    <h2 class="text-4xl font-bold text-resin-charcoal font-serif mb-8">The Problem</h2>
                    <div class="space-y-6">
                        <div class="flex gap-4">
                            <div class="flex-shrink-0 mt-1">
                                <Lightbulb class="w-6 h-6 text-resin-amber" />
                            </div>
                            <div>
                                <h3 class="font-bold text-resin-charcoal mb-1">The intention-action gap</h3>
                                <p class="text-resin-earth/70 text-sm">You know exactly what needs to happen. You make plans. But then distractions pile up and days slip by without progress.</p>
                            </div>
                        </div>
                        <div class="flex gap-4">
                            <div class="flex-shrink-0 mt-1">
                                <Zap class="w-6 h-6 text-resin-forest" />
                            </div>
                            <div>
                                <h3 class="font-bold text-resin-charcoal mb-1">Endless distractions</h3>
                                <p class="text-resin-earth/70 text-sm">Your phone buzzes. You check "just one message." Two hours vanish.</p>
                            </div>
                        </div>
                        <div class="flex gap-4">
                            <div class="flex-shrink-0 mt-1">
                                <Shield class="w-6 h-6 text-resin-charcoal" />
                            </div>
                            <div>
                                <h3 class="font-bold text-resin-charcoal mb-1">No real accountability</h3>
                                <p class="text-resin-earth/70 text-sm">You create plans. You abandon them. No system holds you to them.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Visual -->
            <div class="relative h-80 hidden md:block">
                <div class="absolute inset-0 bg-gradient-to-br from-resin-amber/20 to-resin-forest/20 rounded-3xl blur-2xl"></div>
                <div class="absolute inset-0 bg-[#FCF9F2] rounded-3xl border border-resin-forest/10 flex items-center justify-center">
                    <div class="text-center px-8">
                        <Calendar class="w-16 h-16 text-resin-amber mx-auto mb-4" />
                        <p class="text-resin-charcoal font-bold mb-2">You're losing hours to screens.</p>
                        <p class="text-resin-earth/60 text-sm">Resin blocks them and fills the time with what matters.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Core Features Section -->
    <section class="max-w-6xl mx-auto mb-16">
        <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif mb-4">A system built for focus</h2>
            <p class="text-resin-earth/70 max-w-2xl mx-auto">Three powerful tools working together so you actually finish what you start</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
            <!-- Feature 1: AI Planning -->
            <div class="group glass-card rounded-2xl p-8 hover:border-resin-amber/30 transition-all duration-500">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-amber/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Brain class="w-7 h-7 text-resin-amber" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">AI-Powered Plans</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    Tell Resin your idea. It breaks it into concrete steps with time estimates and strategies. No more "what do I do first?"
                </p>
                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ Auto-generates tasks</div>
                    <div>✓ Time-bound breakdown</div>
                    <div>✓ Strategic guidance</div>
                </div>
            </div>

            <!-- Feature 2: Blocking -->
            <div class="group glass-card rounded-2xl p-8 hover:border-resin-forest/30 transition-all duration-500">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-forest/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Lock class="w-7 h-7 text-resin-forest" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">Real App Blocking</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    When you focus, Resin blocks YouTube, Reddit, Twitter, TikTok and social apps on iPhone, iPad, and Mac. Zero willpower needed.
                </p>
                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ iOS + Mac blocking</div>
                    <div>✓ Browser extension</div>
                    <div>✓ Can't bypass</div>
                </div>
            </div>

            <!-- Feature 3: Accountability -->
            <div class="group glass-card rounded-2xl p-8 hover:border-resin-charcoal/30 transition-all duration-500">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-charcoal/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <BarChart3 class="w-7 h-7 text-resin-charcoal" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">Track & Reflect</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    After every session, you reflect. Your feedback refines Resin AI, making it smarter and more personalized to your style. Over time, you improve. It improves. You both grow together.
                </p>
                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ Your feedback trains your AI</div>
                    <div>✓ Plans get more tailored</div>
                    <div>✓ See patterns and improve</div>
                </div>
            </div>
        </div>
    </section>

    <!-- How It Works Section with Mockups -->
    <section class="max-w-7xl mx-auto mb-16">
        <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif mb-4">How It Works</h2>
            <p class="text-resin-earth/70 max-w-2xl mx-auto">From intention to action. See how distractions disappear and work actually gets done.</p>
        </div>

        <!-- Step 1: Brain Dump -->
        <div class="mb-16">
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div class="order-2 md:order-1">
                    <!-- iPhone Mockup: Brain Dump -->
                    <div class="flex justify-center">
                        <div class="w-80 bg-gradient-to-b from-white to-gray-50 rounded-3xl border-8 border-black shadow-2xl overflow-hidden">
                            <div class="px-6 py-6 min-h-96">
                                <h3 class="text-resin-charcoal font-bold text-lg mb-4">What's on your mind?</h3>
                                <div class="bg-gray-100 rounded-2xl p-4 mb-4 border-2 border-resin-amber/30">
                                    <p class="text-resin-charcoal text-sm leading-relaxed">Clean my room. I keep saying I'll do it but I get distracted by my phone. I need to actually get off screens and finish this today.</p>
                                </div>
                                <button class="w-full bg-resin-forest text-white rounded-full py-3 font-semibold text-sm">Generate Plan</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="order-1 md:order-2">
                    <div class="space-y-6">
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-8 h-8 rounded-full bg-resin-amber text-white flex items-center justify-center text-sm font-bold">1</div>
                                <h3 class="text-2xl font-bold text-resin-charcoal">Brain dump</h3>
                            </div>
                            <p class="text-resin-earth/70 text-lg">Just type your raw idea. No need to structure it perfectly. Resin understands messy, scattered thoughts.</p>
                        </div>
                        <ul class="space-y-3">
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Works on iPhone, iPad, web, and Mac</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Auto-save as you type</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Synced across all devices</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 2: AI Planning -->
        <div class="mb-16">
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div class="order-1">
                    <div class="space-y-6">
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-8 h-8 rounded-full bg-resin-forest text-white flex items-center justify-center text-sm font-bold">2</div>
                                <h3 class="text-2xl font-bold text-resin-charcoal">AI creates a plan</h3>
                            </div>
                            <p class="text-resin-earth/70 text-lg">Resin AI analyzes your idea and breaks it into concrete steps with time estimates and strategies.</p>
                        </div>
                        <ul class="space-y-3">
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Instant plan generation</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Time-bound tasks you can actually complete</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Edit and refine the plan</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="order-2">
                    <!-- Web Mockup: Plan Generation -->
                    <div class="flex justify-center">
                        <div class="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden w-full max-w-md">
                            <div class="bg-gradient-to-r from-resin-amber/90 to-resin-amber text-white px-6 py-4">
                                <h3 class="font-bold">Clean my room</h3>
                            </div>
                            <div class="p-6 space-y-4">
                                <div class="space-y-2">
                                    <div class="text-sm font-semibold text-resin-charcoal">Your Plan (4 steps • 1 hour total)</div>
                                    <div class="space-y-3">
                                        <div class="flex gap-3 pb-3 border-b border-gray-100">
                                            <div class="w-6 h-6 rounded-full bg-resin-forest/20 text-resin-forest flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                                            <div class="flex-grow">
                                                <p class="text-sm font-semibold text-resin-charcoal">Put away clothes</p>
                                                <p class="text-xs text-resin-earth/60">15 min</p>
                                            </div>
                                        </div>
                                        <div class="flex gap-3 pb-3 border-b border-gray-100">
                                            <div class="w-6 h-6 rounded-full bg-resin-forest/20 text-resin-forest flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                                            <div class="flex-grow">
                                                <p class="text-sm font-semibold text-resin-charcoal">Organize desk</p>
                                                <p class="text-xs text-resin-earth/60">20 min</p>
                                            </div>
                                        </div>
                                        <div class="flex gap-3 pb-3 border-b border-gray-100">
                                            <div class="w-6 h-6 rounded-full bg-resin-forest/20 text-resin-forest flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                                            <div class="flex-grow">
                                                <p class="text-sm font-semibold text-resin-charcoal">Sweep and tidy</p>
                                                <p class="text-xs text-resin-earth/60">15 min</p>
                                            </div>
                                        </div>
                                        <div class="flex gap-3">
                                            <div class="w-6 h-6 rounded-full bg-resin-forest/20 text-resin-forest flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                                            <div class="flex-grow">
                                                <p class="text-sm font-semibold text-resin-charcoal">Make bed & final check</p>
                                                <p class="text-xs text-resin-earth/60">10 min</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button class="w-full bg-resin-forest text-white rounded-full py-2 font-semibold text-sm">Schedule Focus Session</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 3: Schedule Focus -->
        <div class="mb-16">
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div class="order-2 md:order-1">
                    <!-- Mockup: Focus Session Scheduling -->
                    <div class="flex justify-center">
                        <div class="w-80 bg-gradient-to-b from-white to-gray-50 rounded-3xl border-8 border-black shadow-2xl overflow-hidden">
                            <div class="px-6 py-6 min-h-96 space-y-4">
                                <h3 class="text-resin-charcoal font-bold text-lg">When do you want to focus?</h3>
                                <div class="bg-resin-forest/10 rounded-2xl p-4 border border-resin-forest/20">
                                    <div class="text-sm text-resin-charcoal font-semibold mb-2">Today at 2:00 PM</div>
                                    <div class="text-xs text-resin-earth/60">Duration: 2 hours</div>
                                </div>
                                <div class="space-y-2 pt-4">
                                    <div class="flex items-center gap-2 p-3 rounded-xl bg-gray-100">
                                        <div class="w-4 h-4 rounded border-2 border-resin-forest"></div>
                                        <span class="text-sm text-resin-charcoal">Block distracting apps</span>
                                    </div>
                                    <div class="text-xs text-resin-earth/60 px-3">
                                        YouTube, Reddit, Twitter, Instagram, TikTok, Facebook
                                    </div>
                                </div>
                                <button class="w-full bg-resin-amber text-white rounded-full py-3 font-semibold text-sm mt-4">Schedule</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="order-1 md:order-2">
                    <div class="space-y-6">
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-8 h-8 rounded-full bg-resin-amber text-white flex items-center justify-center text-sm font-bold">3</div>
                                <h3 class="text-2xl font-bold text-resin-charcoal">Schedule focus time</h3>
                            </div>
                            <p class="text-resin-earth/70 text-lg">Pick when you want to focus. Resin will automatically block distracting apps on all your devices at that time.</p>
                        </div>
                        <ul class="space-y-3">
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Syncs to iPhone, iPad, Mac, web</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Can't be disabled or bypassed</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Blocking applies across all platforms</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 4: Focus & Execute -->
        <div class="mb-16">
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div class="order-1">
                    <div class="space-y-6">
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-8 h-8 rounded-full bg-resin-forest text-white flex items-center justify-center text-sm font-bold">4</div>
                                <h3 class="text-2xl font-bold text-resin-charcoal">Execute without distractions</h3>
                            </div>
                            <p class="text-resin-earth/70 text-lg">When focus time arrives, Resin blocks everything. No notifications. No way out. Just deep work.</p>
                        </div>
                        <ul class="space-y-3">
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">All blocked apps show a block screen</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Timer shows remaining focus time</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Work in peace, uninterrupted</span>
                            </li>
                        </ul>
                    </div>
                </div>
                <div class="order-2">
                    <!-- Block Screen Mockup -->
                    <div class="flex justify-center">
                        <div class="w-80 bg-gradient-to-b from-white to-gray-50 rounded-3xl border-8 border-black shadow-2xl overflow-hidden">
                            <div class="bg-resin-forest/90 text-white px-6 py-4 flex items-center justify-between">
                                <span class="text-xs font-semibold">2:14 PM</span>
                                <div class="flex gap-1">
                                    <div class="w-1 h-3 bg-white rounded-sm"></div>
                                    <div class="w-1 h-3 bg-white rounded-sm"></div>
                                </div>
                            </div>
                            <div class="px-6 py-12 min-h-96 flex flex-col items-center justify-center bg-gradient-to-b from-resin-forest/5 to-resin-amber/5 text-center">
                                <div class="text-3xl mb-4">🌲</div>
                                <h3 class="text-lg font-bold text-resin-charcoal mb-2">Focus in progress</h3>
                                <p class="text-sm text-resin-earth/70 mb-6">You're in a focus session. This app is blocked.</p>
                                <div class="bg-white rounded-2xl px-6 py-4 mb-6">
                                    <div class="text-xs text-resin-earth/60 mb-1">Time remaining</div>
                                    <div class="text-3xl font-bold text-resin-amber">1h 42m</div>
                                </div>
                                <p class="text-xs text-resin-earth/50">Your work is important. Stay focused.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 5: Reflect & Track -->
        <div>
            <div class="grid md:grid-cols-2 gap-12 items-center">
                <div class="order-2 md:order-1">
                    <!-- Reflection Mockup -->
                    <div class="flex justify-center">
                        <div class="bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden w-full max-w-md">
                            <div class="bg-gradient-to-r from-resin-forest to-resin-forest/80 text-white px-6 py-4">
                                <h3 class="font-bold">Reflect on your work</h3>
                                <p class="text-xs text-white/80">You completed a 2-hour focus session</p>
                            </div>
                            <div class="p-6 space-y-4">
                                <div>
                                    <label class="text-sm font-semibold text-resin-charcoal block mb-2">How did it go?</label>
                                    <textarea class="w-full rounded-xl border border-gray-300 p-3 text-sm focus:outline-none focus:border-resin-forest" placeholder="What went well? Any blockers? What would you do differently?" rows="4"></textarea>
                                </div>
                                <div>
                                    <label class="text-sm font-semibold text-resin-charcoal block mb-2">Tasks completed</label>
                                    <div class="space-y-2">
                                        <div class="flex gap-2">
                                            <input type="checkbox" class="w-4 h-4 rounded" checked />
                                            <span class="text-sm text-resin-charcoal line-through text-resin-earth/60">Put away clothes</span>
                                        </div>
                                        <div class="flex gap-2">
                                            <input type="checkbox" class="w-4 h-4 rounded" checked />
                                            <span class="text-sm text-resin-charcoal line-through text-resin-earth/60">Organize desk</span>
                                        </div>
                                    </div>
                                </div>
                                <button class="w-full bg-resin-forest text-white rounded-full py-2 font-semibold text-sm">Save Reflection</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="order-1 md:order-2">
                    <div class="space-y-6">
                        <div>
                            <div class="flex items-center gap-3 mb-2">
                                <div class="w-8 h-8 rounded-full bg-resin-forest text-white flex items-center justify-center text-sm font-bold">5</div>
                                <h3 class="text-2xl font-bold text-resin-charcoal">Reflect & improve</h3>
                            </div>
                            <p class="text-resin-earth/70 text-lg">After each session, Resin asks how it went. Over time, you see patterns. You get better. You actually grow.</p>
                        </div>
                        <ul class="space-y-3">
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Guided reflection prompts</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">Track which tasks you complete</span>
                            </li>
                            <li class="flex gap-3">
                                <span class="text-resin-forest font-bold">✓</span>
                                <span class="text-resin-earth/70">See your progress over weeks</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Complete Productivity System Section -->
    <section class="max-w-6xl mx-auto mb-12">
        <div class="text-center mb-16">
            <h2 class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif mb-4">A complete system</h2>
            <p class="text-resin-earth/70 max-w-2xl mx-auto">Notes, scheduling, and automation—everything you need</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8">
            <!-- Feature: Note-Taking -->
            <div class="group glass-card rounded-2xl p-8 hover:border-resin-amber/30 transition-all duration-500">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-amber/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Brain class="w-7 h-7 text-resin-amber" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">Capture & Connect</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    Keep thoughts, research, and notes in one place. Connect them to your plans.
                </p>
                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ Encrypted note storage</div>
                    <div>✓ Link notes to plans</div>
                    <div>✓ Full-text search</div>
                </div>
            </div>

            <!-- Feature: Smart Scheduling -->
            <div class="group glass-card rounded-2xl p-8 hover:border-resin-forest/30 transition-all duration-500">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-forest/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Calendar class="w-7 h-7 text-resin-forest" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">Intelligent Scheduling</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    Schedule sessions that sync to your calendar. Smart blocking avoids conflicts.
                </p>
                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ Calendar sync</div>
                    <div>✓ Smart time detection</div>
                    <div>✓ Recurring sessions</div>
                </div>
            </div>

            <!-- Feature: Integrations -->
            <div class="group glass-card rounded-2xl p-8 hover:border-resin-charcoal/30 transition-all duration-500">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-charcoal/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Cpu class="w-7 h-7 text-resin-charcoal" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">Supercharge with Integrations</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    Integrate with Zapier and webhooks. Build custom workflows that match your needs.
                </p>
                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ OpenClaw integration</div>
                    <div>✓ Webhook support</div>
                    <div>✓ Custom automation</div>
                </div>
            </div>
        </div>
    </section>

    <!-- Forest & Community Section -->
    <section
        bind:this={sectionRefs['forest']}
        data-section="forest"
        class="max-w-6xl mx-auto mb-12 md:mb-20 px-4 md:px-0 transition-all duration-700 {animatedSections['forest'] ? 'opacity-100 translate-y-0' : 'opacity-100 translate-y-0'}"
    >
        <div class="text-center mb-8 md:mb-16">
            <h2 class="text-3xl md:text-5xl font-bold text-resin-charcoal font-serif mb-3 md:mb-4">Grow together</h2>
            <p class="text-sm md:text-base text-resin-earth/70 max-w-2xl mx-auto">Visualize progress and build accountability</p>
        </div>

        <div class="grid md:grid-cols-2 gap-4 md:gap-8">
            <!-- Feature: Petrified Forest -->
            <div class="group glass-card rounded-2xl p-6 md:p-8 hover:border-resin-forest/30 transition-all duration-500 md:transform md:hover:scale-105">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-forest/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Smartphone class="w-7 h-7 text-resin-forest" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">Your Petrified Forest</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    Every session grows your forest. Completed tasks turn to stone and earn rewards. Visual proof of your progress.
                </p>

                <!-- Forest Visualization -->
                <div class="mb-6 p-4 bg-gradient-to-b from-resin-forest/5 to-resin-amber/5 rounded-xl border border-resin-forest/10 flex items-end justify-center gap-3 h-32">
                    <!-- Young tree -->
                    <div class="flex flex-col items-center gap-1">
                        <div class="text-2xl">🌱</div>
                        <div class="text-[9px] text-resin-earth/50 font-semibold">Day 1</div>
                    </div>
                    <!-- Growing tree -->
                    <div class="flex flex-col items-center gap-1">
                        <div class="text-3xl">🌲</div>
                        <div class="text-[9px] text-resin-earth/50 font-semibold">Week 2</div>
                    </div>
                    <!-- Strong tree -->
                    <div class="flex flex-col items-center gap-1">
                        <div class="text-4xl">🌳</div>
                        <div class="text-[9px] text-resin-earth/50 font-semibold">Month 1</div>
                    </div>
                    <!-- Petrified tree (with amber glow) -->
                    <div class="flex flex-col items-center gap-1">
                        <div class="text-4xl drop-shadow-lg" style="filter: drop-shadow(0 0 6px rgba(212, 147, 58, 0.6));">🪨</div>
                        <div class="text-[9px] text-resin-amber font-bold">Petrified</div>
                    </div>
                </div>

                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ Trees grow with each session</div>
                    <div>✓ Earn amber as you focus</div>
                    <div>✓ Visual proof of progress</div>
                </div>
            </div>

            <!-- Feature: Study Together -->
            <div class="group glass-card rounded-2xl p-6 md:p-8 hover:border-resin-amber/30 transition-all duration-500 md:transform md:hover:scale-105">
                <div class="mb-6">
                    <div class="w-14 h-14 rounded-xl bg-resin-amber/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Zap class="w-7 h-7 text-resin-amber" />
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal mb-2">Study with Friends</h3>
                </div>
                <p class="text-resin-earth/70 font-light mb-6">
                    Study in sync with friends. Block distractions together and build accountability.
                </p>
                <div class="space-y-2 text-xs text-resin-earth/60 font-medium">
                    <div>✓ Synchronized focus sessions</div>
                    <div>✓ Group accountability</div>
                    <div>✓ Share progress and celebrate wins</div>
                </div>
            </div>
        </div>
    </section>
</main>
