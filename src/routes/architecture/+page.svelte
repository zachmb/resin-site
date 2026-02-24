<script lang="ts">
    import { fade, fly, scale } from "svelte/transition";
    import { onMount } from "svelte";
    import {
        Layout,
        Network,
        Zap,
        Brain,
        Calendar,
        Cloud,
        FileText,
        Binary,
        CalendarCheck,
        RefreshCw,
        ShieldCheck,
    } from "lucide-svelte";

    let visible = false;
    onMount(() => {
        visible = true;
    });

    const techStack = [
        {
            name: "SwiftUI",
            icon: Layout,
            description: "Native performance and animations for iOS & macOS.",
        },
        {
            name: "Combine",
            icon: Network,
            description: "Reactive event handling and data stream management.",
        },
        {
            name: "Supabase",
            icon: Zap,
            description:
                "Secure auth, real-time database, and cloud persistence.",
        },
        {
            name: "DeepSeek AI",
            icon: Brain,
            description: "Advanced reasoning for scheduling and task analysis.",
        },
        {
            name: "EventKit",
            icon: Calendar,
            description: "Seamless local Apple Calendar integration.",
        },
        {
            name: "Google API",
            icon: Cloud,
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
            icon: FileText,
        },
        {
            id: 2,
            title: "Processing",
            label: "Amber Analysis",
            desc: "AI Reasoning + Calendar Check",
            icon: Binary,
        },
        {
            id: 3,
            title: "Execution",
            label: "Scheduling",
            desc: "Automated Calendar Entry",
            icon: CalendarCheck,
        },
        {
            id: 4,
            title: "Feedback",
            label: "Reflection",
            desc: "Closing the loop to improve AI",
            icon: RefreshCw,
        },
    ];
</script>

<svelte:head>
    <title>Architecture | Resin</title>
</svelte:head>

<main
    class="min-h-screen pt-24 pb-20 px-6 bg-resin-bg text-resin-forest selection:bg-resin-amber/30 overflow-hidden relative"
