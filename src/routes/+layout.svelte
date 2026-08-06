<script lang="ts">
	import { dev } from "$app/environment";
	import { invalidate } from "$app/navigation";
	import { setContext } from "svelte";
	import { page } from "$app/stores";
	import { onMount, untrack } from "svelte";
	import type { Session } from "@supabase/supabase-js";
	import { flushQueue } from "$lib/services/offlineQueue";
	import { rewardTriggered } from "$lib/state/rewards";
	import { registerServiceWorker } from "$lib/services/offline";
	import { createNotesDataManager, createAmberDataManager } from "$lib/services/DataManager";
	import DailyRitualPrompt from "$lib/components/groups/DailyRitualPrompt.svelte";
	import OfflineIndicator from "$lib/components/ui/OfflineIndicator.svelte";
	import "./layout.css";

	let { children, data } = $props();
	let { supabase, session, activeSession } = $derived(data);
	let isMobileMenuOpen = $state(false);
	let showDailyRitualPrompt = $state(false);
	let showRewardGlow = $state(false);
	const debugLog = (...args: unknown[]) => {
		if (dev) console.log(...args);
	};
	const reportClientIssue = (message: string, error?: unknown) => {
		if (dev && error) {
			console.error(message, error);
			return;
		}
		console.error(message);
	};

	// Compute page title based on current route
	let pageTitle = $derived.by(() => {
		const path = $page.url.pathname;
		if (path === '/') return 'Resin';
		if (path === '/rewards') return 'Rewards | Resin';
		if (path === '/map') return 'Map | Resin';
		if (path === '/amber') return 'Amber | Resin';
		if (path === '/focus') return 'Focus | Resin';
		if (path === '/account') return 'Account | Resin';
		if (path === '/notes') return 'Notes | Resin';
		if (path === '/groups') return 'Groups | Resin';
		if (path === '/login') return 'Login | Resin';
		
		// Fallback for subpaths or unhandled paths
		const segments = path.split('/').filter(Boolean);
		if (segments.length > 0) {
			const first = segments[0];
			const title = first.charAt(0).toUpperCase() + first.slice(1);
			return `${title} | Resin`;
		}
		
		return 'Resin';
	});

	// Profile derived from data prop so real-time updates propagate
	let profileData = $derived(data.profile);
	let daysWithoutSession = $derived.by(() => {
		if (!profileData?.last_session_date) return 999;
		const daysDiff = Math.floor((Date.now() - new Date(profileData.last_session_date).getTime()) / (1000 * 60 * 60 * 24));
		return daysDiff;
	});


	// Update profileData when data prop changes (e.g. navigation)
	// IMPORTANT: Read profileData inside untrack() to avoid the Svelte 5 cycle
	// where writing to profileData triggers a re-read of profileData inside the same effect
	$effect(() => {
		const newProfile = data.profile; // reactive: re-runs when data changes
		if (!newProfile) return;
		const current = untrack(() => profileData);
		if (!current) {
			profileData = newProfile;
		} else {
			// Merge ensuring we never downgrade stones/streak due to stale SvelteKit navigation cache
			profileData = {
				...newProfile,
				total_stones: Math.max(newProfile.total_stones || 0, current.total_stones || 0),
				current_streak: Math.max(newProfile.current_streak || 0, current.current_streak || 0),
			};
		}
	});

	// Subscribe to reward events
	$effect(() => {
		const unsubscribe = rewardTriggered.subscribe((reward) => {
			if (reward) {
				showRewardGlow = true;
			}
		});
		return unsubscribe;
	});

	// Setup DataManager context for child components
	// Provides local-first cache + background sync for notes and amber data
	$effect.pre(() => {
		if (session?.user?.id) {
			const notesManager = createNotesDataManager(
				(data: any) => {
					debugLog('[DataManager] Notes updated:', {
						count: Array.isArray(data) ? data.length : undefined
					});
				},
				(error: Error) => {
					reportClientIssue('[DataManager] Notes sync error', error);
				}
			);

			const amberManager = createAmberDataManager(
				(data: any) => {
					debugLog('[DataManager] Amber updated:', {
						count: Array.isArray(data) ? data.length : undefined
					});
				},
				(error: Error) => {
					reportClientIssue('[DataManager] Amber sync error', error);
				}
			);

			setContext('dataManager', {
				notes: notesManager,
				amber: amberManager
			});
		}
	});

	onMount(() => {
		if (!dev) {
			registerServiceWorker().catch(() => {
				debugLog('Service Worker registration skipped');
			});
		}

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(
			(_event: string, _session: Session | null) => {
				if (_session?.expires_at !== session?.expires_at) {
					invalidate("supabase:auth");
				}
			},
		);

		// Offline queue - flush on reconnect
		const handleOnline = () => {
			flushQueue();
		};
		window.addEventListener('online', handleOnline);

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
			debugLog('[Layout] Setting up real-time profile subscription');
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
							debugLog('[Layout] Real-time profile update received:', {
								stones: payload.new.total_stones,
								streak: payload.new.current_streak,
								timestamp: payload.new.updated_at
							});
							profileData = payload.new;
							debugLog('[Layout] Profile updated in UI');
						}
					}
				)
				.subscribe((status: string) => {
					debugLog('[Layout] Real-time subscription status:', status);
					if (status === 'SUBSCRIBED') {
						debugLog('[Layout] Real-time profile sync connected');
					} else if (status === 'CHANNEL_ERROR') {
						reportClientIssue('[Layout] Real-time profile sync unavailable; using polling fallback');
					}
				});

			// FIX: Add polling fallback for Supabase free plan
			// Checks for profile updates every 10 seconds as backup
			const pollInterval = setInterval(async () => {
				if (profileData?.id) {
					try {
						// Safe select without longest_streak
						const { data: updatedProfile, error: pollError } = await supabase
							.from('profiles')
							.select('id, total_stones, current_streak, updated_at, last_session_date')
							.eq('id', profileData.id)
							.single();

						if (pollError) {
							// If 400 (undefined column), try even more minimal subset
							if (pollError.code === '42703') {
								const { data: minimalProfile } = await supabase
									.from('profiles')
									.select('id, updated_at')
									.eq('id', profileData.id)
									.single();
								
								if (minimalProfile) {
									profileData = { ...profileData, ...minimalProfile };
								}
							}
						} else if (updatedProfile) {
							// Check if values changed since last poll
							if (updatedProfile.total_stones !== profileData.total_stones ||
								updatedProfile.current_streak !== profileData.current_streak) {
								debugLog('[Layout] Polling detected profile update:', {
									stones: updatedProfile.total_stones,
									streak: updatedProfile.current_streak
								});
								profileData = { ...profileData, ...updatedProfile };
								data.profile = profileData;
							}
						}
					} catch (err) {
						// Silent error - polling is fallback
						reportClientIssue('[Layout] Profile polling error; will retry', err);
					}
				}
			}, 10000); // Poll every 10 seconds - faster on free plan

			return () => {
				debugLog('[Layout] Cleaning up subscriptions and polling');
				window.removeEventListener('online', handleOnline);
				subscription.unsubscribe();
				supabase.removeChannel(profileSubscription);
				clearInterval(pollInterval);
			};
		}

		return () => {
			window.removeEventListener('online', handleOnline);
			subscription.unsubscribe();
		};
	});

