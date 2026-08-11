<!-- Modal — the ONE overlay primitive for Resin. Every modal was hand-rolled with a
     local z-index, no scroll-lock, and (mostly) no focus trap or Esc. This centralizes
     the correct behavior: body scroll-lock (use:scrollLock), backdrop-click + Esc to
     close, a focus trap that keeps Tab inside the dialog and restores focus on close,
     aria-modal, and a consistent z-index via the --z-modal token (see layout.css).
     Resin register kept (warm cream + amber + forest; green is on-brand here).
     Usage:
       <Modal isOpen onClose={() => (open = false)} title="…" size="sm">…body…</Modal>
-->
<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { scrollLock } from '$lib/actions/scrollLock';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		title?: string;
		size?: 'sm' | 'md' | 'lg';
		closeOnBackdrop?: boolean;
		children?: import('svelte').Snippet;
	}
	let { isOpen, onClose, title = '', size = 'md', closeOnBackdrop = true, children }: Props = $props();

	let dialogEl = $state<HTMLDivElement | null>(null);
	let prevFocus: HTMLElement | null = null;

	const MAXW = { sm: 'max-width:24rem', md: 'max-width:32rem', lg: 'max-width:48rem' };

	// Move focus into the dialog on open; restore it to the trigger on close.
	$effect(() => {
		if (isOpen) {
			prevFocus = (document.activeElement as HTMLElement) ?? null;
			queueMicrotask(() => {
				const first = dialogEl?.querySelector<HTMLElement>(
					'[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
				);
				(first ?? dialogEl)?.focus();
			});
		} else if (prevFocus) {
			prevFocus.focus?.();
			prevFocus = null;
		}
	});

	function onKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
		if (e.key !== 'Tab' || !dialogEl) return;
		// Focus trap: cycle Tab within the dialog's focusable elements.
		const f = Array.from(
			dialogEl.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
		if (f.length === 0) return;
		const first = f[0], last = f[f.length - 1];
		if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
		else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if isOpen}
	<div
		class="resin-modal-backdrop"
		use:scrollLock={isOpen}
		transition:fade={{ duration: 160 }}
		onmousedown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose(); }}
		role="presentation"
	>
		<div
			bind:this={dialogEl}
			class="resin-modal glass-card"
			style={MAXW[size]}
			role="dialog"
			aria-modal="true"
			aria-label={title || undefined}
			tabindex="-1"
			transition:scale={{ duration: 180, start: 0.97, opacity: 0 }}
		>
			{#if title}
				<h2 class="resin-modal__title">{title}</h2>
			{/if}
			{@render children?.()}
		</div>
	</div>
{/if}

<style>
	.resin-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--z-modal, 100);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(37, 35, 31, 0.32); /* resin-charcoal @ 32% */
		backdrop-filter: blur(3px);
	}
	.resin-modal {
		width: 100%;
		max-height: calc(100dvh - 2rem);
		overflow-y: auto;
		border-radius: 0.75rem;
		padding: 1.5rem;
	}
	.resin-modal__title {
		font-family: 'DM Serif Display', Georgia, serif;
		font-size: 1.25rem;
		color: var(--color-resin-charcoal, #25231f);
		margin: 0 0 0.75rem;
	}
	@media (prefers-reduced-motion: reduce) {
		.resin-modal-backdrop, .resin-modal { transition: none !important; }
	}
</style>
