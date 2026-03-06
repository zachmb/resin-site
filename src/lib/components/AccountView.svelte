<script lang="ts">
    import { enhance } from "$app/forms";
    import { fade } from "svelte/transition";

    let { session, profile } = $props<{ session: any; profile: any }>();

    let loading = $state(false);
    let successMessage = $state("");
    let showDocs = $state(false);

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

<main
    class="w-full h-full min-h-screen pt-24 pb-40 px-6 relative z-10 flex flex-col max-w-6xl mx-auto"
>
    <!-- Dashboard Header -->
    <header
        class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8 animate-fade-in"
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
                        class="text-3xl md:text-4xl font-bold text-resin-charcoal font-serif tracking-tight"
                    >
                        Hi, {session?.user.email?.split("@")[0]}
                    </h1>
                    <p
                        class="text-resin-earth/70 font-light flex items-center gap-2 text-sm mt-1"
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
                class="px-6 py-2.5 bg-white border border-resin-forest/10 rounded-xl text-sm font-bold text-resin-earth hover:text-red-500 hover:border-red-200 hover:shadow-sm transition-all flex items-center gap-2 group"
            >
                Sign Out
                <svg
                    class="w-4 h-4"
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

    <div class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <!-- Left Column: Primary Actions -->
        <div
            class="xl:col-span-8 space-y-8 animate-fade-in"
            style="animation-delay: 0.1s"
        >
            <!-- Google Calendar Card -->
            <section
                class="glass-card rounded-[2.5rem] p-8 md:p-12 border border-resin-forest/5 shadow-premium relative overflow-hidden group"
            >
                <div
                    class="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-1000"
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
                                    <svg class="w-8 h-8" viewBox="0 0 24 24">
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
                                        class="text-2xl font-bold text-resin-charcoal"
                                    >
                                        Google Calendar
                                    </h2>
                                    <p
                                        class="text-[10px] font-bold text-resin-forest uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <span
                                            class="w-2 h-2 rounded-full bg-resin-forest animate-pulse"
                                        ></span>
                                        Integrated
                                    </p>
                                </div>
                            </div>
                            <p
                                class="text-resin-earth text-sm md:text-base font-light max-w-md leading-relaxed"
                            >
                                Resin uses your calendar to find the perfect
                                windows for your brain dumps to be scheduled.
                            </p>
                        </div>

                        <form
                            method="POST"
                            action="?/signInWithGoogle"
                            use:enhance
                        >
                            <button
                                class="group relative px-6 py-3 bg-white border border-resin-forest/10 rounded-xl font-bold text-sm text-resin-charcoal hover:bg-resin-charcoal hover:text-white transition-all shadow-sm flex items-center gap-2"
                            >
                                Reconnect
                                <svg
                                    class="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity"
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
                </div>
            </section>

            <!-- Preferences Form -->
            <section
                class="glass-card rounded-[2.5rem] p-8 md:p-12 border border-resin-forest/5 shadow-premium"
            >
                <div class="flex items-center justify-between mb-8">
                    <div class="space-y-1">
                        <h2
                            class="text-2xl font-bold text-resin-charcoal tracking- tight"
                        >
                            Work Preferences
                        </h2>
                        <p class="text-resin-earth/60 font-light text-sm">
                            Fine-tune how Resin organizes your deep work.
                        </p>
                    </div>
                </div>

                <form
                    method="POST"
                    action="?/updateProfile"
                    use:enhance={handleSubmit}
                    class="space-y-8"
                >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="group space-y-2">
                            <label
                                for="availability_start"
                                class="text-[10px] font-bold text-resin-amber uppercase tracking-widest ml-2"
                                >Daily Focus Starts</label
                            >
                            <input
                                type="time"
                                id="availability_start"
                                name="availability_start"
                                value={profile?.availability_start ?? "09:00"}
                                class="w-full px-5 py-3 bg-white/50 border border-resin-forest/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-resin-forest/20 focus:bg-white transition-all text-resin-charcoal font-medium"
                            />
                        </div>
                        <div class="group space-y-2">
                            <label
                                for="availability_end"
                                class="text-[10px] font-bold text-resin-amber uppercase tracking-widest ml-2"
                                >Daily Focus Ends</label
                            >
                            <input
                                type="time"
                                id="availability_end"
                                name="availability_end"
                                value={profile?.availability_end ?? "17:00"}
                                class="w-full px-5 py-3 bg-white/50 border border-resin-forest/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-resin-forest/20 focus:bg-white transition-all text-resin-charcoal font-medium"
                            />
                        </div>
                    </div>

                    <div class="border-t border-resin-forest/5 pt-6 mt-6">
                        <label
                            class="flex items-start gap-4 cursor-pointer group"
                        >
                            <div
                                class="relative flex items-center justify-center pt-1"
                            >
                                <input
                                    type="checkbox"
                                    name="sync_notes"
                                    class="peer sr-only"
                                    checked={profile?.sync_notes ?? true}
                                />
                                <div
                                    class="w-11 h-6 bg-resin-earth/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-resin-forest shadow-inner"
                                ></div>
                            </div>
                            <div class="space-y-1 flex-1">
                                <div
                                    class="text-sm font-bold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                                >
                                    Sync Notes to Mobile App
                                </div>
                                <p
                                    class="text-xs text-resin-earth/70 font-light leading-relaxed"
                                >
                                    Allow the Resin mobile app to securely read
                                    and edit your saved notes. If disabled,
                                    notes only live in the web database and
                                    won't appear on your phone.
                                </p>
                            </div>
                        </label>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="h-6">
                            {#if successMessage}
                                <span
                                    in:fade
                                    class="text-sm font-bold text-resin-forest flex items-center gap-2"
                                >
                                    <svg
                                        class="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        ><path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="3"
                                            d="M5 13l4 4L19 7"
                                        ></path></svg
                                    >
                                    {successMessage}
                                </span>
                            {/if}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            class="px-8 py-3 bg-resin-forest text-white rounded-xl font-bold hover:bg-resin-charcoal transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                            {#if loading}
                                <svg
                                    class="animate-spin h-4 w-4 text-white"
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

            <!-- API Integration -->
            <section
                class="glass-card rounded-[2.5rem] p-8 border border-resin-amber/20 shadow-premium"
            >
                <div class="space-y-6">
                    <div class="flex justify-between items-start gap-4">
                        <div>
                            <h3
                                class="text-xl font-bold text-resin-charcoal flex items-center gap-2"
                            >
                                Developer API (PAT)
                                <span
                                    class="px-2 py-0.5 bg-resin-forest/10 text-resin-forest text-[10px] font-bold uppercase tracking-wider rounded-full"
                                    >Pro</span
                                >
                            </h3>
                            <p
                                class="text-resin-earth/80 font-light text-sm mt-1 max-w-lg"
                            >
                                Generate a Personal Access Token to authorize
                                external applications to read your schedule via
                                API.
                            </p>
                        </div>
                        <button
                            class="text-sm font-semibold text-resin-forest hover:text-resin-charcoal transition-colors underline underline-offset-4 decoration-resin-forest/30"
                            onclick={() => (showDocs = !showDocs)}
                        >
                            {showDocs ? "Hide Docs" : "View API Docs"}
                        </button>
                    </div>

                    {#if showDocs}
                        <div
                            class="bg-white/50 rounded-2xl p-6 border border-resin-forest/10 mt-4 transition-all animate-fade-in"
                            transition:fade={{ duration: 200 }}
                        >
                            <h4
                                class="font-bold text-resin-charcoal mb-4 flex items-center gap-2"
                            >
                                <svg
                                    class="w-4 h-4 text-resin-forest"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                    ></path></svg
                                >
                                API Documentation
                            </h4>

                            <div class="space-y-6 text-sm">
                                <!-- Endpoint 1 -->
                                <div>
                                    <div class="flex items-center gap-3 mb-2">
                                        <span
                                            class="px-2 py-1 bg-resin-charcoal text-white font-bold rounded text-[10px] uppercase tracking-wider"
                                            >GET</span
                                        >
                                        <code
                                            class="font-mono text-resin-forest font-semibold"
                                            >/api/schedule</code
                                        >
                                    </div>
                                    <p class="text-resin-earth/80 mb-3">
                                        Retrieve your active Amber Session
                                        blocks natively over JSON.
                                    </p>

                                    <div
                                        class="bg-black/5 rounded-xl p-4 font-mono text-xs text-resin-charcoal/80 mb-3 overflow-x-auto"
                                    >
                                        <div class="text-resin-earth/50 mb-1">
                                            // Authorization Header Required
                                        </div>
                                        <div>
                                            curl -X GET
                                            https://www.noteresin.com/api/schedule
                                            \
                                        </div>
                                        <div>
                                            -H "Authorization: Bearer
                                            YOUR_PAT_TOKEN"
                                        </div>
                                    </div>

                                    <div
                                        class="bg-white rounded-xl p-4 border border-resin-forest/5 font-mono text-[11px] text-resin-charcoal/80 overflow-x-auto"
                                    >
                                        <div class="text-resin-earth/50 mb-1">
                                            // Example Response
                                        </div>
                                        <pre>{`{
  "status": "success",
  "data": [
    {
      "id": "blk_123xyz",
      "title": "Deep Work Segment",
      "start_time": "2026-03-05T09:00:00Z",
      "end_time": "2026-03-05T11:00:00Z"
    }
  ]
}`}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    {/if}

                    <div
                        class="bg-white/50 border border-resin-amber/20 rounded-xl p-4 font-mono text-sm text-resin-charcoal break-all mt-6"
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
                    >
                        <button
                            type="submit"
                            disabled={loading}
                            class="px-6 py-2.5 bg-resin-amber text-white rounded-xl font-bold hover:bg-resin-amber/90 transition-all shadow-sm text-sm"
                        >
                            Generate New Token
                        </button>
                    </form>
                </div>
            </section>
        </div>

        <!-- Right Column: Info -->
        <div
            class="xl:col-span-4 space-y-6 animate-fade-in"
            style="animation-delay: 0.2s"
        >
            <section
                class="glass-card rounded-[2rem] p-6 border border-resin-forest/10 shadow-sm"
            >
                <h2
                    class="text-xl font-bold text-resin-charcoal font-serif mb-4"
                >
                    Safety & Transparency
                </h2>
                <p
                    class="text-sm text-resin-earth/80 leading-relaxed font-light mb-4"
                >
                    We've designed Resin so that <span
                        class="font-semibold text-resin-charcoal"
                        >we cannot read your private content</span
                    >. Everything is stored in your personal encrypted space in
                    Supabase.
                </p>
                <a
                    href="/privacy"
                    class="text-sm font-semibold text-resin-forest hover:underline"
                    >Read our Privacy Policy &rarr;</a
                >
            </section>

            <a href="/support" class="block group">
                <div
                    class="glass-card rounded-[2rem] p-6 border border-resin-forest/5 shadow-sm group-hover:border-resin-forest/20 transition-all"
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
                            <h3 class="text-sm font-bold text-resin-charcoal">
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
</main>
