<script lang="ts">
	import { invalidate } from "$app/navigation";
	import { browser } from "$app/environment";
	import { onMount } from "svelte";
	import type { Session } from "@supabase/supabase-js";
	import { flushQueue } from "$lib/offline_queue";
	import DailyRitualPrompt from "$lib/components/DailyRitualPrompt.svelte";
	import "./layout.css";

	let { children, data } = $props();
	let { supabase, session, activeSession } = $derived(data);
	let isMobileMenuOpen = $state(false);
	let isOnline = $state(browser ? navigator.onLine : true);
	let showDailyRitualPrompt = $state(false);

	// FIX: Make profile reactive so real-time updates propagate
	let profileData = $state(data.profile);
	let hasStreak = $derived(profileData?.current_streak > 0);
	let daysWithoutSession = $derived.by(() => {
		if (!profileData?.last_session_date) return 999;
		const daysDiff = Math.floor((Date.now() - new Date(profileData.last_session_date).getTime()) / (1000 * 60 * 60 * 24));
		return daysDiff;
	});

	// Update profileData when data prop changes (e.g. navigation)
	$effect(() => {
		profileData = data.profile;
	});

	onMount(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(
			(event: string, _session: Session | null) => {
				if (_session?.expires_at !== session?.expires_at) {
					invalidate("supabase:auth");
				}
			},
		);

		// Offline queue - flush on reconnect
		window.addEventListener('online', () => {
			isOnline = true;
			flushQueue();
		});
		window.addEventListener('offline', () => {
			isOnline = false;
		});

		// Flush queue on load if we're online
		if (navigator.onLine) {
			flushQueue();
		}

		// Show daily ritual prompt if user hasn't had a session recently
		if (profileData?.last_session_date && daysWithoutSession >= 1) {
			// Show prompt after a delay, only once per session
			setTimeout(() => {
				showDailyRitualPrompt = true;
			}, 2000);
		}

		// FIX: Set up real-time subscription to profile updates from iOS sync
		// This ensures stones and streak stay in sync across all pages
		if (session?.user?.id) {
			console.log('[Layout] 🔄 Setting up real-time subscription for user:', session.user.id.substring(0, 8) + '...');
			const profileSubscription = supabase
				.channel(`profiles:${session.user.id}`)
				.on(
					'postgres_changes',
					{
						event: 'UPDATE',
						schema: 'public',
						table: 'profiles',
						filter: `id=eq.${session.user.id}`
					},
					(payload: { new: any }) => {
						// Update profile data when iOS syncs
						if (payload.new) {
							console.log('[Layout] 🔄 Real-time profile update RECEIVED:', {
								stones: payload.new.total_stones,
								streak: payload.new.current_streak,
								timestamp: payload.new.updated_at
							});
							profileData = payload.new;
							console.log('[Layout] ✅ Profile UPDATED in UI');
						}
					}
				)
				.subscribe((status: string) => {
					console.log('[Layout] 📡 Real-time subscription status:', status);
					if (status === 'SUBSCRIBED') {
						console.log('[Layout] ✅ Real-time profile sync CONNECTED');
					} else if (status === 'CHANNEL_ERROR') {
						console.error('[Layout] ❌ Real-time subscription CHANNEL_ERROR - Will use polling fallback');
					}
				});

			// FIX: Add polling fallback for Supabase free plan
			// Checks for profile updates every 10 seconds as backup
			const pollInterval = setInterval(async () => {
				if (profileData?.id) {
					try {
						const { data: updatedProfile } = await supabase
							.from('profiles')
							.select('id, total_stones, current_streak, longest_streak, updated_at')
							.eq('id', profileData.id)
							.single();

						if (updatedProfile) {
							// Check if values changed since last poll
							if (updatedProfile.total_stones !== profileData.total_stones ||
								updatedProfile.current_streak !== profileData.current_streak) {
								console.log('[Layout] 📊 Polling detected profile update:', {
									stones: updatedProfile.total_stones,
									streak: updatedProfile.current_streak
								});
								profileData = updatedProfile;
								data.profile = updatedProfile;
							}
						}
					} catch (err) {
						// Silent error - polling is fallback
						console.error('[Layout] Polling error (will retry):', err);
					}
				}
			}, 10000); // Poll every 10 seconds - faster on free plan

			return () => {
				console.log('[Layout] Cleaning up subscriptions and polling');
				subscription.unsubscribe();
				supabase.removeChannel(profileSubscription);
				clearInterval(pollInterval);
			};
		}

		return () => subscription.unsubscribe();
	});

</script>

<svelte:head>
	<link rel="icon" href="/logo.png" />
	<title>Resin</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col font-sans relative overflow-x-hidden bg-resin-bg text-resin-forest"
