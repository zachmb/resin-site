<script lang="ts">
</script>

<!-- Main Content -->
<main class="flex-grow pt-32 pb-20 px-6 relative z-10 w-full overflow-hidden">
    <!-- Hero Section -->
    <section class="max-w-4xl mx-auto text-center mb-32">
        <h1
            class="text-5xl md:text-8xl font-bold text-resin-charcoal font-serif mb-8 tracking-tight leading-[1.1] text-balance"
        >
            Notes that <br />
            <span class="text-resin-forest italic serif">actually happe.</span>
        </h1>

        <p
            class="text-xl md:text-2xl text-resin-earth/80 max-w-2xl mx-auto mb-12 font-light leading-relaxed text-balance"
        >
            Resin uses AI to develop actionable plans for your thoughts and
            keeps you accountable. Stop letting your best ideas fade away.
        </p>

        <div
            class="flex flex-col sm:flex-row items-center justify-center gap-5"
        >
            <a
                href="https://testflight.apple.com/join/yV53qa1z"
                target="_blank"
                rel="noopener noreferrer"
                class="group relative inline-flex items-center justify-center px-10 py-4.5 bg-resin-charcoal text-white rounded-full font-semibold text-lg hover:bg-resin-forest transition-all duration-500 shadow-premium hover:shadow-2xl hover:-translate-y-1 w-full sm:w-auto"
            >
                Get started today
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
                href="#magic"
                class="text-resin-earth font-medium hover:text-resin-forest transition-colors flex items-center gap-2 group"
            >
                See how it works
                <span
                    class="w-8 h-[1px] bg-resin-earth/30 group-hover:w-12 group-hover:bg-resin-forest/50 transition-all"
                ></span>
            </a>
        </div>
    </section>

    <!-- App Preview Card -->
    <div class="max-w-6xl mx-auto mb-40 relative group px-6">
        <div
            class="absolute -inset-4 bg-gradient-to-r from-resin-amber/20 via-resin-forest/10 to-resin-amber/20 rounded-[3rem] blur-3xl opacity-40 group-hover:opacity-60 transition duration-1000"
        ></div>
        <div
            class="relative bg-white rounded-[2.5rem] border border-resin-forest/5 shadow-premium flex items-center justify-center bg-[url('/grid.svg')] bg-center min-h-[750px] py-24"
        >
            <div
                class="relative w-full flex flex-col md:flex-row items-center justify-center gap-12 px-4 md:px-12 animate-fade-in"
                style="animation-delay: 0.2s;"
            >
                <!-- Left Phone Mockup -->
                <div
                    class="w-64 h-[500px] bg-resin-charcoal rounded-[3rem] border-8 border-resin-charcoal shadow-2xl overflow-hidden hidden md:block rotate-[-4deg] -translate-x-12"
                >
                    <div class="w-full h-full bg-resin-bg p-4 flex flex-col">
                        <div
                            class="w-16 h-1.5 bg-resin-earth/20 rounded-full mx-auto mb-6"
                        ></div>
                        <div class="space-y-4">
                            <div
                                class="h-32 w-full bg-white rounded-2xl border border-resin-forest/5 shadow-sm p-4"
                            >
                                <div
                                    class="w-12 h-12 rounded-xl bg-resin-amber/20 mb-3"
                                ></div>
                                <div
                                    class="h-2 w-3/4 bg-resin-earth/10 rounded"
                                ></div>
                            </div>
                            <div
                                class="h-48 w-full bg-white rounded-2xl border border-resin-forest/5 shadow-sm p-4 space-y-3"
                            >
                                <div
                                    class="h-2 w-1/2 bg-resin-forest/10 rounded"
                                ></div>
                                <div
                                    class="h-2 w-full bg-resin-forest/5 rounded"
                                ></div>
                                <div
                                    class="h-2 w-full bg-resin-forest/5 rounded"
                                ></div>
                                <div
                                    class="h-2 w-2/3 bg-resin-forest/5 rounded"
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Center Phone Mockup (Main) -->
                <div
                    class="w-72 h-[550px] bg-resin-charcoal rounded-[3.5rem] border-8 border-resin-charcoal shadow-2xl overflow-hidden relative z-10"
                >
                    <div
                        class="w-full h-full bg-resin-bg p-6 flex flex-col items-center"
                    >
                        <div
                            class="w-20 h-2 bg-resin-earth/20 rounded-full mb-10"
                        ></div>
                        <img
                            src="/logo.png"
                            alt="Resin App"
                            class="w-24 h-24 rounded-[1.5rem] shadow-lg mb-8"
                        />
                        <div class="w-full space-y-4">
                            <div
                                class="h-14 w-full bg-white rounded-2xl border border-resin-forest/5 shadow-sm"
                            ></div>
                            <div
                                class="h-14 w-full bg-white rounded-2xl border border-resin-forest/5 shadow-sm"
                            ></div>
                            <div
                                class="h-14 w-full bg-resin-forest text-white rounded-2xl flex items-center justify-center font-bold text-sm"
                            >
                                START PLAN
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Phone Mockup -->
                <div
                    class="w-64 h-[500px] bg-resin-charcoal rounded-[3rem] border-8 border-resin-charcoal shadow-2xl overflow-hidden hidden md:block rotate-[4deg] translate-x-12"
                >
                    <div class="w-full h-full bg-resin-bg p-4 flex flex-col">
                        <div
                            class="w-16 h-1.5 bg-resin-earth/20 rounded-full mx-auto mb-6"
                        ></div>
                        <div
                            class="flex-1 bg-white rounded-2xl border border-resin-forest/5 shadow-sm p-4"
                        >
                            <div
                                class="h-4 w-1/4 bg-resin-amber/20 rounded mb-4"
                            ></div>
                            <div class="space-y-4">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-4 h-4 rounded-full border-2 border-resin-forest/20"
                                    ></div>
                                    <div
                                        class="h-2 flex-1 bg-resin-earth/5 rounded"
                                    ></div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-4 h-4 rounded-full border-2 border-resin-forest/20"
                                    ></div>
                                    <div
                                        class="h-2 flex-1 bg-resin-earth/5 rounded"
                                    ></div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-4 h-4 rounded-full border-2 border-resin-forest/20"
                                    ></div>
                                    <div
                                        class="h-2 flex-1 bg-resin-earth/5 rounded"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- The Magic Section (Bento Grid) -->
    <section id="magic" class="mt-32 w-full max-w-6xl mx-auto space-y-16">
        <div class="text-center space-y-4">
            <h2
                class="text-4xl md:text-6xl font-bold text-resin-charcoal font-serif tracking-tight"
            >
                How the magic works
            </h2>
            <p
                class="text-resin-earth/70 text-lg md:text-xl font-light max-w-2xl mx-auto text-balance"
            >
                Resin bridges the gap between a fleeting thought and focused
                execution with a tactile, human-centric approach.
            </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            <!-- Bento Box 1: The Idea -->
            <div
                class="md:col-span-2 group relative overflow-hidden glass-card rounded-[2rem] p-8 flex flex-col justify-between hover:border-resin-amber/30 transition-all duration-500"
            >
                <div class="space-y-4 relative z-10">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-amber/10 flex items-center justify-center text-resin-amber"
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9l-.707.707M12 18v1m0-12A5 5 0 1012 17a5 5 0 000-10z"
                            ></path></svg
                        >
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-resin-charcoal mb-2">
                            The Seed of an Idea
                        </h3>
                        <p class="text-resin-earth font-light max-w-sm">
                            Capture thoughts in natural language like "history
                            30m, math 90m". No complex forms, just raw intent.
                        </p>
                    </div>
                </div>
                <div
                    class="absolute right-[-20px] bottom-[-20px] w-64 h-64 bg-resin-amber/5 rounded-full blur-3xl group-hover:bg-resin-amber/10 transition-colors"
                ></div>
                <!-- Mock input visual -->
                <div
                    class="relative h-16 w-full max-w-sm bg-white rounded-2xl border border-resin-forest/5 shadow-sm mt-8 flex items-center px-4 gap-3 transform group-hover:-translate-y-1 transition-transform duration-500"
                >
                    <div
                        class="w-2 h-2 rounded-full bg-resin-amber animate-pulse"
                    ></div>
                    <span class="text-resin-charcoal font-medium"
                        >history 30m, math 90m</span
                    >
                </div>
            </div>

            <!-- Bento Box 2: The Alert -->
            <div
                class="group relative overflow-hidden glass-card rounded-[2rem] p-8 flex flex-col justify-between hover:border-resin-forest/30 transition-all duration-500"
            >
                <div class="space-y-4">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-forest/10 flex items-center justify-center text-resin-forest"
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path></svg
                        >
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal">
                        Smart Alerts
                    </h3>
                </div>
                <!-- Notification mockup -->
                <div
                    class="bg-resin-forest text-white p-4 rounded-2xl shadow-lg transform rotate-[-2deg] group-hover:rotate-0 transition-transform duration-500"
                >
                    <p class="text-xs font-bold uppercase opacity-60 mb-1">
                        Upcoming • 4:15 PM
                    </p>
                    <p class="text-sm font-medium">
                        Time to head to the library. Focus starts in 15m.
                    </p>
                </div>
            </div>

            <!-- Bento Box 3: Accountability -->
            <div
                class="group relative overflow-hidden glass-card rounded-[2rem] p-8 flex flex-col justify-between hover:border-resin-charcoal/30 transition-all duration-500"
            >
                <div class="space-y-4">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-charcoal/10 flex items-center justify-center text-resin-charcoal"
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            ></path></svg
                        >
                    </div>
                    <h3 class="text-2xl font-bold text-resin-charcoal">
                        Real Focus
                    </h3>
                    <p class="text-resin-earth text-sm font-light">
                        Social apps blocked. No more mindless itch.
                    </p>
                </div>
                <div
                    class="mt-4 p-4 rounded-xl border-2 border-dashed border-resin-charcoal/10 text-center text-xs font-medium text-resin-charcoal/40 group-hover:border-resin-charcoal/30 transition-colors"
                >
                    DEEP WORK ENGAGED
                </div>
            </div>

            <!-- Bento Box 4: The Plan -->
            <div
                class="md:col-span-2 group relative overflow-hidden glass-card rounded-[2rem] p-8 flex flex-col md:flex-row gap-8 hover:border-resin-amber/30 transition-all duration-500"
            >
                <div class="flex-1 space-y-4">
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-amber/10 flex items-center justify-center text-resin-amber"
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            ><path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            ></path></svg
                        >
                    </div>
                    <div>
                        <h3 class="text-2xl font-bold text-resin-charcoal mb-2">
                            AI-Powered Breakdown
                        </h3>
                        <p class="text-resin-earth font-light">
                            Resin doesn't just remind you. It generates a
                            step-by-step strategy for exactly how to tackle your
                            task.
                        </p>
                    </div>
                </div>
                <div
                    class="flex-1 bg-white/40 rounded-2xl p-4 space-y-3 transform group-hover:scale-[1.02] transition-transform duration-500"
                >
                    <div
                        class="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-resin-forest/5"
                    >
                        <span class="text-xs font-bold text-resin-amber"
                            >00-10m</span
                        >
                        <span class="text-xs text-resin-earth"
                            >Review chapter 4</span
                        >
                    </div>
                    <div
                        class="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-resin-forest/5"
                    >
                        <span class="text-xs font-bold text-resin-amber"
                            >10-25m</span
                        >
                        <span class="text-xs text-resin-earth"
                            >Active recall</span
                        >
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Final CTA -->
    <section class="mt-40 mb-20 text-center space-y-10">
        <div
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-forest/5 border border-resin-forest/10 text-resin-forest/60 text-[10px] font-bold uppercase tracking-widest"
        >
            Ready to start?
        </div>
        <h2
            class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif max-w-xl mx-auto text-balance"
        >
            Stop losing your best thoughts to the void.
        </h2>
        <a
            href="https://testflight.apple.com/join/yV53qa1z"
            target="_blank"
            rel="noopener noreferrer"
            class="group relative inline-flex items-center justify-center px-10 py-5 bg-resin-charcoal text-white rounded-full font-semibold text-lg hover:bg-resin-forest transition-all duration-500 shadow-premium hover:shadow-2xl hover:-translate-y-1"
        >
            Download Resin
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
    </section>
</main>