>
    <!-- Background elements -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <!-- Subtle amber glow -->
        <div
            class="absolute top-[-10%] left-[20%] w-[70%] h-[70%] bg-resin-amber/5 blur-[120px] rounded-full animate-pulse"
        ></div>

        <!-- Blurred Charcoal Shapes (Distinct, non-circular) -->
        <!-- Shape 1: Behind Hero/Core Loop -->
        <div
            class="absolute top-[15%] left-[10%] w-[400px] h-[300px] bg-resin-charcoal/5 blur-[80px] -rotate-12"
            style="clip-path: polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%);"
        ></div>

        <!-- Shape 2: Behind Internal Machinery -->
        <div
            class="absolute top-[50%] right-[5%] w-[500px] h-[400px] bg-resin-charcoal/5 blur-[100px] rotate-45"
            style="clip-path: ellipse(40% 50% at 50% 50%);"
        ></div>

        <!-- Shape 3: Behind Privacy -->
        <div
            class="absolute bottom-[10%] left-[15%] w-[350px] h-[350px] bg-resin-charcoal/3 blur-[90px]"
            style="clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);"
        ></div>
    </div>

    <div class="max-w-6xl mx-auto space-y-32">
        <!-- Hero Section -->
        <section class="text-center space-y-6">
            {#if visible}
                <div in:fly={{ y: 20, duration: 800 }}>
                    <span
                        class="px-4 py-1.5 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-xs font-bold tracking-widest uppercase text-resin-amber mb-4 inline-block"
                    >
                        System Internals
                    </span>
                    <h1
                        class="text-5xl md:text-7xl font-bold font-serif tracking-tight leading-tight text-resin-charcoal"
                    >
                        From Chaos to <span class="text-resin-amber"
                            >Ordered Time</span
                        >
                    </h1>
                    <p
                        class="max-w-2xl mx-auto text-lg text-resin-earth/70 leading-relaxed mt-6"
                    >
                        Explore the technical foundation of Resin. A
                        high-performance, privacy-first architecture designed to
                        help you reclaim your cognitive space.
                    </p>
                </div>
            {/if}
        </section>

        <!-- Core Flow Infographic -->
        <section class="space-y-12 relative">
            <div class="text-center space-y-4">
                <h2 class="text-3xl font-bold font-serif text-resin-charcoal">
                    The Core Loop
                </h2>
                <p class="text-resin-earth/60">
                    How your data travels through the system
                </p>
            </div>

            <div class="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Connecting lines for desktop -->
                <div
                    class="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-resin-amber/20 to-transparent -translate-y-1/2 -z-10"
                ></div>

                {#each steps as step, i}
                    {#if visible}
                        <div
                            in:fly={{
                                y: 30,
                                delay: 200 + i * 150,
                                duration: 1000,
                            }}
                            class="glass-card p-8 rounded-3xl flex flex-col items-center text-center space-y-4 hover:shadow-premium transition-all duration-500 group"
                        >
                            <div
                                class="w-16 h-16 rounded-2xl bg-resin-amber/10 flex items-center justify-center text-resin-amber group-hover:scale-110 transition-transform duration-500"
                            >
                                <svelte:component this={step.icon} size={32} />
                            </div>
                            <div>
                                <span
                                    class="text-[10px] uppercase tracking-widest text-resin-amber font-bold mb-1 block"
                                    >{step.title}</span
                                >
                                <h3
                                    class="text-xl font-bold text-resin-charcoal"
                                >
                                    {step.label}
                                </h3>
                                <p class="text-sm text-resin-earth/60 mt-2">
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
                <h2 class="text-3xl font-bold font-serif text-resin-charcoal">
                    Technical Stack
                </h2>
                <p class="text-resin-earth/60">
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
                            class="p-6 rounded-2xl bg-white/40 border border-resin-forest/5 hover:border-resin-amber/20 transition-all shadow-sm hover:shadow-md"
                        >
                            <div class="mb-4 text-resin-amber">
                                <svelte:component this={tech.icon} size={32} />
                            </div>
                            <h3 class="font-bold mb-2 text-resin-charcoal">
                                {tech.name}
                            </h3>
                            <p
                                class="text-sm text-resin-earth/60 leading-relaxed"
                            >
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
                <h2 class="text-3xl font-bold font-serif text-resin-charcoal">
                    Internal Machinery
                </h2>
                <p class="text-resin-earth/60">
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
                            class="grid md:grid-cols-2 gap-8 items-center glass-card rounded-[40px] p-8 md:p-12"
                        >
                            <div
                                class="space-y-6 {i % 2 !== 0
                                    ? 'md:order-2'
                                    : ''}"
                            >
                                <div
                                    class="w-12 h-12 rounded-xl {component.color.replace(
                                        'white/10',
                                        'resin-amber/10',
                                    )} flex items-center justify-center font-bold text-resin-amber shadow-inner"
                                >
                                    0{i + 1}
                                </div>
                                <h3
                                    class="text-3xl font-bold font-serif text-resin-charcoal"
                                >
                                    {component.title}
                                </h3>
                                <p
                                    class="text-resin-earth/70 text-lg leading-relaxed"
                                >
                                    {component.description}
                                </p>
                                <div
                                    class="inline-flex items-center gap-2 px-3 py-1 bg-resin-forest/5 rounded-lg border border-resin-forest/10"
                                >
                                    <code
                                        class="text-xs text-resin-amber font-semibold"
                                        >{component.code}</code
                                    >
                                </div>
                            </div>
                            <div
                                class="aspect-video rounded-3xl bg-gradient-to-br from-resin-forest/5 to-transparent border border-resin-forest/5 overflow-hidden flex items-center justify-center p-8"
                            >
                                <!-- Abstract representation of code/logic -->
                                <div
                                    class="w-full h-full bg-white/50 backdrop-blur-sm rounded-2xl border border-resin-forest/5 p-4 overflow-hidden relative shadow-sm"
                                >
                                    <div class="space-y-2 opacity-20">
                                        {#each Array(8) as _}
                                            <div
                                                class="h-2 bg-resin-forest/40 rounded w-full"
                                            ></div>
                                            <div
                                                class="h-2 bg-resin-forest/40 rounded w-[80%]"
                                            ></div>
                                            <div
                                                class="h-2 bg-resin-forest/40 rounded w-[60%]"
                                            ></div>
                                        {/each}
                                    </div>
                                    <div
                                        class="absolute inset-0 flex items-center justify-center"
                                    >
                                        <div
                                            class="w-24 h-24 rounded-full {component.color.replace(
                                                'white/10',
                                                'resin-amber/20',
                                            )} blur-3xl animate-pulse"
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
        <section
            class="py-20 text-center relative overflow-hidden rounded-[3rem]"
        >
            <div class="absolute inset-0 bg-resin-forest/5 -z-10"></div>

            <!-- Distinctive Blurred Charcoal Background for Privacy -->
            <div
                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-resin-charcoal/5 blur-[100px] -z-10 rotate-12"
                style="clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);"
            ></div>

            <div class="max-w-3xl mx-auto space-y-8 p-8 relative z-10">
                <div
                    class="w-20 h-20 bg-white/80 backdrop-blur shadow-sm border border-resin-forest/5 rounded-3xl mx-auto flex items-center justify-center text-resin-amber mb-8"
                >
                    <ShieldCheck size={40} strokeWidth={1.5} />
                </div>
                <h2 class="text-4xl font-bold font-serif text-resin-charcoal">
                    Privacy by Design
                </h2>
                <p class="text-xl text-resin-earth/70 leading-relaxed">
                    We believe your thoughts should stay yours. Resin uses
                    end-to-end encryption for all data transfers and secure,
                    on-device storage for sensitive calendar tokens. Our
                    persistence layer is designed to be local-first, ensuring
                    maximum speed and privacy.
                </p>
                <div class="pt-8">
                    <a
                        href="/privacy"
                        class="text-resin-amber font-bold hover:text-resin-forest transition-colors flex items-center justify-center gap-2 group"
                    >
                        <span>Read our detailed Privacy Promise</span>
                        <span
                            class="group-hover:translate-x-1 transition-transform"
                            >&rarr;</span
                        >
                    </a>
                </div>
            </div>
        </section>
    </div>
</main>

<style>
    /* Custom styles if needed beyond Tailwind */
    :global(.glass-card) {
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    }
</style>
