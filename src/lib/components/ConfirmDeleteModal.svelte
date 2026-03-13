<script lang="ts">
	import { fade } from 'svelte/transition';

	interface Props {
		isOpen: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
		onCancel: () => void;
		isLoading?: boolean;
	}

	let { isOpen, title, message, onConfirm, onCancel, isLoading = false } = $props();
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		transition:fade={{ duration: 200 }}
		onmousedown={(e) => {
			if (e.target === e.currentTarget) onCancel();
		}}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="bg-resin-bg rounded-2xl shadow-xl max-w-sm w-full border border-resin-forest/10 overflow-hidden"
			transition:fade={{ duration: 200 }}
		>
			<!-- Header -->
			<div class="px-6 py-6 border-b border-resin-earth/10 bg-gradient-to-r from-resin-forest/5 to-resin-amber/5">
				<h2 class="text-lg font-bold text-resin-charcoal">{title}</h2>
			</div>

			<!-- Content -->
			<div class="px-6 py-6">
				<p class="text-sm text-resin-earth/70 leading-relaxed">{message}</p>
			</div>

			<!-- Actions -->
			<div class="px-6 py-4 bg-white/40 flex gap-3">
				<button
					onclick={onCancel}
					disabled={isLoading}
					class="flex-1 px-4 py-2 rounded-lg font-bold text-sm text-resin-forest bg-white hover:bg-white/80 border border-resin-forest/20 transition-all disabled:opacity-50"
				>
					Keep It
				</button>
				<button
					onclick={onConfirm}
					disabled={isLoading}
					class="flex-1 px-4 py-2 rounded-lg font-bold text-sm text-white bg-red-600 hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
				>
					{#if isLoading}
						<div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
					{/if}
					Delete
				</button>
			</div>
		</div>
	</div>
{/if}
