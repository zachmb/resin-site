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
            description:
                "Refined native performance and fluid interactions for Apple environments.",
        },
        {
            name: "Combine",
            icon: Network,
            description:
                "Seamless data flow and responsive, calm state management.",
        },
        {
            name: "Supabase",
            icon: Zap,
            description:
                "Secure authentication and resilient cloud persistence.",
        },
        {
            name: "DeepSeek AI",
            icon: Brain,
            description:
                "Advanced cognitive reasoning to function as your Chief of Staff.",
        },
        {
            name: "EventKit",
            icon: Calendar,
            description:
                "Direct, native integration with your personal schedule.",
        },
        {
            name: "Google API",
            icon: Cloud,
            description:
                "Secure synchronization across your professional ecosystem.",
        },
    ];

    const components = [
        {
            title: "The Commitment Engine",
            code: "AmberNoteService",
            description:
                "The core mechanism that ensures no drafted thought is ever left unresolved. It manages precisely scheduled plans and drives them toward completion.",
            color: "bg-resin-amber/20",
        },
        {
            title: "Context Processor",
            code: "BrainDumpViewModel",
            description:
                "Transforms unstructured drafts into actionable intelligence, determining precise timing and the most logical next steps without manual sorting.",
            color: "bg-resin-forest/20",
        },
        {
            title: "Private Architecture",
            code: "UserDefaults + Supabase",
            description:
                "A local-first approach to ensure your data remains yours, while syncing seamlessly in the background when needed.",
            color: "bg-resin-earth/20",
        },
    ];

    const steps = [
        {
            id: 1,
            title: "Input",
            label: "Unstructured Draft",
            desc: "Capturing raw intention",
            icon: FileText,
        },
        {
            id: 2,
            title: "Analysis",
            label: "AI Chief of Staff",
            desc: "Strategic context mapping",
            icon: Binary,
        },
        {
            id: 3,
            title: "Resolution",
            label: "Commitment",
            desc: "Concrete action secured",
            icon: CalendarCheck,
        },
        {
            id: 4,
            title: "Insight",
            label: "Continuous Alignment",
            desc: "Learning your operating rhythm",
            icon: RefreshCw,
        },
    ];
</script>

<svelte:head>
    <title>Architecture | Resin</title>
</svelte:head>

<main
    class="min-h-screen pt-32 pb-32 px-6 bg-[#FDFBF7] text-[#1A2E1A] selection:bg-orange-900/20 overflow-hidden relative font-sans"