</script>

<svelte:head>
	<link rel="icon" href="/logo.png" />
	<title>{pageTitle}</title>
</svelte:head>

<div class="site-frame">

	<!-- Navigation Bar -->
	<header class="app-header" class:marketing-header={!session}>
		<div class="app-header-inner">
			<a href="/" class="brand-link">
				<div>
					<img
						src="/logo.png"
						alt=""
					/>
				</div>
				<strong
					class:reward-text-glow={showRewardGlow}
					>Resin</strong
				>
			</a>

			<!-- Desktop nav -->
			<nav class="desktop-nav">
				{#if session}
					{#if activeSession}
						<div class="focus-nav-pill">
							<i></i><span>Focus active</span>
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
						href="/rewards"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Forest
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
						href="/groups"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Groups
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
						href="/pricing"
						class="hover:text-resin-forest transition-colors relative group"
					>
						Pricing
						<span
							class="absolute -bottom-1 left-0 w-0 h-0.5 bg-resin-forest/20 transition-all group-hover:w-full"
						></span>
					</a>
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
						class="nav-cta"
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
				class="mobile-menu-button"
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
		<div class="mobile-menu">
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
					href="/rewards"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					onclick={() => (isMobileMenuOpen = false)}>Forest</a
				>
			<a
				href="/focus"
				class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
				onclick={() => (isMobileMenuOpen = false)}>Focus</a
			>
			<a
				href="/groups"
				class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
				onclick={() => (isMobileMenuOpen = false)}>Groups</a
			>
			<a
				href="/account"
				class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
				onclick={() => (isMobileMenuOpen = false)}>Account</a
			>
			{:else}
				<a
					href="/pricing"
					class="text-xl font-bold font-serif text-resin-charcoal hover:text-resin-forest transition-colors"
					onclick={() => (isMobileMenuOpen = false)}>Pricing</a
				>
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

	<footer class="footer-shell">
		<div class="footer-inner">
			<p class="footer-brand">
				<strong>Resin</strong>
				<span>&copy; {new Date().getFullYear()} LoopLess LLC</span>
			</p>

			<nav class="footer-nav">
				<a
					href="/"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Home</a
				>
				<a
					href="/pricing"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Pricing</a
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

	<!-- Offline Indicator with Sync Status (only for signed-in users) -->
	{#if session}
		<OfflineIndicator />
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
