<script lang="ts">
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
</script>

<svelte:head>
	<title>Resin Web Shield - Chrome Extension | Resin</title>
</svelte:head>

<main class="w-full min-h-screen pt-20 pb-32 px-4 sm:px-6 relative z-10">
	<!-- Background decoration -->
	<div class="absolute top-0 left-0 w-96 h-96 bg-resin-amber/5 rounded-full blur-3xl -z-10"></div>
	<div class="absolute bottom-0 right-0 w-96 h-96 bg-resin-forest/5 rounded-full blur-3xl -z-10"></div>

	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-16" in:fly={{ y: -20, duration: 800 }}>
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-resin-charcoal text-white shadow-xl mb-6">
				<img src="/resinext-logo.png" alt="Resin Web Shield" class="w-12 h-12 object-contain" />
			</div>
			<h1 class="text-5xl md:text-6xl font-bold text-resin-charcoal mb-4">
				Resin <span class="text-resin-amber">Shield</span>
			</h1>
			<p class="text-xl text-resin-earth/70 max-w-2xl mx-auto">
				Transform your focus sessions into true blocking power. Stop distractions across your entire browser in real-time.
			</p>
		</div>

		<!-- Hero Features Grid -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
			<div
				class="glass-card rounded-2xl p-8 border border-resin-forest/10 bg-gradient-to-br from-resin-forest/5 to-transparent hover:border-resin-forest/30 transition-all"
				in:fly={{ x: -20, duration: 600, delay: 100 }}
			>
				<div class="text-4xl mb-4">🔒</div>
				<h3 class="text-lg font-bold text-resin-charcoal mb-2">Total Site Blocking</h3>
				<p class="text-sm text-resin-earth/70">
					Instantly block YouTube, Reddit, Twitter, and any custom websites during your focus sessions. No loopholes.
				</p>
			</div>

			<div
				class="glass-card rounded-2xl p-8 border border-resin-amber/10 bg-gradient-to-br from-resin-amber/5 to-transparent hover:border-resin-amber/30 transition-all"
				in:fly={{ x: 0, duration: 600, delay: 200 }}
			>
				<div class="text-4xl mb-4">⚡</div>
				<h3 class="text-lg font-bold text-resin-charcoal mb-2">Instant Sync</h3>
				<p class="text-sm text-resin-earth/70">
					Start a session in Resin and the extension activates automatically. No extra steps. Complete harmony.
				</p>
			</div>

			<div
				class="glass-card rounded-2xl p-8 border border-resin-forest/10 bg-gradient-to-br from-resin-forest/5 to-transparent hover:border-resin-forest/30 transition-all"
				in:fly={{ x: 20, duration: 600, delay: 300 }}
			>
				<div class="text-4xl mb-4">📊</div>
				<h3 class="text-lg font-bold text-resin-charcoal mb-2">Block Analytics</h3>
				<p class="text-sm text-resin-earth/70">
					See how many times you tried to access blocked sites during each session. Learn your patterns.
				</p>
			</div>
		</div>

		<!-- How It Works -->
		<section class="mb-20">
			<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-12 text-center">How It Works</h2>

			<div class="space-y-8">
				<!-- Step 1 -->
				<div class="flex gap-6 md:gap-8 items-start">
					<div class="flex-shrink-0">
						<div class="flex items-center justify-center h-12 w-12 rounded-full bg-resin-amber text-white font-bold text-lg">
							1
						</div>
					</div>
					<div class="flex-1">
						<h3 class="text-xl font-bold text-resin-charcoal mb-2">Install the Extension</h3>
						<p class="text-resin-earth/70">
							Download Resin Web Shield from the Chrome Web Store. Click "Add to Chrome" and grant the minimal permissions needed to monitor website access.
						</p>
					</div>
				</div>

				<!-- Step 2 -->
				<div class="flex gap-6 md:gap-8 items-start">
					<div class="flex-shrink-0">
						<div class="flex items-center justify-center h-12 w-12 rounded-full bg-resin-amber text-white font-bold text-lg">
							2
						</div>
					</div>
					<div class="flex-1">
						<h3 class="text-xl font-bold text-resin-charcoal mb-2">Configure Your Block List</h3>
						<p class="text-resin-earth/70">
							Open the extension popup and add the websites that distract you most. Common presets include social media, entertainment, and news sites. Customize per session if needed.
						</p>
					</div>
				</div>

				<!-- Step 3 -->
				<div class="flex gap-6 md:gap-8 items-start">
					<div class="flex-shrink-0">
						<div class="flex items-center justify-center h-12 w-12 rounded-full bg-resin-amber text-white font-bold text-lg">
							3
						</div>
					</div>
					<div class="flex-1">
						<h3 class="text-xl font-bold text-resin-charcoal mb-2">Start a Focus Session</h3>
						<p class="text-resin-earth/70">
							Create an Amber plan or blocking session in Resin. The extension automatically activates and blocks your configured sites. You're locked in.
						</p>
					</div>
				</div>

				<!-- Step 4 -->
				<div class="flex gap-6 md:gap-8 items-start">
					<div class="flex-shrink-0">
						<div class="flex items-center justify-center h-12 w-12 rounded-full bg-resin-amber text-white font-bold text-lg">
							4
						</div>
					</div>
					<div class="flex-1">
						<h3 class="text-xl font-bold text-resin-charcoal mb-2">Review Your Stats</h3>
						<p class="text-resin-earth/70">
							After the session, see how many times you attempted blocked sites. Use this insight to understand your distraction triggers and adjust future plans.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- Key Features Detail -->
		<section class="mb-20">
			<div class="glass-card rounded-3xl p-12 border border-resin-forest/15 bg-gradient-to-br from-resin-forest/5 to-transparent">
				<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-12">Why Resin Web Shield Stands Out</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
					<div>
						<h4 class="text-lg font-bold text-resin-charcoal mb-3 flex items-center gap-2">
							<span class="text-2xl">🔐</span> Privacy First
						</h4>
						<p class="text-resin-earth/70">
							We only track blocked attempts during your sessions. No browsing history, no ads, no third-party data sharing.
						</p>
					</div>

					<div>
						<h4 class="text-lg font-bold text-resin-charcoal mb-3 flex items-center gap-2">
							<span class="text-2xl">⏱️</span> Countdown Timer
						</h4>
						<p class="text-resin-earth/70">
							See your session time remaining right in the toolbar. Visual feedback keeps you aware and motivated.
						</p>
					</div>

					<div>
						<h4 class="text-lg font-bold text-resin-charcoal mb-3 flex items-center gap-2">
							<span class="text-2xl">🛡️</span> No Bypass
						</h4>
						<p class="text-resin-earth/70">
							Blocks persist at the network level. Can't disable, can't incognito, can't circumvent. Real blocking.
						</p>
					</div>

					<div>
						<h4 class="text-lg font-bold text-resin-charcoal mb-3 flex items-center gap-2">
							<span class="text-2xl">📱</span> iOS Sync
						</h4>
						<p class="text-resin-earth/70">
							Block websites on your browser while using Resin on your phone. One focus ecosystem across devices.
						</p>
					</div>

					<div>
						<h4 class="text-lg font-bold text-resin-charcoal mb-3 flex items-center gap-2">
							<span class="text-2xl">⚙️</span> Smart Defaults
						</h4>
						<p class="text-resin-earth/70">
							Pre-configured block lists for common distractions. Modify anytime without breaking existing settings.
						</p>
					</div>

					<div>
						<h4 class="text-lg font-bold text-resin-charcoal mb-3 flex items-center gap-2">
							<span class="text-2xl">🎯</span> Session-Specific Rules
						</h4>
						<p class="text-resin-earth/70">
							Temporarily adjust block lists for specific sessions. Different rules for deep work vs. light tasks.
						</p>
					</div>
				</div>
			</div>
		</section>

		<!-- FAQ -->
		<section class="mb-20">
			<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-12 text-center">Frequently Asked</h2>

			<div class="space-y-6 max-w-3xl mx-auto">
				<details class="group border-l-4 border-resin-amber bg-white/40 p-6 rounded-lg hover:bg-white/60 transition-colors">
					<summary class="cursor-pointer flex items-center justify-between font-bold text-resin-charcoal">
						Can I disable the extension during a session?
						<span class="text-xl group-open:rotate-180 transition-transform">›</span>
					</summary>
					<p class="text-resin-earth/70 mt-4">
						No, and that's the point. Disabling requires the extension PIN that only you (or you in a calm state) should know. This prevents impulsive decisions during moments of distraction.
					</p>
				</details>

				<details class="group border-l-4 border-resin-amber bg-white/40 p-6 rounded-lg hover:bg-white/60 transition-colors">
					<summary class="cursor-pointer flex items-center justify-between font-bold text-resin-charcoal">
						Does it work with all websites?
						<span class="text-xl group-open:rotate-180 transition-transform">›</span>
					</summary>
					<p class="text-resin-earth/70 mt-4">
						Yes, any website or domain can be blocked. Common presets include YouTube, Reddit, Twitter, Facebook, TikTok, Instagram, and news sites. Add custom URLs anytime.
					</p>
				</details>

				<details class="group border-l-4 border-resin-amber bg-white/40 p-6 rounded-lg hover:bg-white/60 transition-colors">
					<summary class="cursor-pointer flex items-center justify-between font-bold text-resin-charcoal">
						What about apps outside the browser?
						<span class="text-xl group-open:rotate-180 transition-transform">›</span>
					</summary>
					<p class="text-resin-earth/70 mt-4">
						This extension blocks websites. For full-device blocking of apps (like YouTube app on phone), use Resin's iOS app with Focus mode. They complement each other.
					</p>
				</details>

				<details class="group border-l-4 border-resin-amber bg-white/40 p-6 rounded-lg hover:bg-white/60 transition-colors">
					<summary class="cursor-pointer flex items-center justify-between font-bold text-resin-charcoal">
						Can I whitelist specific pages on blocked sites?
						<span class="text-xl group-open:rotate-180 transition-transform">›</span>
					</summary>
					<p class="text-resin-earth/70 mt-4">
						Yes. For example, block youtube.com but whitelist youtube.com/watch?v=tutorial. This gives flexibility for necessary access while protecting against browsing rabbit holes.
					</p>
				</details>

				<details class="group border-l-4 border-resin-amber bg-white/40 p-6 rounded-lg hover:bg-white/60 transition-colors">
					<summary class="cursor-pointer flex items-center justify-between font-bold text-resin-charcoal">
						Is there a cost?
						<span class="text-xl group-open:rotate-180 transition-transform">›</span>
					</summary>
					<p class="text-resin-earth/70 mt-4">
						The extension is free. It syncs with your Resin account (which is also free). If you choose a premium plan in the future, the extension remains free and gains additional features.
					</p>
				</details>
			</div>
		</section>

		<!-- CTA Section -->
		<section
			class="glass-card rounded-3xl p-12 border border-resin-amber/20 bg-gradient-to-r from-resin-amber/10 to-resin-forest/5 text-center"
			in:fade={{ duration: 600, delay: 400 }}
		>
			<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-4">
				Ready to Block Distractions?
			</h2>
			<p class="text-lg text-resin-earth/70 mb-8 max-w-2xl mx-auto">
				Install Resin Web Shield today and transform your focus sessions into unbreakable commitments.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<a
					href="https://chrome.google.com/webstore/detail/resin-shield"
					target="_blank"
					rel="noopener noreferrer"
					class="px-10 py-4 bg-resin-charcoal text-white rounded-2xl font-bold text-lg hover:bg-resin-forest transition-all shadow-xl active:scale-95 inline-flex items-center justify-center gap-3"
				>
					<span>Add to Chrome</span>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
				</a>
				<button
					onclick={() => goto('/')}
					class="px-10 py-4 bg-white text-resin-charcoal border-2 border-resin-charcoal rounded-2xl font-bold text-lg hover:bg-resin-charcoal/5 transition-all shadow-xl active:scale-95"
				>
					Back to Dashboard
				</button>
			</div>
		</section>
	</div>
</main>

<style>
	:global {
		details summary::-webkit-details-marker {
			display: none;
		}
	}
</style>
