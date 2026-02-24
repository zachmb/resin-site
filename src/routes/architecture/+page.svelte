<script lang="ts">
    import { fade, fly, scale } from "svelte/transition";
    import { onMount } from "svelte";

    let visible = false;
    onMount(() => {
        visible = true;
    });

    const techStack = [
        {
            name: "SwiftUI",
            icon: "🍎",
            description: "Native performance and animations for iOS & macOS.",
        },
        {
            name: "Combine",
            icon: "⛓️",
            description: "Reactive event handling and data stream management.",
        },
        {
            name: "Supabase",
            icon: "⚡",
            description:
                "Secure auth, real-time database, and cloud persistence.",
        },
        {
            name: "DeepSeek AI",
            icon: "🧠",
            description: "Advanced reasoning for scheduling and task analysis.",
        },
        {
            name: "EventKit",
            icon: "📅",
            description: "Seamless local Apple Calendar integration.",
        },
        {
            name: "Google API",
            icon: "☁️",
            description: "Cloud synchronization for global accessibility.",
        },
    ];

    const components = [
        {
            title: "Amber Engine",
            code: "AmberNoteService",
            description:
                'The "System of Record". Manages precisely scheduled plans and their lifecycle.',
            color: "bg-resin-amber/20",
        },
        {
            title: "Session Manager",
            code: "BrainDumpViewModel",
            description:
                "The processor. Transforms raw text brain-dumps into structured, actionable tasks.",
            color: "bg-resin-forest/20",
        },
        {
            title: "Hybrid Persistence",
            code: "UserDefaults + Supabase",
            description:
                "Local-first for speed and privacy, cloud-synced for reliability and multi-device support.",
            color: "bg-resin-earth/20",
        },
    ];

    const steps = [
        {
            id: 1,
            title: "Input",
            label: "Brain Dump",
            desc: "Raw chaotic thoughts (Text)",
            icon: "📝",
        },
        {
            id: 2,
            title: "Processing",
            label: "Amber Analysis",
            desc: "AI Reasoning + Calendar Check",
            icon: "⚙️",
        },
        {
            id: 3,
            title: "Execution",
            label: "Scheduling",
            desc: "Automated Calendar Entry",
            icon: "🗓️",
        },
        {
            id: 4,
            title: "Feedback",
            label: "Reflection",
            desc: "Closing the loop to improve AI",
            icon: "🔄",
        },
    ];
</script>

<svelte:head>
    <title>Architecture | Resin</title>
</svelte:head>

<main
    class="min-h-screen pt-24 pb-20 px-6 bg-resin-charcoal text-white selection:bg-resin-amber/30 overflow-hidden relative"
