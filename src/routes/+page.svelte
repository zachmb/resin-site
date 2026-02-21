<script lang="ts">
</script>

<!-- Main Content -->
<main
    class="flex-grow flex flex-col items-center justify-center px-6 py-20 text-center relative z-10 w-full mb-12 mt-8"
>
    <div class="mb-8">
        <img
            src="/logo.png"
            alt="Resin Logo"
            class="w-28 h-28 md:w-36 md:h-36 mx-auto rounded-[2rem] shadow-[0_8px_30px_rgb(232,154,60,0.25)] border-4 border-white/50 object-cover"
        />
    </div>

    <h1
        class="text-5xl md:text-7xl font-bold text-resin-charcoal font-serif mb-6 tracking-tight leading-tight"
    >
        Your ideas, <br class="md:hidden" />
        <span class="text-resin-forest italic">actually happening.</span>
    </h1>

    <p
        class="text-xl md:text-2xl text-resin-earth max-w-2xl mx-auto mb-12 font-light leading-relaxed"
    >
        Resin gets AI to develop a plan for your ideas and reminds you to make
        them happen. No more letting "History 30m" become "another time."
    </p>

    <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
    >
        <a
            href="https://testflight.apple.com/join/yV53qa1z"
            target="_blank"
            rel="noopener noreferrer"
            class="group relative inline-flex items-center justify-center px-8 py-4 bg-resin-charcoal text-white rounded-full font-medium text-lg hover:bg-resin-forest transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 w-full sm:w-auto overflow-hidden"
        >
            <span class="relative z-10 flex items-center gap-2">
                <svg class="w-6 h-6" viewBox="0 0 384 512" fill="currentColor">
                    <path
                        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
                    />
                </svg>
                Download Resin
            </span>
        </a>
    </div>

    <!-- The Magic Section -->
    <section class="mt-32 w-full max-w-4xl mx-auto space-y-24">
        <div class="text-center">
            <h2
                class="text-3xl md:text-5xl font-bold text-resin-charcoal font-serif mb-4"
            >
                How the magic works
            </h2>
            <p class="text-resin-earth text-lg md:text-xl font-light">
                From a simple thought to deep work in minutes.
            </p>
        </div>

        <!-- Visual Flow -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div class="space-y-12">
                <!-- Step 1 -->
                <div class="flex gap-6 items-start">
                    <div
                        class="w-10 h-10 rounded-full bg-resin-amber text-white flex items-center justify-center font-bold shrink-0 shadow-lg"
                    >
                        1
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-resin-charcoal mb-2">
                            The Idea
                        </h3>
                        <p class="text-resin-earth font-light">
                            "history 30m, math 90m"
                        </p>
                    </div>
                </div>
                <!-- Step 2 -->
                <div class="flex gap-6 items-start">
                    <div
                        class="w-10 h-10 rounded-full bg-resin-forest text-white flex items-center justify-center font-bold shrink-0 shadow-lg"
                    >
                        2
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-resin-charcoal mb-2">
                            The Alert
                        </h3>
                        <p
                            class="text-resin-earth font-light font-italic italic"
                        >
                            "4:15 PM: Time to head to the library. Deep work
                            starts in 15 minutes."
                        </p>
                    </div>
                </div>
                <!-- Step 3 -->
                <div class="flex gap-6 items-start">
                    <div
                        class="w-10 h-10 rounded-full bg-resin-charcoal text-white flex items-center justify-center font-bold shrink-0 shadow-lg"
                    >
                        3
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-resin-charcoal mb-2">
                            The Plan
                        </h3>
                        <p class="text-resin-earth font-light">
                            Resin sends a breakdown of exactly how to review
                            your history notes.
                        </p>
                    </div>
                </div>
                <!-- Step 4 -->
                <div class="flex gap-6 items-start">
                    <div
                        class="w-10 h-10 rounded-full bg-resin-amber text-white flex items-center justify-center font-bold shrink-0 shadow-lg"
                    >
                        4
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-resin-charcoal mb-2">
                            The Accountability
                        </h3>
                        <p class="text-resin-earth font-light">
                            Social media is blocked. Resin asks, <span
                                class="text-resin-forest font-medium"
                                >"Did you do it?"</span
                            >
                        </p>
                    </div>
                </div>
            </div>

            <!-- Visual Representation -->
            <div class="relative">
                <div
                    class="absolute -inset-4 bg-resin-amber/10 rounded-[3rem] blur-2xl"
                ></div>
                <div
                    class="relative bg-white rounded-[2.5rem] border border-resin-earth/20 shadow-2xl p-6 overflow-hidden"
                >
                    <div class="space-y-6">
                        <!-- Mock Notification -->
                        <div
                            class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-resin-earth/10 shadow-sm transform -rotate-2"
                        >
                            <div class="flex items-center gap-3 mb-2">
                                <div
                                    class="w-6 h-6 bg-resin-amber rounded-md"
                                ></div>
                                <span
                                    class="text-xs font-bold text-resin-charcoal uppercase tracking-wider"
                                    >Notification • 4:15 PM</span
                                >
                            </div>
                            <p class="text-sm text-resin-forest font-medium">
                                Time to head to the library. Your deep work
                                session starts in 15 mins.
                            </p>
                        </div>

                        <!-- Mock Plan -->
                        <div
                            class="bg-resin-bg p-4 rounded-2xl border border-resin-forest/20 shadow-inner transform rotate-1"
                        >
                            <h4
                                class="text-xs font-bold text-resin-forest uppercase mb-3 text-center tracking-widest"
                            >
                                History Plan
                            </h4>
                            <ul class="space-y-2">
                                <li class="text-xs flex gap-2">
                                    <span class="text-resin-amber">00-10m</span>
                                    <span class="text-resin-earth"
                                        >Review textbook chapter 4 summary</span
                                    >
                                </li>
                                <li class="text-xs flex gap-2">
                                    <span class="text-resin-amber">10-25m</span>
                                    <span class="text-resin-earth"
                                        >Active recall on key dates</span
                                    >
                                </li>
                                <li class="text-xs flex gap-2">
                                    <span class="text-resin-amber">25-30m</span>
                                    <span class="text-resin-earth"
                                        >Quick summary for math transition</span
                                    >
                                </li>
                            </ul>
                        </div>

                        <!-- Mock Focus Mode -->
                        <div
                            class="bg-resin-charcoal p-4 rounded-2xl text-white transform -rotate-1 relative overflow-hidden"
                        >
                            <div class="absolute top-0 right-0 p-2 opacity-20">
                                <svg
                                    class="w-12 h-12"
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
                            <h4 class="text-xs font-bold uppercase mb-2">
                                Deep Work Engaged
                            </h4>
                            <p class="text-xs text-white/70 italic">
                                Social media blocked. Enjoy your focus.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- App mock up visual below the main CTA -->
    <div
        class="mt-32 w-full max-w-3xl mx-auto rounded-t-[3rem] bg-white border border-resin-earth/20 shadow-[0_-20px_40px_-20px_rgb(43,70,52,0.1)] p-4 relative overflow-hidden"
        style="height: 300px; mask-image: linear-gradient(to bottom, black 50%, transparent 100%);"
    >
        <div
            class="bg-resin-bg w-full h-full rounded-[2.5rem] border border-resin-earth/10 flex flex-col p-6 items-center"
        >
            <div class="w-24 h-2 bg-resin-earth/20 rounded-full mb-8"></div>
            <div class="w-full max-w-sm space-y-4">
                <div
                    class="h-16 w-full bg-white rounded-2xl shadow-sm border border-resin-earth/5"
                ></div>
                <div
                    class="h-24 w-full bg-white rounded-2xl shadow-sm border border-resin-earth/5 flex items-center p-4"
                >
                    <div
                        class="w-12 h-12 rounded-full bg-resin-amber/20 mr-4"
                    ></div>
                    <div class="flex-1 space-y-2">
                        <div class="h-4 w-1/2 bg-resin-earth/10 rounded"></div>
                        <div class="h-4 w-3/4 bg-resin-earth/5 rounded"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</main>
