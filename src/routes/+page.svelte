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
        class="text-5xl md:text-7xl font-bold text-resin-charcoal font-serif mb-6 tracking-tight"
    >
        Your mind, <br class="md:hidden" />
        <span class="text-resin-forest italic">beautifully organized.</span>
    </h1>

    <p
        class="text-xl md:text-2xl text-resin-earth max-w-2xl mx-auto mb-12 font-light leading-relaxed"
    >
        Resin is the organic workspace that feels like a maker's workshop.
        Capture thoughts, structure tasks, and breathe life into your ideas.
    </p>

    <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
    >
        <a
            href="#download"
            class="group relative inline-flex items-center justify-center px-8 py-4 bg-resin-charcoal text-white rounded-full font-medium text-lg hover:bg-resin-forest transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 w-full sm:w-auto"
        >
            <span class="flex items-center gap-2">
                <svg class="w-6 h-6" viewBox="0 0 384 512" fill="currentColor">
                    <!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->
                    <path
                        d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
                    />
                </svg>
                Download on the App Store
            </span>
        </a>
    </div>

    <!-- App mock up visual below the main CTA -->
    <div
        class="mt-24 w-full max-w-3xl mx-auto rounded-t-[3rem] bg-white border border-resin-earth/20 shadow-[0_-20px_40px_-20px_rgb(43,70,52,0.1)] p-4 relative overflow-hidden"
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
