<script lang="ts">
    import { onDestroy } from "svelte";
    import { fade, slide } from "svelte/transition";

    let { onSessionStarted, suggestedDuration } = $props<{
        onSessionStarted?: (session: any) => void;
        suggestedDuration?: number | null;
    }>();

    let title = $state("");
    let duration = $state(25);
    let isSubmitting = $state(false);
    let showOptions = $state(false);
    let successMessage = $state("");
    let errorMessage = $state("");
    let focusInput: HTMLInputElement | null = $state(null);
    let protectionStatus = $state<"Protected" | "Waiting for device" | "Needs setup" | "Recovering">("Waiting for device");
    let protectionStatusReason = $state("");
    let syncCheckTimeout: ReturnType<typeof setTimeout> | null = null;
    let syncCheckAttempts = 0;
    let activeSyncSession: any = null;
    const MAX_SYNC_CHECK_ATTEMPTS = 6;
    const SYNC_CHECK_DELAYS_MS = [2500, 5000, 8000, 13000, 21000, 34000];
    $effect(() => {
        if (typeof suggestedDuration === "number" && Number.isFinite(suggestedDuration)) {
            duration = Math.min(90, Math.max(1, Math.round(suggestedDuration)));
            showOptions = true;
            setTimeout(() => focusInput?.focus(), 0);
        }
    });
    const protectionCopy = $derived.by(() => {
        if (protectionStatusReason === "future_session_scheduled") {
            return {
                dot: "bg-resin-earth/40",
                message: "Your session is scheduled. Protection will confirm when the window starts.",
                action: "Refresh status"
            };
        }
        if (protectionStatusReason === "session_not_active") {
            return {
                dot: "bg-resin-earth/40",
                message: "This focus window is no longer active. Start another small one whenever you're ready.",
                action: "Refresh status"
            };
        }
        if (protectionStatusReason === "active_session_confirmation_stale") {
            return {
                dot: "bg-resin-amber animate-pulse",
                message: "Protection was scheduled, but Resin has not heard from a device recently. Keep focusing; retry to verify.",
                action: "Retry sync"
            };
        }
        if (protectionStatusReason === "device_confirmation_unavailable") {
            return {
                dot: "bg-resin-amber animate-pulse",
                message: "Resin could not verify device freshness just now. Keep focusing; retry if this looks stuck.",
                action: "Retry sync"
            };
        }
        if (protectionStatusReason === "active_session_confirmed_on_extension") {
            return {
                dot: "bg-resin-forest",
                message: "Chrome extension confirmed protection. Distractions should redirect on this browser now.",
                action: "Refresh status"
            };
        }
        switch (protectionStatus) {
            case "Protected":
                return {
                    dot: "bg-resin-forest",
                    message: "A connected surface confirmed protection. Distractions should redirect now.",
                    action: "Refresh status"
                };
            case "Needs setup":
                return {
                    dot: "bg-resin-amber",
                    message: "A focus can run, but a device or distraction list still needs setup.",
                    action: "Open settings"
                };
            case "Recovering":
                return {
                    dot: "bg-resin-amber animate-pulse",
                    message: "Resin is re-checking device sync. Keep focusing; retry if this feels stale.",
                    action: "Retry sync"
                };
            default:
                return {
                    dot: "bg-resin-earth/40",
                    message: "Waiting for a connected device to apply protection.",
                    action: "Retry sync"
                };
        }
    });
    const protectionActionLabel = $derived.by(() => {
        switch (protectionCopy.action) {
            case "Open settings":
                return "Open extension settings";
            case "Refresh status":
                return "Refresh protection status";
            default:
                return "Retry protection sync";
        }
    });

    const checkProtectionSync = async (sessionData: any) => {
        if (!sessionData?.id || activeSyncSession?.id !== sessionData.id) return;

        const syncRes = await fetch(`/api/focus/sync-status?id=${encodeURIComponent(sessionData.id)}`);
        if (!syncRes.ok) {
            throw new Error("Sync status failed");
        }
        const syncData = await syncRes.json();
        if (activeSyncSession?.id !== sessionData.id) return;

        protectionStatus = syncData.protectionStatus ?? (syncData.device_scheduled ? "Recovering" : "Waiting for device");
        protectionStatusReason = syncData.statusReason ?? "";
        if (onSessionStarted) onSessionStarted({ ...sessionData, device_scheduled: syncData.device_scheduled });
    };

    const scheduleSyncCheck = (sessionData: any) => {
        if (!sessionData?.id || syncCheckAttempts >= MAX_SYNC_CHECK_ATTEMPTS) return;
        if (syncCheckTimeout) clearTimeout(syncCheckTimeout);

        const delay = SYNC_CHECK_DELAYS_MS[Math.min(syncCheckAttempts, SYNC_CHECK_DELAYS_MS.length - 1)];
        syncCheckAttempts += 1;
        syncCheckTimeout = setTimeout(async () => {
            syncCheckTimeout = null;
            if (activeSyncSession?.id !== sessionData.id) return;
            try {
                await checkProtectionSync(sessionData);

                const shouldKeepChecking =
                    (protectionStatus === "Waiting for device" || protectionStatus === "Recovering") &&
                    protectionStatusReason !== "session_not_active";
                if (shouldKeepChecking) scheduleSyncCheck(sessionData);
            } catch {
                console.error("Sync check failed");
                protectionStatus = "Recovering";
                protectionStatusReason = "sync_status_failed";
                scheduleSyncCheck(sessionData);
            }
        }, delay);
    };

    const retryProtectionSync = async () => {
        if (!activeSyncSession?.id) {
            protectionStatus = "Recovering";
            protectionStatusReason = "device_push_not_confirmed";
            return;
        }

        if (syncCheckTimeout) {
            clearTimeout(syncCheckTimeout);
            syncCheckTimeout = null;
        }
        protectionStatus = "Recovering";
        protectionStatusReason = "manual_sync_retry";
        try {
            await checkProtectionSync(activeSyncSession);
        } catch {
            console.error("Manual sync check failed");
            protectionStatus = "Recovering";
            protectionStatusReason = "sync_status_failed";
        }
        if (["Waiting for device", "Recovering"].includes(protectionStatus)) {
            scheduleSyncCheck(activeSyncSession);
        }
    };

    const startFocus = async () => {
        if (!title.trim() || isSubmitting) return;

        isSubmitting = true;
        errorMessage = "";
        try {
            const res = await fetch("/api/focus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    durationMinutes: duration,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error("Focus start failed");
            }
            if (data.status === "success") {
                const canWakeProtection = data.notificationsSent > 0 || data.extensionDevicesPresent === true;
                protectionStatus = canWakeProtection ? "Waiting for device" : "Recovering";
                protectionStatusReason = canWakeProtection ? "active_session_waiting_for_device" : "device_push_not_confirmed";
                successMessage = data.extensionDevicesPresent === true
                    ? "Focus started — waiting for the Chrome extension to confirm."
                    : data.notificationsSent > 0
                        ? "Focus started — waiting for your device to confirm."
                        : "Focus started. Open the app or extension if protection needs a nudge.";
                title = "";
                if (onSessionStarted) onSessionStarted(data.session);

                if (data.session?.id) {
                    activeSyncSession = data.session;
                    syncCheckAttempts = 0;
                    scheduleSyncCheck(data.session);
                }

                setTimeout(() => {
                    successMessage = "";
                }, 3000);
            } else {
                throw new Error("Focus start failed");
            }
        } catch {
            console.error("Failed to start focus session");
            protectionStatus = "Recovering";
            protectionStatusReason = "start_failed";
            errorMessage = "Resin couldn't start protection from here. Your thought is still yours — try again in a moment or start from the app.";
        } finally {
            isSubmitting = false;
        }
    };

    onDestroy(() => {
        if (syncCheckTimeout) clearTimeout(syncCheckTimeout);
    });

    const durations = [15, 25, 50, 90];