>
    <!-- Background elements: Minimal and calming -->
    <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <!-- Subtle earthy glow -->
        <div
            class="absolute top-[-10%] left-[20%] w-[70%] h-[70%] bg-[#b2c2b2]/10 blur-[120px] rounded-full"
        ></div>

        <!-- Blurred Shapes for soft depth -->
        <div
            class="absolute top-[15%] left-[10%] w-[400px] h-[300px] bg-[#1A2E1A]/5 blur-[80px] -rotate-12"
            style="clip-path: polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%);"
        ></div>

        <div
            class="absolute top-[50%] right-[5%] w-[500px] h-[400px] bg-[#1A2E1A]/5 blur-[100px] rotate-45"
            style="clip-path: ellipse(40% 50% at 50% 50%);"
        ></div>

        <div
            class="absolute bottom-[10%] left-[15%] w-[350px] h-[350px] bg-orange-900/5 blur-[90px]"
            style="clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);"
        ></div>
    </div>

    <div class="max-w-5xl mx-auto space-y-40">
        <!-- Hero Section -->
        <section class="text-center space-y-8">
            {#if visible}
                <div in:fly={{ y: 30, duration: 1200, opacity: 0 }}>
                    <span
                        class="px-5 py-2 rounded-full border border-[#1A2E1A]/10 text-xs font-semibold tracking-widest uppercase text-[#1A2E1A]/60 mb-8 inline-block"
                    >
                        System Architecture
                    </span>
                    <h1
                        class="text-5xl md:text-7xl font-bold font-serif tracking-tight leading-tight text-[#1A2E1A]"
                    >
                        The Engine of <span class="italic text-orange-800"
                            >Execution</span
                        >
                    </h1>
                    <p
                        class="max-w-2xl mx-auto text-xl text-[#1A2E1A]/70 leading-relaxed mt-8 font-serif"
                    >
                        Explore the technical foundation of Resin. A calm,
                        privacy-first infrastructure designed to automatically
                        convert your thoughts into forward motion.
                    </p>
                </div>
            {/if}
        </section>

        <!-- Core Flow Infographic -->
        <section class="space-y-16 relative">
            <div class="text-center space-y-4">
                <h2 class="text-3xl font-semibold font-serif text-[#1A2E1A]">
                    The Process of Completion
                </h2>
                <p class="text-lg text-[#1A2E1A]/60 font-serif">
                    How drafts become commitments
                </p>
            </div>

            <div class="relative grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Connecting lines for desktop -->
                <div
                    class="hidden md:block absolute top-[40%] left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#1A2E1A]/10 to-transparent -translate-y-1/2 -z-10"
                ></div>

                {#each steps as step, i}
                    {#if visible}
                        <div
                            in:fly={{
                                y: 40,
                                delay: 300 + i * 200,
                                duration: 1200,
                                opacity: 0,
                            }}
                            class="bg-white/40 backdrop-blur-md p-10 rounded-2xl flex flex-col items-center text-center space-y-6 border border-[#1A2E1A]/5 shadow-sm hover:shadow-md transition-all duration-700"
                        >
                            <div
                                class="w-16 h-16 rounded-full bg-[#1A2E1A]/5 flex items-center justify-center text-[#1A2E1A] transition-transform duration-700 hover:scale-105"
                            >
                                <svelte:component
                                    this={step.icon}
                                    size={28}
                                    strokeWidth={1.5}
                                />
                            </div>
                            <div>
                                <span
                                    class="text-[10px] uppercase tracking-widest text-[#1A2E1A]/50 font-semibold mb-2 block"
                                >
                                    {step.title}
                                </span>
                                <h3
                                    class="text-xl font-medium text-[#1A2E1A] font-serif"
                                >
                                    {step.label}
                                </h3>
                                <p
                                    class="text-sm text-[#1A2E1A]/70 mt-3 leading-relaxed"
                                >
                                    {step.desc}
                                </p>
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <!-- Key Components (Deep Dive) -->
        <section class="space-y-20">
            <div class="text-center space-y-4">
                <h2 class="text-3xl font-semibold font-serif text-[#1A2E1A]">
                    Executive Systems
                </h2>
                <p class="text-lg text-[#1A2E1A]/60 font-serif">
                    The silent operators working on your behalf
                </p>
            </div>

            <div class="space-y-12">
                {#each components as component, i}
                    {#if visible}
                        <div
                            in:fly={{
                                y: 40,
                                delay: 600 + i * 200,
                                duration: 1200,
                                opacity: 0,
                            }}
                            class="grid md:grid-cols-2 gap-12 items-center bg-white/40 backdrop-blur-md border border-[#1A2E1A]/5 rounded-3xl p-10 md:p-16 shadow-sm"
                        >
                            <div
                                class="space-y-6 {i % 2 !== 0
                                    ? 'md:order-2'
                                    : ''}"
                            >
                                <div
                                    class="text-sm font-semibold tracking-widest text-orange-800/80"
                                >
                                    0{i + 1}
                                </div>
                                <h3
                                    class="text-3xl font-medium font-serif text-[#1A2E1A]"
                                >
                                    {component.title}
                                </h3>
                                <p
                                    class="text-[#1A2E1A]/70 text-lg leading-relaxed font-serif"
                                >
                                    {component.description}
                                </p>
                                <div
                                    class="inline-flex items-center gap-2 px-4 py-2 bg-[#1A2E1A]/5 rounded-md border border-[#1A2E1A]/10 mt-4"
                                >
                                    <code
                                        class="text-xs text-[#1A2E1A]/60 font-medium"
                                        >{component.code}</code
                                    >
                                </div>
                            </div>
                            <!-- Abstract, calm representation of code/logic -->
                            <div
                                class="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#1A2E1A]/5 to-transparent border border-[#1A2E1A]/5 overflow-hidden flex items-center justify-center p-8"
                            >
                                <div
                                    class="w-full h-full bg-white/50 backdrop-blur-sm rounded-xl border border-[#1A2E1A]/5 p-6 overflow-hidden relative shadow-sm"
                                >
                                    <div class="space-y-3 opacity-20">
                                        {#each Array(6) as _}
                                            <div class="flex gap-2">
                                                <div
                                                    class="h-1 bg-[#1A2E1A]/40 rounded w-12"
                                                ></div>
                                                <div
                                                    class="h-1 bg-[#1A2E1A]/40 rounded w-full"
                                                ></div>
                                            </div>
                                            <div
                                                class="h-1 bg-[#1A2E1A]/40 rounded w-[70%] ml-14"
                                            ></div>
                                            <div
                                                class="h-1 bg-[#1A2E1A]/40 rounded w-[40%] ml-14 mb-4"
                                            ></div>
                                        {/each}
                                    </div>
                                    <div
                                        class="absolute inset-0 flex items-center justify-center"
                                    >
                                        <div
                                            class="w-32 h-32 rounded-full bg-orange-900/10 blur-3xl"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <!-- Technical Stack -->
        <section class="space-y-16">
            <div class="text-center space-y-4">
                <h2 class="text-3xl font-semibold font-serif text-[#1A2E1A]">
                    Infrastructure of Calm
                </h2>
                <p class="text-lg text-[#1A2E1A]/60 font-serif">
                    Built with deliberate, resilient technologies
                </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {#each techStack as tech, i}
                    {#if visible}
                        <div
                            in:fly={{
                                y: 30,
                                delay: 800 + i * 150,
                                duration: 1000,
                                opacity: 0,
                            }}
                            class="p-8 rounded-2xl bg-white/30 border border-[#1A2E1A]/5 hover:bg-white/60 transition-colors duration-500 shadow-sm"
                        >
                            <div class="mb-6 text-[#1A2E1A]/40">
                                <svelte:component
                                    this={tech.icon}
                                    size={28}
                                    strokeWidth={1.5}
                                />
                            </div>
                            <h3
                                class="font-medium mb-3 text-[#1A2E1A] font-serif text-xl"
                            >
                                {tech.name}
                            </h3>
                            <p
                                class="text-sm text-[#1A2E1A]/70 leading-relaxed"
                            >
                                {tech.description}
                            </p>
                        </div>
                    {/if}
                {/each}
            </div>
        </section>

        <!-- Privacy & Philosophy -->
        <section
            class="py-24 text-center relative overflow-hidden rounded-[2.5rem] bg-white/40 border border-[#1A2E1A]/5 shadow-sm"
        >
            <!-- Distinctive Blurred Charcoal Background for Privacy -->
            <div
                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#1A2E1A]/5 blur-[120px] -z-10 rotate-12"
            ></div>

            <div class="max-w-3xl mx-auto space-y-8 p-8 relative z-10">
                <div
                    class="w-20 h-20 bg-white/80 backdrop-blur-md shadow-sm border border-[#1A2E1A]/5 rounded-full mx-auto flex items-center justify-center text-[#1A2E1A] mb-8"
                >
                    <ShieldCheck size={36} strokeWidth={1.5} />
                </div>
                <h2 class="text-4xl font-semibold font-serif text-[#1A2E1A]">
                    The Privacy Promise
                </h2>
                <p class="text-xl text-[#1A2E1A]/70 leading-relaxed font-serif">
                    True peace of mind requires absolute privacy. Resin uses
                    end-to-end encryption for all data transfers and secure,
                    on-device storage for your schedule. We act as your private
                    Chief of Staff—what is shared with Resin stays with Resin.
                </p>
                <div class="pt-10">
                    <a
                        href="/privacy"
                        class="text-orange-800 font-medium hover:text-orange-900 transition-colors inline-flex items-center justify-center gap-3 group px-6 py-3 border border-orange-800/20 rounded-full hover:bg-orange-800/5"
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
