<script lang="ts">
	import "./layout.css";
	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" />
	<title>Resin</title>
</svelte:head>

<div
	class="min-h-screen flex flex-col font-sans relative overflow-x-hidden bg-resin-bg text-resin-forest"
>
	<!-- Soft gradient glow to give organic feel across the app -->
	<div
		class="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-resin-amber/5 blur-[120px] rounded-full point-events-none -z-10 mt-10"
	></div>

	<!-- Navigation Bar -->
	<header
		class="w-full py-4 px-6 border-b border-resin-earth/10 sticky top-0 z-50 bg-resin-bg/80 backdrop-blur-md"
	>
		<div class="max-w-6xl mx-auto flex items-center justify-between">
			<a href="/" class="flex items-center gap-3 group">
				<img
					src="/logo.png"
					alt="Resin Logo"
					class="w-10 h-10 rounded-xl shadow-sm border border-resin-earth/20 group-hover:shadow-md transition-shadow"
				/>
				<span
					class="text-xl font-bold font-serif text-resin-charcoal tracking-tight"
					>Resin</span
				>
			</a>

			<nav
				class="hidden sm:flex items-center gap-6 text-sm font-medium text-resin-earth"
			>
				<a
					href="/support"
					class="hover:text-resin-forest transition-colors">Support</a
				>
				<a
					href="/#download"
					class="px-5 py-2.5 bg-resin-charcoal text-white rounded-full hover:bg-resin-forest transition-colors shadow-md hover:shadow-lg"
				>
					Get the App
				</a>
			</nav>

			<!-- Mobile menu button (visual only for now) -->
			<button
				class="sm:hidden text-resin-earth hover:text-resin-forest"
				aria-label="Toggle mobile menu"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="w-6 h-6"
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
					href="/support"
					class="hover:underline underline-offset-4 decoration-resin-amber/50"
					>Support</a
				>
			</nav>
		</div>
	</footer>
</div>
