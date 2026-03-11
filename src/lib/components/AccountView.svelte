<script lang="ts">
    import { enhance } from "$app/forms";
    import { fade } from "svelte/transition";

    let { session, profile, tasteData, deviceTokens = [], commandConfigs = [] } = $props<{
        session: any;
        profile: any;
        tasteData?: any;
        deviceTokens?: any[];
        commandConfigs?: any[];
    }>();

    let loading = $state(false);
    let successMessage = $state("");
    let showDocs = $state(false);
    let activeCategory = $state<
        "profile" | "preferences" | "integrations" | "api" | "privacy" | "taste" | "devices"
    >("profile");

    // Command config management
    let editingCommandType = $state<string | null>(null);
    let commandConfigForm = $state<Record<string, string>>({});

    const commandTypes = [
        { type: 'send-email', icon: '📧', label: 'Email', fields: ['email_address'] },
        { type: 'webhook', icon: '🔗', label: 'Webhook', fields: ['url'] },
        { type: 'slack', icon: '💬', label: 'Slack', fields: ['webhook_url', 'channel'] },
        { type: 'telegram', icon: '✈️', label: 'Telegram', fields: ['bot_token', 'chat_id'] },
        { type: 'discord', icon: '🎮', label: 'Discord', fields: ['webhook_url'] },
        { type: 'twitter', icon: '𝕏', label: 'Post to X', fields: ['api_key', 'api_secret', 'access_token', 'access_token_secret'] },
        { type: 'notion', icon: '📝', label: 'Notion', fields: ['api_key', 'database_id'] }
    ];

    const fieldLabels: Record<string, string> = {
        email_address: 'Email Address',
        url: 'Webhook URL',
        webhook_url: 'Webhook URL',
        channel: 'Channel',
        bot_token: 'Bot Token',
        chat_id: 'Chat ID',
        api_key: 'API Key',
        api_secret: 'API Secret',
        access_token: 'Access Token',
        access_token_secret: 'Access Token Secret',
        database_id: 'Database ID'
    };

    function getCommandConfig(type: string) {
        return commandConfigs.find((c: any) => c.command_type === type);
    }

    function startEditingCommand(type: string) {
        editingCommandType = type;
        const existing = getCommandConfig(type);
        if (existing?.config) {
            commandConfigForm = { ...existing.config };
        } else {
            commandConfigForm = {};
        }
    }

    function cancelEditing() {
        editingCommandType = null;
        commandConfigForm = {};
    }

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

    const formatDate = (dateString?: string, fallbackDate?: string) => {
        const dateToFormat = dateString || fallbackDate;
        if (!dateToFormat) return "Member since today";
        return new Date(dateToFormat).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatRelativeTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return "Just now";
        if (minutes < 60) return `${minutes} min ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const getPlatformIcon = (platform: string) => {
        if (platform === "apns") return { icon: "📱", label: "iOS App" };
        return { icon: "🔒", label: "Browser Extension" };
    };

    const categories = [
        { id: "profile", label: "Profile", icon: "👤" },
        { id: "preferences", label: "Preferences", icon: "⚙️" },
        { id: "integrations", label: "Integrations", icon: "🔗" },
        { id: "devices", label: "Devices", icon: "📱" },
        { id: "taste", label: "Taste Profile", icon: "✦" },
        { id: "api", label: "API", icon: "🔑" },
        { id: "privacy", label: "Privacy", icon: "🔒" },
    ] as const;

    const feelingIcons: Record<string, string> = {
        "Flow State": "⚡",
        Proud: "⭐",
        Relieved: "🍃",
        Energized: "🔥",
        Drained: "🪫",
        Frustrated: "🌧️",
    };

    const topFeelings = $derived(
        tasteData?.feelingCounts
            ? Object.entries(tasteData.feelingCounts).sort(
                  (a, b) => b[1] - a[1],
              )
            : [],
    );

    const totalRatings = $derived(tasteData?.ratingHistory?.length || 0);
    const avgRating = $derived(
        totalRatings > 0
            ? Math.round(
                  (tasteData.ratingHistory.reduce(
                      (acc: number, curr: any) => acc + curr.rating,
                      0,
                  ) /
                      totalRatings) *
                      10,
              ) / 10
            : 0,
    );
</script>

<main
    class="w-full h-full min-h-screen pt-24 pb-32 px-4 sm:px-6 relative z-10 flex flex-col max-w-7xl mx-auto"
>
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
        <div>
            <h1 class="text-3xl font-serif font-bold text-resin-charcoal">
                Account Settings
            </h1>
            <p class="text-resin-earth/70 mt-1">
                Manage your profile and preferences
            </p>
        </div>
    </div>

    <!-- Two-Panel Layout -->
    <div class="flex gap-6 flex-1 relative min-h-[600px]">
        <!-- Left Panel: Settings Navigation -->
        <div
            class="flex-shrink-0 w-full sm:w-80 flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-premium border border-resin-forest/5 overflow-hidden"
        >
            <!-- Profile Card at Top -->
            <div
                class="p-6 border-b border-resin-forest/5 bg-white/40 space-y-4"
            >
                <div class="flex items-center gap-4">
                    <div
                        class="w-14 h-14 rounded-xl bg-resin-charcoal text-white flex items-center justify-center text-xl font-bold shadow-sm"
                    >
                        {session?.user.email?.[0].toUpperCase() ?? "U"}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="font-bold text-resin-charcoal truncate">
                            {session?.user.email?.split("@")[0] ?? "User"}
                        </h2>
                        <p class="text-xs text-resin-earth/60 truncate">
                            {session?.user.email ?? ""}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Settings Categories -->
            <div class="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {#each categories as category (category.id)}
                    <button
                        onclick={() => (activeCategory = category.id)}
                        class="w-full text-left p-4 rounded-lg transition-all duration-200 border border-transparent {activeCategory ===
                        category.id
                            ? 'bg-resin-forest/5 border-resin-forest/10 relative before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-resin-forest before:rounded-r-md'
                            : 'hover:bg-black/5'}"
                    >
                        <div class="flex items-center gap-3">
                            <span class="text-lg">{category.icon}</span>
                            <span
                                class="font-semibold text-sm text-resin-charcoal"
                            >
                                {category.label}
                            </span>
                        </div>
                    </button>
                {/each}
            </div>

            <!-- Sign Out Button -->
            <div class="p-3 border-t border-resin-forest/5 bg-white/30">
                <form method="POST" action="/logout" class="w-full">
                    <button
                        class="w-full px-4 py-2.5 bg-red-400/10 text-red-600 border border-red-400/20 rounded-xl text-sm font-semibold hover:bg-red-400/20 transition-all flex items-center justify-center gap-2"
                    >
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
                        Sign Out
                    </button>
                </form>
            </div>
        </div>

        <!-- Right Panel: Settings Content -->
        <div
            class="flex-1 hidden sm:flex flex-col bg-white/60 backdrop-blur-md rounded-2xl shadow-premium border border-resin-forest/5 overflow-hidden"
        >
            {#if activeCategory === "profile"}
                <!-- Profile Content -->
                <div
                    class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-2"
                >
                    <h2
                        class="text-2xl font-serif font-bold text-resin-charcoal"
                    >
                        Your Profile
                    </h2>
                    <p class="text-sm text-resin-earth/60">
                        View your account information
                    </p>
                </div>

                <div
                    class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
                >
                    <!-- Email Section -->
                    <section>
                        <h3
                            class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3"
                        >
                            Account
                        </h3>
                        <div
                            class="bg-white/50 rounded-xl p-4 border border-resin-forest/5 space-y-3"
                        >
                            <div>
                                <label
                                    class="text-xs text-resin-earth/60 font-semibold"
                                    >Email Address</label
                                >
                                <div
                                    class="text-sm font-mono text-resin-charcoal mt-1"
                                >
                                    {session?.user.email ?? "—"}
                                </div>
                            </div>
                            <div class="border-t border-resin-forest/5 pt-3">
                                <label
                                    class="text-xs text-resin-earth/60 font-semibold"
                                    >Member Since</label
                                >
                                <div class="text-sm text-resin-charcoal mt-1">
                                    {formatDate(
                                        profile?.created_at,
                                        session?.user.created_at,
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- Storage Info -->
                    <section>
                        <h3
                            class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3"
                        >
                            Storage
                        </h3>
                        <div
                            class="bg-white/50 rounded-xl p-4 border border-resin-forest/5"
                        >
                            <p class="text-sm text-resin-charcoal/80">
                                All your notes and sessions are securely stored
                                in your personal Supabase instance. We cannot
                                access your data.
                            </p>
                        </div>
                    </section>
                </div>
            {:else if activeCategory === "preferences"}
                <!-- Preferences Content -->
                <div
                    class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-2"
                >
                    <h2
                        class="text-2xl font-serif font-bold text-resin-charcoal"
                    >
                        Work Preferences
                    </h2>
                    <p class="text-sm text-resin-earth/60">
                        Customize how Resin organizes your deep work
                    </p>
                </div>

                <div class="overflow-y-auto flex-1 p-6 custom-scrollbar">
                    <form
                        method="POST"
                        action="?/updateProfile"
                        use:enhance={handleSubmit}
                        class="space-y-6"
                    >
                        <!-- Focus Window -->
                        <section>
                            <h3
                                class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-4"
                            >
                                Daily Focus Window
                            </h3>
                            <div class="space-y-4">
                                <div class="space-y-2">
                                    <label
                                        for="availability_start"
                                        class="text-sm font-semibold text-resin-charcoal"
                                    >
                                        Focus Starts
                                    </label>
                                    <input
                                        type="time"
                                        id="availability_start"
                                        name="availability_start"
                                        value={profile?.availability_start ??
                                            "09:00"}
                                        class="w-full px-4 py-3 bg-white/70 border border-resin-forest/10 rounded-xl focus:outline-none focus:border-resin-forest/30 focus:bg-white transition-all text-resin-charcoal font-medium"
                                    />
                                </div>
                                <div class="space-y-2">
                                    <label
                                        for="availability_end"
                                        class="text-sm font-semibold text-resin-charcoal"
                                    >
                                        Focus Ends
                                    </label>
                                    <input
                                        type="time"
                                        id="availability_end"
                                        name="availability_end"
                                        value={profile?.availability_end ??
                                            "17:00"}
                                        class="w-full px-4 py-3 bg-white/70 border border-resin-forest/10 rounded-xl focus:outline-none focus:border-resin-forest/30 focus:bg-white transition-all text-resin-charcoal font-medium"
                                    />
                                </div>
                            </div>
                        </section>

                        <!-- Sync Settings -->
                        <section class="border-t border-resin-forest/5 pt-6">
                            <h3
                                class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-4"
                            >
                                Sync Settings
                            </h3>
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
                                        class="text-sm font-semibold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                                    >
                                        Sync Notes to Mobile App
                                    </div>
                                    <p
                                        class="text-xs text-resin-earth/70 font-light leading-relaxed"
                                    >
                                        Allow the Resin app to read and edit
                                        your notes. If disabled, notes only
                                        exist on the web.
                                    </p>
                                </div>
                            </label>
                        </section>

                        <!-- Widget Settings -->
                        <section class="border-t border-resin-forest/5 pt-6">
                            <h3
                                class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-4"
                            >
                                Home Screen Widget
                            </h3>
                            <label
                                class="flex items-start gap-4 cursor-pointer group"
                            >
                                <div
                                    class="relative flex items-center justify-center pt-1"
                                >
                                    <input
                                        type="checkbox"
                                        name="widget_enabled"
                                        class="peer sr-only"
                                        checked={profile?.widget_enabled ?? true}
                                    />
                                    <div
                                        class="w-11 h-6 bg-resin-earth/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[6px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-resin-forest shadow-inner"
                                    ></div>
                                </div>
                                <div class="space-y-1 flex-1">
                                    <div
                                        class="text-sm font-semibold text-resin-charcoal group-hover:text-resin-forest transition-colors"
                                    >
                                        Show Next Plan Widget
                                    </div>
                                    <p
                                        class="text-xs text-resin-earth/70 font-light leading-relaxed"
                                    >
                                        Enable or disable the home screen widget
                                        showing your next upcoming Amber plan.
                                    </p>
                                </div>
                            </label>
                        </section>

                        <!-- Save Button -->
                        <div
                            class="border-t border-resin-forest/5 pt-6 flex items-center justify-between gap-4"
                        >
                            <div class="h-6">
                                {#if successMessage}
                                    <span
                                        transition:fade
                                        class="text-sm font-bold text-resin-forest flex items-center gap-2"
                                    >
                                        <svg
                                            class="w-4 h-4"
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
                                class="px-6 py-2.5 bg-resin-forest text-white rounded-xl font-bold text-sm hover:bg-resin-charcoal transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {#if loading}
                                    <svg
                                        class="animate-spin h-4 w-4"
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
                                {/if}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            {:else if activeCategory === "integrations"}
                <!-- Integrations Content -->
                <div
                    class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-2"
                >
                    <h2
                        class="text-2xl font-serif font-bold text-resin-charcoal"
                    >
                        Integrations
                    </h2>
                    <p class="text-sm text-resin-earth/60">
                        Connect external services to Resin
                    </p>
                </div>

                <div
                    class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
                >
                    <!-- Google Calendar -->
                    <section
                        class="bg-white/50 rounded-xl p-6 border border-resin-forest/5"
                    >
                        <div class="flex items-start gap-4">
                            <div
                                class="w-12 h-12 rounded-xl bg-white border border-resin-forest/5 shadow-sm flex items-center justify-center flex-shrink-0"
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
                            </div>
                            <div class="flex-1">
                                <h3
                                    class="font-semibold text-resin-charcoal mb-1"
                                >
                                    Google Calendar
                                </h3>
                                <p class="text-sm text-resin-earth/70 mb-4">
                                    Find perfect focus windows in your calendar
                                </p>
                                <form
                                    method="POST"
                                    action="?/signInWithGoogle"
                                    use:enhance
                                >
                                    <button
                                        type="submit"
                                        class="px-4 py-2 bg-resin-charcoal text-white rounded-lg text-sm font-bold hover:bg-resin-forest transition-all"
                                    >
                                        Reconnect
                                    </button>
                                </form>
                            </div>
                        </div>
                    </section>

                    <!-- Resin Shield Extension -->
                    <section
                        class="bg-resin-charcoal text-white rounded-xl p-6 shadow-xl relative overflow-hidden group"
                    >
                        <div
                            class="absolute -right-12 -bottom-12 w-48 h-48 bg-resin-amber/5 rounded-full blur-3xl group-hover:bg-resin-amber/10 transition-all duration-1000"
                        ></div>

                        <div class="relative z-10">
                            <div class="flex items-start gap-4 mb-6">
                                <div
                                    class="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center flex-shrink-0"
                                >
                                    <img
                                        src="/resinext-logo.png"
                                        alt="Resin Shield"
                                        class="w-7 h-7 object-contain"
                                    />
                                </div>
                                <div class="flex-1">
                                    <h3 class="font-bold text-lg mb-1">
                                        Resin Shield Extension
                                    </h3>
                                    <p class="text-sm text-white/60">
                                        Enforce focus across your browser and
                                        sync sessions.
                                    </p>
                                </div>
                            </div>

                            <div class="space-y-4 mb-8">
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-5 h-5 rounded-full bg-resin-amber text-white text-[10px] font-bold flex items-center justify-center"
                                    >
                                        1
                                    </div>
                                    <p class="text-xs text-white/80">
                                        <span class="font-bold"
                                            >Clone repo:</span
                                        > zachmb/resinext
                                    </p>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-5 h-5 rounded-full bg-resin-amber text-white text-[10px] font-bold flex items-center justify-center"
                                    >
                                        2
                                    </div>
                                    <p class="text-xs text-white/80">
                                        <span class="font-bold">Build:</span> npm
                                        install && npm run build
                                    </p>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div
                                        class="w-5 h-5 rounded-full bg-resin-amber text-white text-[10px] font-bold flex items-center justify-center"
                                    >
                                        3
                                    </div>
                                    <p class="text-xs text-white/80">
                                        <span class="font-bold">Load:</span> Use
                                        "Load Unpacked" on the /dist folder
                                    </p>
                                </div>
                            </div>

                            <div class="bg-white/5 rounded-xl p-4 mb-6">
                                <p
                                    class="text-[10px] font-bold text-resin-amber uppercase tracking-widest mb-2"
                                >
                                    OAuth Redirect URI
                                </p>
                                <div class="flex items-center gap-2">
                                    <code
                                        class="flex-1 text-[10px] font-mono text-white/60 truncate"
                                        >https://your-supabase-project.supabase.co/auth/v1/callback</code
                                    >
                                    <button
                                        onclick={() =>
                                            navigator.clipboard.writeText(
                                                "https://your-supabase-project.supabase.co/auth/v1/callback",
                                            )}
                                        class="text-[10px] font-bold text-white/40 hover:text-white transition-colors uppercase"
                                    >
                                        Copy
                                    </button>
                                </div>
                                <p class="text-[9px] text-white/40 mt-2 italic">
                                    Add this to your Supabase "Allowed Redirect
                                    URLs" for Google Sign-In.
                                </p>
                            </div>

                            <button
                                onclick={() =>
                                    window.open(
                                        "https://github.com/zachmb/resinext",
                                        "_blank",
                                    )}
                                class="w-full py-3 bg-white text-resin-charcoal rounded-xl font-bold text-sm hover:bg-resin-amber hover:text-white transition-all shadow-lg active:scale-95"
                            >
                                View Repository →
                            </button>
                        </div>
                    </section>

                    <!-- Command Automations -->
                    <section
                        class="bg-white/50 rounded-xl p-6 border border-resin-forest/5"
                    >
                        <div class="mb-6">
                            <h3
                                class="font-semibold text-resin-charcoal mb-2"
                            >
                                Command Automations
                            </h3>
                            <p class="text-sm text-resin-earth/70 mb-4">
                                Configure credentials for your claw: commands. When you use a command in your notes, it will automatically trigger these integrations.
                            </p>
                        </div>

                        <div class="space-y-3">
                            {#each commandTypes as cmdType}
                                {@const existingConfig = getCommandConfig(cmdType.type)}
                                <div
                                    class="flex items-center justify-between p-3 bg-white rounded-lg border border-resin-forest/5 hover:border-resin-forest/10 transition-colors"
                                >
                                    <div class="flex items-center gap-3 flex-1 min-w-0">
                                        <span class="text-lg">{cmdType.icon}</span>
                                        <div class="flex-1 min-w-0">
                                            <div class="font-semibold text-sm text-resin-charcoal">
                                                {cmdType.label}
                                            </div>
                                            <div class="text-xs text-resin-earth/60">
                                                {existingConfig ? '✓ Configured' : 'Not configured'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onclick={() => startEditingCommand(cmdType.type)}
                                        class="px-3 py-1.5 text-xs font-bold text-resin-forest bg-resin-forest/10 hover:bg-resin-forest/20 rounded-lg transition-colors"
                                    >
                                        {existingConfig ? 'Edit' : 'Setup'}
                                    </button>
                                </div>

                                {#if editingCommandType === cmdType.type}
                                    <div
                                        class="p-4 bg-resin-amber/5 rounded-lg border border-resin-amber/20 mt-3 space-y-3"
                                    >
                                        <h4 class="font-semibold text-sm text-resin-charcoal">
                                            Configure {cmdType.label}
                                        </h4>

                                        {#each cmdType.fields as field}
                                            <div>
                                                <label
                                                    class="block text-xs font-bold text-resin-earth mb-1"
                                                >
                                                    {fieldLabels[field] || field}
                                                </label>
                                                <input
                                                    type={field.includes('secret') || field.includes('token') || field.includes('key') ? 'password' : 'text'}
                                                    bind:value={commandConfigForm[field]}
                                                    placeholder="Enter {fieldLabels[field] || field}"
                                                    class="w-full px-3 py-2 text-sm bg-white border border-resin-forest/10 rounded-lg text-resin-charcoal placeholder-resin-earth/40 focus:outline-none focus:border-resin-forest/30 focus:ring-1 focus:ring-resin-forest/20"
                                                />
                                            </div>
                                        {/each}

                                        <div class="flex gap-2 pt-2">
                                            <form
                                                method="POST"
                                                action="?/saveCommandConfig"
                                                use:enhance={() => {
                                                    return async ({ result }) => {
                                                        if (result.type === "success") {
                                                            cancelEditing();
                                                        }
                                                    };
                                                }}
                                            >
                                                <input type="hidden" name="commandType" value={cmdType.type} />
                                                <input type="hidden" name="config" value={JSON.stringify(commandConfigForm)} />
                                                <button
                                                    type="submit"
                                                    class="flex-1 px-3 py-2 text-xs font-bold text-white bg-resin-forest hover:bg-resin-forest/90 rounded-lg transition-colors"
                                                >
                                                    Save
                                                </button>
                                            </form>
                                            <button
                                                type="button"
                                                onclick={cancelEditing}
                                                class="flex-1 px-3 py-2 text-xs font-bold text-resin-forest bg-resin-forest/10 hover:bg-resin-forest/20 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            {#if getCommandConfig(cmdType.type)}
                                                <form
                                                    method="POST"
                                                    action="?/deleteCommandConfig"
                                                    use:enhance={() => {
                                                        return async ({ result }) => {
                                                            if (result.type === "success") {
                                                                cancelEditing();
                                                            }
                                                        };
                                                    }}
                                                >
                                                    <input type="hidden" name="configId" value={getCommandConfig(cmdType.type)?.id || ''} />
                                                    <button
                                                        type="submit"
                                                        class="px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </form>
                                            {/if}
                                        </div>
                                    </div>
                                {/if}
                            {/each}
                        </div>
                    </section>
                </div>
            {:else if activeCategory === "api"}
                <!-- API Content -->
                <div
                    class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-2"
                >
                    <h2
                        class="text-2xl font-serif font-bold text-resin-charcoal"
                    >
                        Developer API
                    </h2>
                    <p class="text-sm text-resin-earth/60">
                        Access your data programmatically
                    </p>
                </div>

                <div
                    class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
                >
                    <!-- API Badge -->
                    <section>
                        <div class="flex items-center gap-2 mb-4">
                            <h3
                                class="text-xs font-bold text-resin-forest uppercase tracking-widest"
                            >
                                Pro Feature
                            </h3>
                            <span
                                class="px-2 py-1 bg-resin-forest/10 text-resin-forest text-[10px] font-bold uppercase tracking-wider rounded-full"
                            >
                                Available
                            </span>
                        </div>
                        <p class="text-sm text-resin-earth/80 mb-6">
                            Generate a Personal Access Token to authorize
                            external applications to read your schedule via API.
                        </p>
                    </section>

                    <!-- Docs Toggle -->
                    <section>
                        <button
                            onclick={() => (showDocs = !showDocs)}
                            class="text-sm font-semibold text-resin-forest hover:text-resin-charcoal transition-colors underline underline-offset-4"
                        >
                            {showDocs ? "Hide API Docs" : "View API Docs"}
                        </button>

                        {#if showDocs}
                            <div
                                transition:fade={{ duration: 200 }}
                                class="bg-white/50 rounded-xl p-6 border border-resin-forest/10 mt-4"
                            >
                                <h4
                                    class="font-bold text-resin-charcoal mb-4 flex items-center gap-2"
                                >
                                    <svg
                                        class="w-4 h-4 text-resin-forest"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                                        ></path>
                                    </svg>
                                    API Documentation
                                </h4>
                                <div class="space-y-4 text-sm">
                                    <div>
                                        <div
                                            class="flex items-center gap-2 mb-2"
                                        >
                                            <span
                                                class="px-2 py-0.5 bg-resin-charcoal text-white font-bold rounded text-[10px] uppercase"
                                                >GET</span
                                            >
                                            <code
                                                class="font-mono text-resin-forest font-semibold"
                                                >/api/schedule</code
                                            >
                                        </div>
                                        <p class="text-resin-earth/80">
                                            Retrieve your active Amber Session
                                            blocks as JSON.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    </section>

                    <!-- Token Display -->
                    <section>
                        <h3
                            class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3"
                        >
                            Personal Access Token
                        </h3>
                        <div
                            class="bg-white/50 border border-resin-amber/20 rounded-xl p-4 font-mono text-sm text-resin-charcoal/80 mb-4 break-all max-h-24 overflow-y-auto"
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
                                class="px-6 py-2.5 bg-resin-amber text-white rounded-xl font-bold text-sm hover:bg-resin-amber/90 transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {#if loading}
                                    <svg
                                        class="animate-spin h-4 w-4"
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
                                {/if}
                                {loading
                                    ? "Generating..."
                                    : "Generate New Token"}
                            </button>
                        </form>
                    </section>
                </div>
            {:else if activeCategory === "privacy"}
                <!-- Privacy Content -->
                <div
                    class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-2"
                >
                    <h2
                        class="text-2xl font-serif font-bold text-resin-charcoal"
                    >
                        Privacy & Security
                    </h2>
                    <p class="text-sm text-resin-earth/60">
                        How we protect your data
                    </p>
                </div>

                <div
                    class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
                >
                    <!-- Encryption Info -->
                    <section>
                        <h3
                            class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3"
                        >
                            Data Protection
                        </h3>
                        <div
                            class="bg-white/50 rounded-xl p-6 border border-resin-forest/5 space-y-4"
                        >
                            <div>
                                <h4
                                    class="font-semibold text-resin-charcoal mb-2"
                                >
                                    End-to-End Encryption
                                </h4>
                                <p class="text-sm text-resin-earth/80">
                                    Your notes and session data are stored in
                                    your personal encrypted space in Supabase.
                                    We cannot read your private content.
                                </p>
                            </div>
                            <div class="border-t border-resin-forest/5 pt-4">
                                <h4
                                    class="font-semibold text-resin-charcoal mb-2"
                                >
                                    No Selling Data
                                </h4>
                                <p class="text-sm text-resin-earth/80">
                                    We never sell or share your personal
                                    information with third parties.
                                </p>
                            </div>
                        </div>
                    </section>

                    <!-- Links -->
                    <section>
                        <h3
                            class="text-xs font-bold text-resin-earth/40 uppercase tracking-widest mb-3"
                        >
                            Documentation
                        </h3>
                        <div class="space-y-2">
                            <a
                                href="/privacy"
                                class="block p-4 bg-white/50 rounded-xl border border-resin-forest/5 hover:border-resin-forest/20 transition-all"
                            >
                                <div
                                    class="font-semibold text-resin-charcoal mb-1"
                                >
                                    Privacy Policy
                                </div>
                                <p class="text-xs text-resin-earth/60">
                                    Learn how we use and protect your data
                                </p>
                            </a>
                            <a
                                href="/terms"
                                class="block p-4 bg-white/50 rounded-xl border border-resin-forest/5 hover:border-resin-forest/20 transition-all"
                            >
                                <div
                                    class="font-semibold text-resin-charcoal mb-1"
                                >
                                    Terms of Service
                                </div>
                                <p class="text-xs text-resin-earth/60">
                                    Our terms and conditions
                                </p>
                            </a>
                        </div>
                    </section>
                </div>
            {:else if activeCategory === "taste"}
                <!-- Taste Profile Content -->
                <div
                    class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-2"
                >
                    <h2
                        class="text-2xl font-serif font-bold text-resin-charcoal"
                    >
                        Taste Profile
                    </h2>
                    <p class="text-sm text-resin-earth/60">
                        Your emotional landscape and feedback insights
                    </p>
                </div>

                <div
                    class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
                >
                    <!-- Stats -->
                    {#if totalRatings > 0 || topFeelings.length > 0}
                        <section class="grid grid-cols-2 gap-4 mb-4">
                            <div
                                class="bg-white/50 rounded-xl p-4 border border-resin-forest/5"
                            >
                                <p
                                    class="text-xs text-resin-earth/40 font-semibold uppercase tracking-widest mb-2"
                                >
                                    Feedback Logs
                                </p>
                                <p
                                    class="text-2xl font-bold text-resin-charcoal"
                                >
                                    {totalRatings}
                                </p>
                            </div>
                            {#if totalRatings > 0}
                                <div
                                    class="bg-white/50 rounded-xl p-4 border border-resin-forest/5"
                                >
                                    <p
                                        class="text-xs text-resin-earth/40 font-semibold uppercase tracking-widest mb-2"
                                    >
                                        Avg Rating
                                    </p>
                                    <p
                                        class="text-2xl font-bold text-resin-amber"
                                    >
                                        {avgRating > 0 ? `${avgRating}/5` : "-"}
                                    </p>
                                </div>
                            {/if}
                        </section>
                    {/if}

                    <!-- Top Feelings -->
                    {#if topFeelings.length > 0}
                        <section
                            class="bg-white/50 rounded-xl p-6 border border-resin-forest/5"
                        >
                            <h3
                                class="font-semibold text-resin-charcoal mb-4 flex items-center gap-2"
                            >
                                <span class="text-lg">✦</span>
                                Top Feelings
                            </h3>
                            <div class="space-y-3">
                                {#each topFeelings as [feeling, count]}
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-lg"
                                        >
                                            {feelingIcons[feeling] || "·"}
                                        </div>
                                        <div class="flex-1">
                                            <div
                                                class="flex justify-between items-center mb-1"
                                            >
                                                <span
                                                    class="font-bold text-sm text-resin-charcoal"
                                                    >{feeling}</span
                                                >
                                                <span
                                                    class="text-xs text-resin-earth/50"
                                                    >{count}</span
                                                >
                                            </div>
                                            <div
                                                class="w-full bg-resin-forest/10 rounded-full h-1.5 overflow-hidden"
                                            >
                                                <div
                                                    class="bg-gradient-to-r from-resin-amber to-resin-forest h-1.5"
                                                    style="width: {(count /
                                                        topFeelings[0][1]) *
                                                        100}%"
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {:else}
                        <div
                            class="bg-white/50 rounded-xl p-6 border border-dashed border-resin-forest/10 text-center"
                        >
                            <p class="text-sm text-resin-charcoal font-medium">
                                No feelings logged yet
                            </p>
                            <p class="text-xs text-resin-earth/60 mt-1">
                                Reflect on a plan to see your landscape grow.
                            </p>
                        </div>
                    {/if}

                    <!-- Enjoyed Things -->
                    {#if tasteData?.enjoyedThings && tasteData.enjoyedThings.length > 0}
                        <section
                            class="bg-white/50 rounded-xl p-6 border border-resin-forest/5"
                        >
                            <h3 class="font-semibold text-resin-charcoal mb-4">
                                A History of Joy
                            </h3>
                            <div class="space-y-3 max-h-64 overflow-y-auto">
                                {#each tasteData.enjoyedThings as item}
                                    <div
                                        class="bg-white/50 rounded-lg p-3 border border-resin-forest/5"
                                    >
                                        <p
                                            class="text-sm text-resin-charcoal italic mb-2"
                                        >
                                            "{item.text}"
                                        </p>
                                        <span
                                            class="text-xs text-resin-earth/50"
                                            >{item.date}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/if}
                </div>
            {:else if activeCategory === "devices"}
                <!-- Devices Content -->
                <div
                    class="flex-shrink-0 px-6 py-6 border-b border-resin-forest/5 bg-white/40 space-y-2"
                >
                    <h2
                        class="text-2xl font-serif font-bold text-resin-charcoal"
                    >
                        Connected Devices
                    </h2>
                    <p class="text-sm text-resin-earth/60">
                        Manage your registered devices for focus syncing
                    </p>
                </div>

                <div
                    class="overflow-y-auto flex-1 p-6 space-y-6 custom-scrollbar"
                >
                    {#if deviceTokens && deviceTokens.length > 0}
                        <div class="space-y-3">
                            {#each deviceTokens as device (device.device_token)}
                                <div
                                    class="bg-white/50 rounded-xl p-4 border border-resin-forest/5 flex items-center justify-between"
                                >
                                    <div class="flex items-center gap-4 flex-1">
                                        <div class="text-2xl">
                                            {getPlatformIcon(device.platform).icon}
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <h3
                                                class="font-semibold text-resin-charcoal"
                                            >
                                                {getPlatformIcon(device.platform)
                                                    .label}
                                            </h3>
                                            <p
                                                class="text-xs text-resin-earth/60"
                                            >
                                                Last seen:{" "}
                                                {formatRelativeTime(
                                                    device.updated_at
                                                )}
                                            </p>
                                            <p
                                                class="text-xs text-resin-earth/40 mt-1 font-mono"
                                            >
                                                {device.device_token.slice(-8)}
                                            </p>
                                        </div>
                                    </div>
                                    <form
                                        method="POST"
                                        action="?/removeDevice"
                                        use:enhance={handleSubmit()}
                                        class="flex-shrink-0 ml-4"
                                    >
                                        <input
                                            type="hidden"
                                            name="device_token"
                                            value={device.device_token}
                                        />
                                        <button
                                            type="submit"
                                            class="px-3 py-2 text-sm font-semibold text-red-600 bg-red-400/10 border border-red-400/20 rounded-lg hover:bg-red-400/20 transition-all"
                                        >
                                            Remove
                                        </button>
                                    </form>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="bg-white/50 rounded-xl p-8 border border-dashed border-resin-forest/10 text-center"
                        >
                            <p class="text-lg text-resin-charcoal font-medium">
                                No devices connected
                            </p>
                            <p class="text-sm text-resin-earth/60 mt-2">
                                Download the iOS app or browser extension to
                                sync focus sessions across devices.
                            </p>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</main>
