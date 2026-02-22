<script lang="ts">
    /** @type {import('./$types').ActionData} */
    export let form;
</script>

<svelte:head>
    <title>Login to Resin</title>
</svelte:head>

<main
    class="flex-grow flex items-center justify-center px-6 py-20 relative z-10"
>
    <div class="max-w-md w-full">
        <div
            class="glass-card rounded-[2.5rem] p-10 text-center space-y-8 animate-fade-in"
        >
            <div class="space-y-4">
                <img
                    src="/logo.png"
                    alt="Resin Logo"
                    class="w-20 h-20 mx-auto rounded-2xl shadow-md border border-resin-forest/10"
                />
                <h1 class="text-3xl font-bold font-serif text-resin-charcoal">
                    Welcome to Resin
                </h1>
                <p class="text-resin-earth font-light text-balance">
                    Connect your accounts to start turning your brain dumps into
                    reality.
                </p>
            </div>

            <div class="space-y-6">
                <form method="POST" action="?/signInWithGoogle">
                    <button
                        class="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-resin-forest/10 rounded-2xl text-resin-charcoal font-semibold hover:bg-resin-bg hover:shadow-md transition-all duration-300 group"
                    >
                        <svg class="w-6 h-6" viewBox="0 0 24 24">
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
                        Continue with Google
                    </button>
                </form>

                <div
                    class="px-4 py-3 bg-resin-amber/5 border border-resin-amber/20 rounded-xl"
                >
                    <p
                        class="text-[10px] text-resin-amber font-bold uppercase tracking-widest mb-1"
                    >
                        Important
                    </p>
                    <p class="text-xs text-resin-earth/80">
                        Resin requires Google Calendar access to automatically
                        schedule your deep work sessions.
                    </p>
                </div>
            </div>

            {#if form?.error}
                <p class="text-sm text-red-500 font-medium">{form.error}</p>
            {/if}

            <div class="pt-4">
                <a
                    href="/"
                    class="text-sm text-resin-earth/60 hover:text-resin-forest transition-colors underline underline-offset-4 decoration-resin-earth/20"
                >
                    Back to home
                </a>
            </div>
        </div>
    </div>
</main>