</script>

<div
    class="glass-card rounded-xl p-8 border border-white/20 shadow-premium relative overflow-hidden group"
>
    <!-- Animated background element -->
    <div
        class="absolute -right-12 -bottom-12 w-48 h-48 bg-resin-amber/5 rounded-full blur-3xl group-hover:bg-resin-amber/10 transition-all duration-1000"
    ></div>

    <div class="relative z-10">
        <div class="flex items-center gap-4 mb-6">
            <div
                class="w-12 h-12 rounded-lg bg-resin-charcoal text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                </svg>
            </div>
            <div>
                <h3 class="text-xl font-bold text-resin-charcoal">
                    Type one thing → Activate
                </h3>
                <p
                    class="text-xs text-resin-earth/60 font-medium uppercase tracking-wider"
                >
                    Resin protects it
                </p>
            </div>
        </div>

        <div class="space-y-4">
            <div class="relative">
                <input
                    type="text"
                    bind:value={title}
                    bind:this={focusInput}
                    placeholder="What are we focusing on?"
                    class="w-full bg-white/50 border border-resin-forest/20 rounded-lg px-5 py-4 text-resin-charcoal placeholder:text-resin-earth/40 focus:outline-none focus:ring-2 focus:ring-resin-amber/30 focus:border-resin-amber/30 transition-all"
                />
                {#if title.length > 0}
                    <button
                        transition:fade
                        onclick={() => (showOptions = !showOptions)}
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-resin-earth/40 hover:text-resin-amber transition-colors"
                        aria-label="Toggle options"
                        title="Toggle options"
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
                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                            />
                        </svg>
                    </button>
                {/if}
            </div>

            {#if showOptions || title.length > 0}
                <div transition:slide class="flex flex-wrap gap-2 pt-1">
                    {#each durations as d}
                        <button
                            onclick={() => (duration = d)}
                            class="px-4 py-2 rounded-md text-xs font-bold transition-all {duration ===
                            d
                                ? 'bg-resin-amber text-resin-charcoal shadow-md'
                                : 'bg-white/40 text-resin-earth hover:bg-white/60'}"
                        >
                            {d}m
                        </button>
                    {/each}
                    <div class="flex-1"></div>
                    <button
                        onclick={startFocus}
                        disabled={!title.trim() || isSubmitting}
                        class="px-6 py-2 bg-resin-charcoal text-white rounded-xl text-xs font-bold hover:bg-resin-forest transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {#if isSubmitting}
                            <span
                                class="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"
                            ></span>
                        {:else}
                            <svg
                                class="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                        {/if}
                        Activate Now
                    </button>
                </div>
            {/if}

            <div
                class="flex items-start justify-between gap-3 rounded-lg border border-resin-forest/10 bg-resin-forest/5 px-4 py-3"
                role="status"
                aria-live="polite"
                aria-atomic="true"
                aria-labelledby="focus-control-protection-label focus-control-protection-status"
                aria-describedby="focus-control-protection-copy"
            >
                <div class="min-w-0">
                    <p id="focus-control-protection-label" class="text-[11px] uppercase tracking-wider font-bold text-resin-earth/45">Protection status</p>
                    <div class="mt-1 flex items-center gap-2">
                        <span class="h-2.5 w-2.5 rounded-full {protectionCopy.dot}" aria-hidden="true"></span>
                        <p id="focus-control-protection-status" class="text-sm font-bold text-resin-charcoal">{protectionStatus}</p>
                    </div>
                    <p id="focus-control-protection-copy" class="mt-1 text-xs font-medium text-resin-earth/65">{protectionCopy.message}</p>
                </div>
                <button
                    type="button"
                    aria-label={protectionActionLabel}
                    onclick={() => {
                        if (protectionCopy.action === "Open settings") {
                            window.location.href = "/extension-settings";
                            return;
                        }
                        retryProtectionSync();
                    }}
                    class="shrink-0 text-xs font-bold text-resin-forest hover:text-resin-amber transition-colors"
                >
                    {protectionCopy.action}
                </button>
            </div>

            {#if successMessage}
                <p
                    transition:fade
                    class="text-xs font-bold text-resin-forest flex items-center gap-1.5 ml-1"
                >
                    <svg
                        class="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="3"
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                    {successMessage}
                </p>
            {/if}

            {#if errorMessage}
                <p
                    transition:fade
                    class="text-xs font-bold text-resin-amber flex items-center gap-1.5 ml-1"
                >
                    {errorMessage}
                </p>
            {/if}
        </div>
    </div>
</div>
