<script lang="ts">
	import { goto } from '$app/navigation';
	import { fly, fade } from 'svelte/transition';
	import { Ban, RefreshCw, Activity, Lock, ShieldCheck, Smartphone, SlidersHorizontal, Target, ArrowRight } from 'lucide-svelte';

	const features = [
		{ icon: Ban, title: 'Blocks sites while you focus', copy: 'When you start a focus session, the sites you picked get blocked in Chrome.' },
		{ icon: RefreshCw, title: 'Syncs on its own', copy: 'Start a session in Resin and Chrome starts blocking automatically. You set it up once.' },
		{ icon: Activity, title: 'Shows if it is working', copy: 'See at a glance whether this browser is protected, needs setup, or is catching up.' }
	];

	const steps = [
		['Add it to Chrome', 'Get Resin Shield from the Chrome Web Store. Sign in with the same email as your Resin Pro account.'],
		['Pick what to block', 'Add the sites that distract you most — like social media, videos, or news.'],
		['Start focusing', 'Begin a session in Resin. The sites you picked get blocked right away.'],
		['Check it is on', 'The little popup shows if this browser is protected, needs setup, or is catching up.']
	];

	const why = [
		{ icon: Lock, title: 'Private by default', copy: 'Resin only blocks the sites you picked. It never reads your pages, forms, passwords, or history.' },
		{ icon: Activity, title: 'Always shows its status', copy: 'The popup tells you if blocking is on: Protected, Waiting, Needs setup, or Catching up.' },
		{ icon: ShieldCheck, title: 'Blocks the smart way', copy: 'Chrome blocks the sites during your session, so a bored click cannot pull you away.' },
		{ icon: Smartphone, title: 'Works with your phone', copy: 'Block sites on your laptop while you use Resin on your phone. One setup, both places.' },
		{ icon: SlidersHorizontal, title: 'Ready to go', copy: 'Comes with common distractions already picked. Change them anytime.' },
		{ icon: Target, title: 'Different rules when you need them', copy: 'Block more for deep work, less for light tasks.' }
	];

	const faqs = [
		['Can I turn it off during a session?', 'Yes. Chrome always lets you turn off extensions or take away site access. Resin just shows you when that happens — the popup says Needs setup or Catching up, and you can turn it back on anytime.'],
		['Does it work on any website?', 'Yes. You can block any site. It comes with common ones ready to go — YouTube, Reddit, Twitter, Facebook, TikTok, Instagram, and news. Add your own anytime.'],
		['What about apps, not websites?', 'This blocks websites. To block apps on your phone (like the YouTube app), use focus mode in the Resin iPhone app. They work together.'],
		['Can I block just one page on a site?', 'Not yet. Right now Resin blocks a whole site, which is simpler and easier to trust while you focus. If you need a site for work, take it off your block list before you start.'],
		['Does it cost anything?', 'The iPhone app is free. The web app and Chrome blocking come with Resin Pro, which you buy in the iPhone app.']
	];
</script>

<svelte:head>
	<title>Resin Web Shield - Chrome Extension | Resin</title>
</svelte:head>

