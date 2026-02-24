<script lang="ts">
    import { enhance } from "$app/forms";
    import { fade } from "svelte/transition";

    let { data, form } = $props();
    let { session, profile } = $derived(data);

    let loading = $state(false);
    let successMessage = $state("");

    const handleSubmit = () => {
        loading = true;
        successMessage = "";
        return async ({ result }: { result: any }) => {
            loading = false;
            if (result.type === "success") {
                successMessage = "Settings saved successfully!";
                setTimeout(() => {
                    successMessage = "";
                }, 3000);
            }
        };
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Member since today";
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };
</script>

<svelte:head>
    <title>Account - Resin</title>
</svelte:head>

<main class="flex-grow pt-32 pb-40 px-6 relative z-10 w-full overflow-hidden">
    <!-- Background Decor -->
    <div class="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div
            class="absolute top-1/4 right-[-10%] w-[40%] h-[40%] bg-resin-amber/5 blur-[120px] rounded-full"
        ></div>
        <div
            class="absolute bottom-1/4 left-[-10%] w-[40%] h-[40%] bg-resin-forest/5 blur-[120px] rounded-full"
        ></div>
    </div>

    <div class="max-w-6xl mx-auto">
        <!-- Dashboard Header -->
        <header
            class="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-fade-in"
        >
            <div class="space-y-4">
                <div class="flex items-center gap-4">
                    <div
                        class="w-16 h-16 rounded-[2rem] bg-resin-charcoal text-white flex items-center justify-center text-2xl font-bold shadow-premium"
                    >
                        {session?.user.email?.[0].toUpperCase() ?? "U"}
                    </div>
                    <div>
                        <h1
                            class="text-4xl md:text-5xl font-bold text-resin-charcoal font-serif tracking-tight"
                        >
                            Hi, {session?.user.email?.split("@")[0]}
                        </h1>
                        <p
                            class="text-resin-earth/70 font-light flex items-center gap-2"
                        >
                            <span
                                class="w-1.5 h-1.5 rounded-full bg-resin-forest animate-pulse"
                            ></span>
                            {formatDate(profile?.created_at)}
                        </p>
                    </div>
                </div>
            </div>

            <form method="POST" action="/logout">
                <button
                    class="px-6 py-3 bg-white border border-resin-forest/10 rounded-2xl text-sm font-bold text-resin-earth hover:text-resin-charcoal hover:shadow-md transition-all flex items-center gap-2 group"
                >
                    Sign Out
                    <svg
                        class="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        ></path>
                    </svg>
                </button>
            </form>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <!-- Left Column: Primary Actions -->
            <div
                class="lg:col-span-8 space-y-8 animate-fade-in"
                style="animation-delay: 0.1s"
            >
                <!-- Google Calendar Card -->
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-12 border border-resin-forest/5 shadow-premium relative overflow-hidden group"
                >
                    <div
                        class="absolute -right-20 -top-20 w-80 h-80 bg-resin-amber/5 rounded-full blur-3xl group-hover:bg-resin-amber/10 transition-all duration-1000"
                    ></div>

                    <div class="relative z-10">
                        <div
                            class="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10"
                        >
                            <div class="space-y-4">
                                <div class="flex items-center gap-4">
                                    <div
                                        class="w-14 h-14 rounded-2xl bg-white border border-resin-forest/5 shadow-premium flex items-center justify-center"
                                    >
                                        <svg
                                            class="w-8 h-8"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                                fill="#4285F4"
                                            />
                                            <path
                                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                                fill="#34A853"
                                            />
                                            <path
                                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                                fill="#FBBC05"
                                            />
                                            <path
                                                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                                fill="#EA4335"
                                            />
                                        </svg>
                                    </div>
                                    <div class="space-y-1">
                                        <h2
                                            class="text-3xl font-bold text-resin-charcoal"
                                        >
                                            Google Calendar
                                        </h2>
                                        <p
                                            class="text-sm font-bold text-resin-forest uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <span
                                                class="w-2 h-2 rounded-full bg-resin-forest"
                                            ></span>
                                            Integrated
                                        </p>
                                    </div>
                                </div>
                                <p
                                    class="text-resin-earth text-lg font-light max-w-md leading-relaxed"
                                >
                                    Resin uses your calendar to find the perfect
                                    windows for your brain dumps.
                                </p>
                            </div>

                            <form method="POST" action="?/signInWithGoogle">
                                <button
                                    class="group relative px-10 py-5 bg-white border border-resin-forest/10 rounded-[2rem] font-bold text-resin-charcoal hover:bg-resin-charcoal hover:text-white transition-all duration-500 shadow-premium hover:shadow-2xl hover:-translate-y-1 flex items-center gap-3"
                                >
                                    Reconnect Calendar
                                    <svg
                                        class="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                        ></path>
                                    </svg>
                                </button>
                            </form>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                                class="p-5 bg-resin-forest/[0.03] border border-resin-forest/5 rounded-3xl space-y-2"
                            >
                                <p
                                    class="text-[10px] text-resin-forest font-bold uppercase tracking-widest"
                                >
                                    Active Permissions
                                </p>
                                <p class="text-sm text-resin-earth/80">
                                    Read & Write Calendar Events
                                </p>
                            </div>
                            <div
                                class="p-5 bg-resin-amber/[0.03] border border-resin-amber/5 rounded-3xl space-y-2"
                            >
                                <p
                                    class="text-[10px] text-resin-amber font-bold uppercase tracking-widest"
                                >
                                    Auto-Scheduler
                                </p>
                                <p class="text-sm text-resin-earth/80">
                                    Active for all new brain dumps
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Preferences Form -->
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-12 border border-resin-forest/5 shadow-premium"
                >
                    <div class="flex items-center justify-between mb-10">
                        <div class="space-y-1">
                            <h2
                                class="text-3xl font-bold text-resin-charcoal tracking-tight"
                            >
                                Work Preferences
                            </h2>
                            <p class="text-resin-earth/60 font-light">
                                Fine-tune how Resin organizes your deep work.
                            </p>
                        </div>
                    </div>

                    <form
                        method="POST"
                        action="?/updateProfile"
                        use:enhance={handleSubmit}
                        class="space-y-10"
                    >
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="group space-y-2">
                                <label
                                    for="availability_start"
                                    class="text-[10px] font-bold text-resin-amber uppercase tracking-widest ml-4"
                                    >Daily Focus Starts</label
                                >
                                <div class="relative">
                                    <input
                                        type="time"
                                        id="availability_start"
                                        name="availability_start"
                                        value={profile?.availability_start ??
                                            "09:00"}
                                        class="w-full px-6 py-4 bg-resin-bg/50 border border-resin-forest/5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-resin-forest/5 focus:bg-white transition-all text-resin-charcoal font-medium text-lg"
                                    />
                                </div>
                            </div>
                            <div class="group space-y-2">
                                <label
                                    for="availability_end"
                                    class="text-[10px] font-bold text-resin-amber uppercase tracking-widest ml-4"
                                    >Daily Focus Ends</label
                                >
                                <div class="relative">
                                    <input
                                        type="time"
                                        id="availability_end"
                                        name="availability_end"
                                        value={profile?.availability_end ??
                                            "17:00"}
                                        class="w-full px-6 py-4 bg-resin-bg/50 border border-resin-forest/5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-resin-forest/5 focus:bg-white transition-all text-resin-charcoal font-medium text-lg"
                                    />
                                </div>
                            </div>
                        </div>

                        <!-- Removed OpenCLAW fields from here to dedicated cards -->

                        <div class="pt-4 flex items-center justify-between">
                            <div class="h-6">
                                {#if successMessage}
                                    <span
                                        in:fade
                                        class="text-sm font-bold text-resin-forest flex items-center gap-2"
                                    >
                                        <svg
                                            class="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="3"
                                                d="M5 13l4 4L19 7"
                                            ></path>
                                        </svg>
                                        {successMessage}
                                    </span>
                                {/if}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                class="px-12 py-5 bg-resin-forest text-white rounded-[2rem] font-bold hover:bg-resin-charcoal transition-all shadow-premium hover:shadow-2xl hover:-translate-y-1 disabled:opacity-50 flex items-center gap-3 active:scale-95"
                            >
                                {#if loading}
                                    <svg
                                        class="animate-spin h-5 w-5 text-white"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            class="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            stroke-width="4"
                                        ></circle>
                                        <path
                                            class="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        ></path>
                                    </svg>
                                {:else}
                                    Save Changes
                                {/if}
                            </button>
                        </div>
                    </form>
                </section>

                <!-- Integrations & APIs Header -->
                <div class="pt-8 px-4 flex items-center justify-between">
                    <h2
                        class="text-3xl font-bold text-resin-charcoal tracking-tight"
                    >
                        Integrations & API
                    </h2>
                </div>

                <!-- OpenCLAW Card -->
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-12 border border-resin-forest/5 shadow-premium relative overflow-hidden group"
                >
                    <div
                        class="absolute -right-20 -top-20 w-80 h-80 bg-resin-charcoal/5 rounded-full blur-3xl group-hover:bg-resin-charcoal/10 transition-all duration-1000"
                    ></div>
                    <div class="relative z-10 space-y-8">
                        <div class="flex items-start justify-between">
                            <div class="space-y-2">
                                <div class="flex items-center gap-4">
                                    <div
                                        class="w-12 h-12 rounded-2xl bg-resin-charcoal text-white flex items-center justify-center font-bold text-xl font-serif"
                                    >
                                        C
                                    </div>
                                    <h3
                                        class="text-2xl font-bold text-resin-charcoal"
                                    >
                                        OpenCLAW Connection
                                    </h3>
                                </div>
                                <p
                                    class="text-resin-earth/80 font-light mt-2 max-w-lg"
                                >
                                    Send your active focus sessions directly to
                                    OpenCLAW to stay accountable to the
                                    community.
                                </p>
                            </div>
                        </div>
                        <form
                            method="POST"
                            action="?/updateProfile"
                            use:enhance={handleSubmit}
                            class="space-y-6"
                        >
                            <div class="group space-y-2 relative z-20">
                                <label
                                    for="openclaw_url_new"
                                    class="text-[10px] font-bold text-resin-charcoal uppercase tracking-widest ml-4"
                                    >OpenCLAW Instance URL</label
                                >
                                <input
                                    type="url"
                                    id="openclaw_url_new"
                                    name="openclaw_url"
                                    value={profile?.openclaw_url ?? ""}
                                    placeholder="https://api.openclaw.com"
                                    class="w-full px-6 py-4 bg-white/50 border border-resin-forest/10 rounded-2xl focus:outline-none focus:ring-4 focus:ring-resin-charcoal/5 focus:bg-white transition-all text-resin-charcoal"
                                />
                            </div>
                            <div class="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    class="px-8 py-3 bg-white border border-resin-forest/10 rounded-full font-bold text-resin-charcoal hover:bg-resin-charcoal hover:text-white transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm"
                                    >Save Connection</button
                                >
                            </div>
                        </form>
                    </div>
                </section>

                <!-- Developer Tools Card -->
                <section
                    class="glass-card rounded-[2.5rem] p-8 md:p-12 border border-resin-amber/20 shadow-premium relative overflow-hidden group"
                >
                    <div class="relative z-10 space-y-8">
                        <div>
                            <h3 class="text-2xl font-bold text-resin-amber">
                                Developer Tools
                            </h3>
                            <p
                                class="text-resin-earth/80 font-light mt-2 max-w-lg"
                            >
                                Generate a Personal Access Token (PAT) to
                                authorize external applications or your own
                                scripts to read your schedule via API.
                            </p>
                        </div>
                        <div
                            class="bg-white/50 border border-resin-amber/20 rounded-2xl p-6 font-mono text-sm text-resin-charcoal break-all relative"
                        >
                            {#if profile?.openclaw_api_key}
                                {profile.openclaw_api_key}
                            {:else}
                                <span class="text-resin-earth/40 italic"
                                    >No token generated yet.</span
                                >
                            {/if}
                        </div>
                        <form
                            method="POST"
                            action="?/generateToken"
                            use:enhance={() => {
                                loading = true;
                                return async ({ result, update }) => {
                                    loading = false;
                                    await update();
                                };
                            }}
                            class="flex justify-start"
                        >
                            <button
                                type="submit"
                                disabled={loading}
                                class="px-8 py-3 bg-resin-amber text-white rounded-full font-bold hover:bg-resin-amber/90 transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm flex items-center gap-2"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    ></path></svg
                                >
                                Generate New Token
                            </button>
                        </form>
                    </div>
                </section>
            </div>

            <!-- Right Column: Info & Safety -->
            <div
                class="lg:col-span-4 space-y-8 animate-fade-in"
                style="animation-delay: 0.2s"
            >
                <!-- Safety & Transparency Card -->
                <section
                    class="glass-card rounded-[2.5rem] p-8 border border-resin-forest/10 shadow-premium bg-gradient-to-br from-white to-resin-forest/[0.02]"
                >
                    <div
                        class="w-12 h-12 rounded-2xl bg-resin-forest/10 flex items-center justify-center text-resin-forest mb-6"
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.043A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            ></path>
                        </svg>
                    </div>
                    <h2
                        class="text-2xl font-bold text-resin-charcoal font-serif mb-4"
                    >
                        Safety & Transparency
                    </h2>
                    <div class="space-y-6">
                        <div class="space-y-2">
                            <h3
                                class="text-xs font-bold text-resin-forest uppercase tracking-widest"
                            >
                                Your Private Infrastructure
                            </h3>
                            <p
                                class="text-sm text-resin-earth/80 leading-relaxed font-light"
                            >
                                Resin leverages <span
                                    class="font-semibold text-resin-charcoal"
                                    >Supabase</span
                                > for high-performance, private data storage. Your
                                notes and tokens never leave this secure infrastructure.
                            </p>
                        </div>
                        <div class="space-y-2">
                            <h3
                                class="text-xs font-bold text-resin-forest uppercase tracking-widest"
                            >
                                Resin's Privacy Policy
                            </h3>
                            <p
                                class="text-sm text-resin-earth/80 leading-relaxed font-light"
                            >
                                We've designed Resin so that <span
                                    class="font-semibold text-resin-charcoal"
                                    >we cannot read your private content</span
                                >. Everything is stored in your personal
                                encrypted space.
                            </p>
                        </div>
                    </div>
                </section>

                <!-- Usage Quick Info -->
                <section
                    class="glass-card rounded-[2.5rem] p-8 border border-resin-forest/5 shadow-premium"
                >
                    <h2
                        class="text-xs font-bold text-resin-amber uppercase tracking-widest mb-6"
                    >
                        Account Summary
                    </h2>
                    <div class="space-y-6">
                        <div
                            class="flex items-center justify-between border-b border-resin-forest/5 pb-4"
                        >
                            <span class="text-sm text-resin-earth"
                                >Active Session</span
                            >
                            <span
                                class="w-3 h-3 rounded-full bg-resin-forest shadow-[0_0_10px_rgba(20,60,40,0.3)]"
                            ></span>
                        </div>
                        <div
                            class="flex items-center justify-between border-b border-resin-forest/5 pb-4"
                        >
                            <span class="text-sm text-resin-earth"
                                >Data Region</span
                            >
                            <span
                                class="text-sm font-semibold text-resin-charcoal"
                                >US East</span
                            >
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-resin-earth"
                                >Mobile Ready</span
                            >
                            <span
                                class="text-sm font-semibold text-resin-charcoal"
                                >Yes</span
                            >
                        </div>
                    </div>
                </section>

                <!-- Feedback/Support -->
                <a href="/support" class="block group">
                    <div
                        class="glass-card rounded-[2rem] p-6 border border-resin-forest/5 shadow-premium group-hover:bg-resin-forest/[0.03] transition-all"
                    >
                        <div class="flex items-center gap-4">
                            <div
                                class="w-10 h-10 rounded-xl bg-resin-bg flex items-center justify-center text-resin-charcoal group-hover:scale-110 transition-transform"
                            >
                                <svg
                                    class="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path>
                                </svg>
                            </div>
                            <div>
                                <h3
                                    class="text-sm font-bold text-resin-charcoal"
                                >
                                    Need help?
                                </h3>
                                <p class="text-xs text-resin-earth/60">
                                    Contact support or give feedback
                                </p>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
        </div>
    </div>
</main>

<style>
    .glass-card {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
    }

    @keyframes fade-in {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-fade-in {
        animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
</style>