>
	<!-- Premium background elements -->
	<div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
		<div
			class="absolute top-[-10%] left-[20%] w-[70%] h-[70%] bg-resin-amber/5 blur-[120px] rounded-full animate-pulse"
		></div>
		<div
			class="absolute bottom-[-10%] right-[10%] w-[50%] h-[50%] bg-resin-forest/5 blur-[100px] rounded-full"
		></div>
	</div>

	<!-- Navigation Bar -->
	<header
		class="w-full py-4 px-6 fixed top-0 z-50 bg-resin-bg/60 backdrop-blur-xl border-b border-resin-forest/5"
	>
		<div class="max-w-6xl mx-auto flex items-center justify-between">
			<a href="/" class="flex items-center gap-2.5 group">
				<div class="relative" class:streak-glow={hasStreak}>
					<img
						src="/logo.png"
						alt="Resin Logo"
						class="w-10 h-10 rounded-[10px] shadow-sm border border-resin-forest/10 group-hover:shadow-md transition-all duration-500 group-hover:scale-105"
					/>
					<div
						class="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-black/5"
					></div>
				</div>
				<span
					class="text-xl font-bold font-serif text-resin-charcoal tracking-tight"
					>Resin</span
				>
			</a>

			<!-- Desktop nav -->
			<nav
				class="hidden sm:flex items-center gap-6 text-sm font-medium text-resin-earth/80"
			>
				{#if session}
					{#if activeSession}
						<div
							class="flex items-center gap-2 px-3 py-1.5 bg-resin-amber/10 border border-resin-amber/20 rounded-full animate-pulse"
						>
							<div
								class="w-2 h-2 rounded-full bg-resin-amber"
							></div>
							<span
								class="text-[10px] font-bold uppercase tracking-widest text-resin-amber"
								>Focus Active</span
							>
						</div>
					{/if}
					<a
						href="/notes?reset"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Notes
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
					<a
						href="/map"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Map
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
					<a
						href="/amber"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Amber
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
					<a
						href="/forest"
						class="hover:text-resin-forest transition-colors relative group"
					class:streak-nav-glow={hasStreak}
					>
						Forest
					{#if hasStreak}
						<span class="ml-2 text-xs font-bold text-resin-amber animate-pulse">✨</span>
					{/if}
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
					<a
						href="/focus"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Focus
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
				<a
					href="/account"
					class="hover:text-resin-forest transition-colors relative group"
				>
					Account
					<span
						class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
					></span>
				</a>
				{:else}
					<a
						href="/support"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Support
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
					<a
						href="/login"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Login
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
					<a
						href="https://testflight.apple.com/join/yV53qa1z"
						target="_blank"
						rel="noopener noreferrer"
						class="px-5 py-2 bg-resin-charcoal text-white rounded-full hover:bg-resin-forest transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2"
					>
						Get the App
						<svg
							class="w-4 h-4"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path
								fill-rule="evenodd"
								d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</a>
				{/if}
			</nav>

			<!-- Mobile hamburger -->
			<button
				class="sm:hidden text-resin-earth hover:text-resin-forest transition-colors"
				onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
				aria-label="Toggle mobile menu"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-6 h-6 transition-transform duration-300 {isMobileMenuOpen
						? 'rotate-90'
						: ''}"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
					/>
				</svg>
			</button>
		</div>
	</header>

	<!-- Mobile Menu Dropdown -->
	{#if isMobileMenuOpen}
		<div
			class="sm:hidden fixed top-[72px] left-0 w-full bg-[#FCF9F2]/98 backdrop-blur-xl z-40 border-b border-resin-earth/10 flex flex-col px-6 py-6 gap-6 shadow-premium"
		>
			{#if session}
				<a
					href="/notes?reset"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					onclick={() => (isMobileMenuOpen = false)}>Notes</a
				>
				<a
					href="/map"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					onclick={() => (isMobileMenuOpen = false)}>Map</a
				>
				<a
					href="/amber"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					onclick={() => (isMobileMenuOpen = false)}>Amber</a
				>
				<a
					href="/forest"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					class:streak-nav-glow={hasStreak}
					onclick={() => (isMobileMenuOpen = false)}>Forest</a
				>
					{#if hasStreak}
						<span class="ml-2 text-xs font-bold text-resin-amber animate-pulse">✨</span>
					{/if}
			<a
				href="/focus"
				class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
				onclick={() => (isMobileMenuOpen = false)}>Focus</a
			>
			<a
				href="/account"
				class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
				onclick={() => (isMobileMenuOpen = false)}>Account</a
			>
			{:else}
				<a
					href="/support"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					onclick={() => (isMobileMenuOpen = false)}>Support</a
				>
				<a
					href="/login"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					onclick={() => (isMobileMenuOpen = false)}>Login</a
				>
				<a
					href="https://testflight.apple.com/join/yV53qa1z"
					target="_blank"
					rel="noopener noreferrer"
					class="text-xl font-bold font-serif text-resin-forest"
					onclick={() => (isMobileMenuOpen = false)}>Get the App</a
				>
			{/if}
		</div>
	{/if}

	{@render children()}

	<footer
		class="w-full py-8 border-t border-resin-earth/10 relative z-10 bg-resin-bg/80 backdrop-blur-md mt-auto"
	>
		<div
			class="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4"
		>
			<p class="text-sm text-resin-earth/70">
				&copy; {new Date().getFullYear()} Resin App. All rights reserved.
			</p>

			<nav
				class="flex items-center gap-6 text-sm font-medium text-resin-earth hover:text-resin-forest transition-colors"
			>
				<a
					href="/"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Home</a
				>
				<a
					href="/privacy"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Privacy</a
				>
				<a
					href="/terms"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Terms</a
				>
				<a
					href="/extension"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Web Shield</a
				>
				<a
					href="/support"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Support</a
				>
				<a
					href="/architecture"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Architecture</a
				>
			</nav>
		</div>
	</footer>

	<!-- Offline Indicator -->
	{#if !isOnline}
		<div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-900 text-white text-sm rounded-full shadow-lg flex items-center gap-2">
			<div class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
			<span>You're offline — changes will sync when reconnected</span>
		</div>
	{/if}

	<!-- Daily Ritual Prompt -->
	{#if session && profileData}
		<DailyRitualPrompt
			visible={showDailyRitualPrompt}
			daysWithoutSession={daysWithoutSession}
			currentStreak={profileData?.current_streak || 0}
			onDismiss={() => (showDailyRitualPrompt = false)}
		/>
	{/if}
</div>