>
    <!-- Background glow -->
    <div
        class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-resin-amber/10 blur-[120px] rounded-full -z-10 animate-pulse"
    ></div>

    <div class="max-w-6xl mx-auto space-y-32">
        <!-- Hero Section -->
        <section class="text-center space-y-6">
            {#if visible}
                <div in:fly={{ y: 20, duration: 800 }}>
                    <span
                        class="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold tracking-widest uppercase text-resin-amber mb-4 inline-block"
                    >
                        System Internals
                    </span>
                    <h1
                        class="text-5xl md:text-7xl font-bold font-serif tracking-tight leading-tight"
                    >
                        From Chaos to <span class="text-resin-amber"
                            >Ordered Time</span
                        >
                    </h1>
                    <p
                        class="max-w-2xl mx-auto text-lg text-white/60 leading-relaxed mt-6"
                    >
                        Explore the technical foundation of Resin. A
                        high-performance, privacy-first architecture designed to
                        help you reclaim your cognitive space.
                    </p>
                </div>
            {/if}
        </section>

        <!-- Core Flow Infographic -->
        <section class="space-y-12">
            <div class="text-center space-y-4">
                <h2 class="text-3xl font-bold font-serif">The Core Loop</h2>
                <p class="text-white/50">
                    How your data travels through the system
                </p>
            </div>

            <div class="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Connecting lines for desktop -->
                <div
                    class="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-resin-amber/30 to-transparent -translate-y-1/2 -z-10"
                ></div>

                {#each steps as step, i}
                    {#if visible}
                        <div
                            in:fly={{
                                y: 30,
                                delay: 200 + i * 150,
                                duration: 1000,
                            }}
                            class="glass-card bg-white/5 p-8 rounded-3xl border border-white/10 flex flex-col items-center text-center space-y-4 hover:bg-white/10 transition-all duration-500 group"
                        >
                            <div
                                class="w-16 h-16 rounded-2xl bg-resin-amber/20 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500"
                            >
                                {step.icon}
                            </div>
                            <div>
                                <span
                                    class="text-[10px] uppercase tracking-widest text-resin-amber font-bold mb-1 block"
                                    >{step.title}</span
                                >
                                <h3 class="text-xl font-bold">{step.label}</h3>
                                <p class="text-sm text-white/50 mt-2">
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <!-- Technical Stack -->
        <section class="space-y-12">
            <div class="text-center space-y-4">
                <h2 class="text-3xl font-bold font-serif">Technical Stack</h2>
                <p class="text-white/50">
                    Built with modern, resilient technologies
                </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {#each techStack as tech, i}
                    {#if visible}
                        <div
                            in:scale={{
                                start: 0.95,
                                delay: 400 + i * 100,
                                duration: 800,
                            }}
                            class="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                        >
                            <div class="text-2xl mb-4">{tech.icon}</div>
                            <h3 class="font-bold mb-2">{tech.name}</h3>
                            <p class="text-sm text-white/40 leading-relaxed">
                                {tech.description}
                            </p>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <!-- Key Components (Deep Dive) -->
        <section class="space-y-16">
            <div class="text-center space-y-4">
                <h2 class="text-3xl font-bold font-serif">
                    Internal Machinery
                </h2>
                <p class="text-white/50">
                    Core services powering the experience
                </p>
            </div>

            <div class="space-y-8">
                {#each components as component, i}
                    {#if visible}
                        <div
                            in:fly={{
                                x: i % 2 === 0 ? -20 : 20,
                                delay: 600 + i * 200,
                                duration: 1000,
                            }}
                            class="grid md:grid-cols-2 gap-8 items-center glass-card bg-white/5 rounded-[40px] p-8 md:p-12 border border-white/10"
                        >
                            <div
                                class="space-y-6 {i % 2 !== 0
                                    ? 'md:order-2'
                                    : ''}"
                            >
                                <div
                                    class="w-12 h-12 rounded-xl {component.color} flex items-center justify-center font-bold text-resin-amber"
                                >
                                    0{i + 1}
                                </div>
                                <h3 class="text-3xl font-bold font-serif">
                                    {component.title}
                                </h3>
                                <p
                                    class="text-white/60 text-lg leading-relaxed"
                                >
                                    {component.description}
                                </p>
                                <div
                                    class="inline-flex items-center gap-2 px-3 py-1 bg-black/40 rounded-lg border border-white/10"
                                >
                                    <code class="text-xs text-resin-amber"
                                        >{component.code}</code
                                    >
                                </div>
                            </div>
                            <div
                                class="aspect-video rounded-3xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 overflow-hidden flex items-center justify-center p-8"
                            >
                                <!-- Abstract representation of code/logic -->
                                <div
                                    class="w-full h-full bg-resin-charcoal/50 rounded-2xl border border-white/5 p-4 overflow-hidden relative"
                                >
                                    <div class="space-y-2 opacity-30">
                                        {#each Array(8) as _}
                                            <div
                                                class="h-2 bg-white/20 rounded w-full"
                                            ></div>
                                            <div
                                                class="h-2 bg-white/20 rounded w-[80%]"
                                            ></div>
                                            <div
                                                class="h-2 bg-white/20 rounded w-[60%]"
                                            ></div>
                                        {/each}
                                    </div>
                                    <div
                                        class="absolute inset-0 flex items-center justify-center"
                                    >
                                        <div
                                            class="w-24 h-24 rounded-full {component.color} blur-3xl animate-pulse"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <!-- Privacy & Philosophy -->
        <section class="py-20 text-center relative">
            <div
                class="absolute inset-0 bg-resin-amber/5 blur-[150px] rounded-full -z-10"
            ></div>
            <div class="max-w-3xl mx-auto space-y-8">
                <div
                    class="w-20 h-20 bg-resin-amber/20 rounded-3xl mx-auto flex items-center justify-center text-4xl mb-8"
                >
                    🛡️
                </div>
                <h2 class="text-4xl font-bold font-serif">Privacy by Design</h2>
                <p class="text-xl text-white/60 leading-relaxed">
                    We believe your thoughts belong stay yours. Resin uses
                    end-to-end encryption for all data transfers and secure,
                    on-device storage for sensitive calendar tokens. Our
                    persistence layer is designed to be local-first, ensuring
                    maximum speed and privacy.
                </p>
                <div class="pt-8">
                    <a
                        href="/privacy"
                        class="text-resin-amber font-bold hover:underline underline-offset-8 transition-all"
                    >
                        Read our detailed Privacy Promise &rarr;
                    </a>
                </div>
            </div>
        </section>
    </div>
</main>

<style>
    /* Custom styles for claymorphism/glassmorphism if needed beyond Tailwind */
    :global(.glass-card) {
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    }
</style>