<main class="ext-page w-full min-h-screen pt-24 pb-32 px-4 sm:px-6 relative z-10">
	<div class="absolute top-0 left-0 w-96 h-96 bg-resin-amber/5 rounded-full blur-3xl -z-10"></div>
	<div class="absolute bottom-0 right-0 w-96 h-96 bg-resin-forest/5 rounded-full blur-3xl -z-10"></div>

	<div class="max-w-5xl mx-auto">
		<!-- Header -->
		<div class="text-center mb-16" in:fly={{ y: -20, duration: 800 }}>
			<div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-resin-charcoal text-white shadow-xl mb-6">
				<img src="/resinext-logo.png" alt="Resin Web Shield" class="w-12 h-12 object-contain" />
			</div>
			<h1 class="text-5xl md:text-6xl font-bold text-resin-charcoal mb-5">
				Resin <span class="text-resin-amber">Shield</span>
			</h1>
			<p class="text-xl text-resin-earth/75 max-w-2xl mx-auto leading-relaxed">
				Turn your iPhone focus sessions into website blocking on your laptop. The sites that distract you get blocked in Chrome while you work.
			</p>
		</div>

		<!-- Feature cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
			{#each features as f, i}
				{@const Icon = f.icon}
				<div class="glass-card rounded-2xl p-8 border border-resin-forest/10 bg-gradient-to-br from-resin-forest/5 to-transparent hover:border-resin-forest/30 transition-all" in:fly={{ y: 16, duration: 600, delay: 100 + i * 100 }}>
					<div class="w-11 h-11 rounded-xl bg-resin-forest/10 text-resin-forest flex items-center justify-center mb-5"><Icon size={22} /></div>
					<h3 class="text-lg font-bold text-resin-charcoal mb-2">{f.title}</h3>
					<p class="text-sm text-resin-earth/70 leading-relaxed">{f.copy}</p>
				</div>
			{/each}
		</div>

		<!-- How it works -->
		<section class="mb-24">
			<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-12 text-center">How it works</h2>
			<div class="space-y-8 max-w-3xl mx-auto">
				{#each steps as step, i}
					<div class="flex gap-6 items-start">
						<div class="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-resin-amber text-white font-bold text-lg">{i + 1}</div>
						<div class="flex-1">
							<h3 class="text-xl font-bold text-resin-charcoal mb-2">{step[0]}</h3>
							<p class="text-resin-earth/70 leading-relaxed">{step[1]}</p>
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Why people like it -->
		<section class="mb-24">
			<div class="glass-card rounded-2xl p-10 md:p-12 border border-resin-forest/15 bg-gradient-to-br from-resin-forest/5 to-transparent">
				<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-12">Why people like it</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-9">
					{#each why as w}
						{@const Icon = w.icon}
						<div>
							<h4 class="text-lg font-bold text-resin-charcoal mb-2 flex items-center gap-3">
								<span class="w-9 h-9 rounded-lg bg-resin-amber/12 text-resin-amber flex items-center justify-center flex-shrink-0"><Icon size={18} /></span>
								{w.title}
							</h4>
							<p class="text-resin-earth/70 leading-relaxed">{w.copy}</p>
						</div>
					{/each}
				</div>
			</div>
		</section>

		<!-- FAQ -->
		<section class="mb-24">
			<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-12 text-center">Common questions</h2>
			<div class="space-y-5 max-w-3xl mx-auto">
				{#each faqs as faq}
					<details class="group border-l-4 border-resin-amber bg-white/40 p-6 rounded-lg hover:bg-white/60 transition-colors">
						<summary class="cursor-pointer flex items-center justify-between gap-4 font-bold text-resin-charcoal">
							{faq[0]}
							<span class="text-xl group-open:rotate-180 transition-transform">›</span>
						</summary>
						<p class="text-resin-earth/70 mt-4 leading-relaxed">{faq[1]}</p>
					</details>
				{/each}
			</div>
		</section>

		<!-- CTA -->
		<section class="glass-card rounded-2xl p-12 border border-resin-amber/20 bg-gradient-to-r from-resin-amber/10 to-resin-forest/5 text-center" in:fade={{ duration: 600, delay: 400 }}>
			<h2 class="text-3xl md:text-4xl font-bold text-resin-charcoal mb-4">Ready for Resin on your laptop?</h2>
			<p class="text-lg text-resin-earth/70 mb-8 max-w-2xl mx-auto leading-relaxed">
				Add Resin Shield to Chrome, then go Pro in the iPhone app to keep your plans and blocking in sync everywhere.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center">
				<!-- TODO(launch): once the Chrome Web Store listing is approved, set the
				     real store URL (https://chromewebstore.google.com/detail/<EXTENSION_ID>)
				     and change the label back to "Add to Chrome". -->
				<a
					href="mailto:support@noteresin.com?subject=Notify%20me%20when%20Resin%20Web%20Shield%20is%20live"
					class="px-9 py-4 bg-resin-charcoal text-white rounded-xl font-bold text-base hover:bg-resin-forest transition-all shadow-xl active:scale-95 inline-flex items-center justify-center gap-3"
				>
					<span>In review on the Chrome Web Store — email me when it's live</span>
					<ArrowRight size={18} />
				</a>
				<button
					onclick={() => goto('/')}
					class="px-9 py-4 bg-white text-resin-charcoal border-2 border-resin-charcoal rounded-xl font-bold text-base hover:bg-resin-charcoal/5 transition-all shadow-xl active:scale-95"
				>
					Back to home
				</button>
			</div>
		</section>
	</div>
</main>

<style>
	.ext-page h1,.ext-page h2,.ext-page h3,.ext-page h4 {
		font-family:'Manrope','Inter',system-ui,sans-serif!important; font-weight:800!important; letter-spacing:-.03em;
	}
	:global(.ext-page details summary::-webkit-details-marker) { display:none; }
</style>
