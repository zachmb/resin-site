<script lang="ts">
	import { onMount } from 'svelte';

	export let isVisible = false;
	export let celebrationLevel: 'standard' | 'bonus' | 'rare' = 'standard';
	export let stonesEarned: number = 0;
	export let streakCount: number = 0;
	export let message: string = '';

	let particleElements: HTMLElement[] = [];

	const celebrationConfig = {
		standard: {
			duration: 2000,
			particles: 20,
			color: '#8B7355',
			emoji: '🪨'
		},
		bonus: {
			duration: 3000,
			particles: 40,
			color: '#D4A574',
			emoji: '✨'
		},
		rare: {
			duration: 4000,
			particles: 60,
			color: '#FFD700',
			emoji: '💎'
		}
	};

	const config = celebrationConfig[celebrationLevel];

	function createParticles() {
		if (!isVisible) return;

		const container = document.getElementById('fossilization-container');
		if (!container) return;

		for (let i = 0; i < config.particles; i++) {
			const particle = document.createElement('div');
			particle.innerHTML = config.emoji;
			particle.style.position = 'fixed';
			particle.style.left = '50%';
			particle.style.top = '50%';
			particle.style.fontSize = `${Math.random() * 20 + 10}px`;
			particle.style.pointerEvents = 'none';
			particle.style.opacity = '1';
			particle.style.zIndex = '9999';

			container.appendChild(particle);

			// Animate particle
			const angle = (i / config.particles) * Math.PI * 2;
			const velocity = Math.random() * 3 + 2;
			const vx = Math.cos(angle) * velocity;
			const vy = Math.sin(angle) * velocity;
			let x = 0;
			let y = 0;
			let life = 1;

			const animate = () => {
				x += vx;
				y += vy;
				life -= 1 / 60 / (config.duration / 1000);

				particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${life})`;
				particle.style.opacity = String(Math.max(0, life));

				if (life > 0) {
					requestAnimationFrame(animate);
				} else {
					particle.remove();
				}
			};

			animate();
			particleElements.push(particle);
		}
	}

	function playHaptic() {
		if ('vibrate' in navigator) {
			navigator.vibrate([50, 30, 50, 30, 100]);
		}
	}

	onMount(() => {
		if (isVisible) {
			playHaptic();
			createParticles();

			// Auto-hide after duration
			setTimeout(() => {
				isVisible = false;
			}, config.duration);
		}
	});
</script>

{#if isVisible}
	<div id="fossilization-container" class="ceremony">
		<!-- Shatter glass effect -->
		<div class="shatter-overlay" style="--duration: {config.duration}ms">
			{#each Array(8) as _, i}
				<div class="shard" style="--index: {i}; --duration: {config.duration}ms" />
			{/each}
		</div>

		<!-- Fossilization core -->
		<div class="fossilization-core" style="--duration: {config.duration}ms">
			<div class="glow" style="--color: {config.color}; --duration: {config.duration}ms" />
			<div class="crystallize" style="--duration: {config.duration}ms">
				{config.emoji}
			</div>
		</div>

		<!-- Celebration text -->
		<div class="celebration-text" style="--duration: {config.duration}ms">
			<div class="title">
				{#if celebrationLevel === 'rare'}
					GEOLOGICAL MARVEL! 💎
				{:else if celebrationLevel === 'bonus'}
					MAGNIFICENT! ✨
				{:else}
					SESSION COMPLETE! 🪨
				{/if}
			</div>
			<div class="stones">+{stonesEarned} stones</div>
			{#if streakCount > 1}
				<div class="streak">🔥 {streakCount}-day streak!</div>
			{/if}
			{#if message}
				<div class="message">{message}</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.ceremony {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 9998;
	}

	.shatter-overlay {
		position: absolute;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.shard {
		position: absolute;
		background: rgba(139, 115, 85, 0.3);
		will-change: transform, opacity;
		animation: shatter var(--duration) ease-out forwards;
	}

	@keyframes shatter {
		0% {
			opacity: 1;
			clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
		}
		100% {
			opacity: 0;
			transform: translateY(200px) rotate(360deg);
			clip-path: polygon(0% 0%, 100% 0%, 50% 100%);
		}
	}

	/* Position shards radially */
	.shard:nth-child(1) {
		top: 0;
		left: 0;
		width: 50%;
		height: 50%;
		transform-origin: 100% 100%;
	}
	.shard:nth-child(2) {
		top: 0;
		right: 0;
		width: 50%;
		height: 50%;
		transform-origin: 0% 100%;
	}
	.shard:nth-child(3) {
		bottom: 0;
		left: 0;
		width: 50%;
		height: 50%;
		transform-origin: 100% 0%;
	}
	.shard:nth-child(4) {
		bottom: 0;
		right: 0;
		width: 50%;
		height: 50%;
		transform-origin: 0% 0%;
	}

	.fossilization-core {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 10000;
	}

	.glow {
		position: absolute;
		width: 200px;
		height: 200px;
		border-radius: 50%;
		background: radial-gradient(circle, var(--color) 0%, transparent 70%);
		filter: blur(20px);
		animation: pulse var(--duration) ease-out forwards;
		opacity: 0.6;
	}

	@keyframes pulse {
		0% {
			transform: scale(0.5);
			opacity: 0.8;
		}
		50% {
			opacity: 0.4;
		}
		100% {
			transform: scale(2);
			opacity: 0;
		}
	}

	.crystallize {
		position: relative;
		z-index: 10001;
		font-size: 80px;
		animation: crystallize var(--duration) ease-out forwards;
		filter: drop-shadow(0 0 20px var(--color, #8B7355));
	}

	@keyframes crystallize {
		0% {
			transform: scale(0) rotate(0deg);
			opacity: 1;
			filter: drop-shadow(0 0 40px var(--color, #8B7355));
		}
		50% {
			transform: scale(1.2) rotate(180deg);
		}
		100% {
			transform: scale(1) rotate(360deg);
			opacity: 0;
		}
	}

	.celebration-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		z-index: 10002;
		animation: textFloat var(--duration) ease-out forwards;
		pointer-events: none;
	}

	@keyframes textFloat {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.8);
		}
		20% {
			opacity: 1;
			transform: translate(-50%, calc(-50% - 20px)) scale(1);
		}
		80% {
			opacity: 1;
			transform: translate(-50%, calc(-50% - 100px)) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, calc(-50% - 150px)) scale(0.8);
		}
	}

	.title {
		font-size: 36px;
		font-weight: bold;
		color: #8b7355;
		text-shadow: 0 2px 10px rgba(139, 115, 85, 0.3);
		margin-bottom: 10px;
		letter-spacing: 2px;
	}

	.stones {
		font-size: 28px;
		color: #d4a574;
		font-weight: bold;
		margin: 10px 0;
		text-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
	}

	.streak {
		font-size: 20px;
		color: #ff6b6b;
		margin-top: 8px;
		animation: streakGlow 0.6s ease-out;
	}

	@keyframes streakGlow {
		0% {
			text-shadow: 0 0 10px #ff6b6b;
			scale: 1.2;
		}
		100% {
			text-shadow: 0 2px 4px rgba(255, 107, 107, 0.3);
			scale: 1;
		}
	}

	.message {
		font-size: 16px;
		color: #666;
		margin-top: 12px;
		font-style: italic;
	}
</style>
