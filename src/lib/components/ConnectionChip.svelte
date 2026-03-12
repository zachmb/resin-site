<script lang="ts">
	import { ChevronRight } from 'lucide-svelte';

	interface Props {
		noteId: string;
		noteTitle: string;
		connectionType: string;
		isOutgoing: boolean;
		onClick?: () => void;
	}

	let { noteId, noteTitle, connectionType, isOutgoing, onClick }: Props = $props();

	const connectionLabels: Record<string, string> = {
		relates_to: 'Related to',
		blocks: 'Blocks',
		supports: 'Supports',
		depends_on: 'Depends on',
		references: 'References',
		contradicts: 'Contradicts'
	};

	const connectionColors: Record<string, { bg: string; text: string; border: string }> = {
		relates_to: {
			bg: 'bg-resin-forest/5',
			text: 'text-resin-forest',
			border: 'border-resin-forest/20'
		},
		blocks: {
			bg: 'bg-red-50',
			text: 'text-red-600',
			border: 'border-red-200'
		},
		supports: {
			bg: 'bg-green-50',
			text: 'text-green-600',
			border: 'border-green-200'
		},
		depends_on: {
			bg: 'bg-amber-50',
			text: 'text-amber-600',
			border: 'border-amber-200'
		},
		references: {
			bg: 'bg-blue-50',
			text: 'text-blue-600',
			border: 'border-blue-200'
		},
		contradicts: {
			bg: 'bg-purple-50',
			text: 'text-purple-600',
			border: 'border-purple-200'
		}
	};

	const colors = connectionColors[connectionType] || connectionColors.relates_to;
	const label = connectionLabels[connectionType] || connectionType;
	const direction = isOutgoing ? '→' : '←';
</script>

<button
	class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold {colors.bg} {colors.text} border {colors.border} transition-all hover:shadow-md hover:scale-105 active:scale-95"
	onclick={onClick}
	title={`${label}: ${noteTitle}`}
>
	<span class="opacity-60">{direction}</span>
	<span class="truncate max-w-xs">{noteTitle}</span>
	<ChevronRight class="w-3 h-3 opacity-60" />
</button>

<style>
	button {
		cursor: pointer;
	}

	button:hover {
		transform: translateY(-1px);
	}
</style>
