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
				<div class="relative">
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

			<nav
				class="hidden sm:flex items-center gap-8 text-sm font-medium text-resin-earth/80"
			>
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
