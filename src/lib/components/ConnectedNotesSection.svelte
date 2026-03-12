<script lang="ts">
	import ConnectionChip from './ConnectionChip.svelte';
	import { Link2 } from 'lucide-svelte';

	interface Connection {
		id: string;
		source_id: string;
		target_id: string;
		connection_type: string;
		sourceTitle?: string;
		targetTitle?: string;
	}

	interface Props {
		outgoing?: Connection[];
		incoming?: Connection[];
		onNavigateToNote?: (noteId: string) => void;
	}

	let { outgoing = [], incoming = [], onNavigateToNote }: Props = $props();

	const hasConnections = outgoing.length > 0 || incoming.length > 0;
</script>

{#if hasConnections}
	<div class="space-y-4 mt-6 pt-6 border-t border-resin-forest/10">
		<div class="flex items-center gap-2">
			<Link2 class="w-4 h-4 text-resin-forest" />
			<h3 class="text-sm font-bold text-resin-charcoal uppercase tracking-widest">
				Connected Notes
			</h3>
			<span class="text-xs font-bold text-resin-earth/50 ml-auto">
				{outgoing.length + incoming.length}
			</span>
		</div>

		{#if outgoing.length > 0}
			<div class="space-y-2">
				<p class="text-xs text-resin-earth/60 font-medium uppercase tracking-wider">
					This note points to
				</p>
				<div class="flex flex-wrap gap-2">
					{#each outgoing as connection (connection.id)}
						<ConnectionChip
							noteId={connection.target_id}
							noteTitle={connection.targetTitle || 'Untitled'}
							connectionType={connection.connection_type}
							isOutgoing={true}
							onClick={() => onNavigateToNote?.(connection.target_id)}
						/>
					{/each}
				</div>
			</div>
		{/if}

		{#if incoming.length > 0}
			<div class="space-y-2">
				<p class="text-xs text-resin-earth/60 font-medium uppercase tracking-wider">
					Linked from
				</p>
				<div class="flex flex-wrap gap-2">
					{#each incoming as connection (connection.id)}
						<ConnectionChip
							noteId={connection.source_id}
							noteTitle={connection.sourceTitle || 'Untitled'}
							connectionType={connection.connection_type}
							isOutgoing={false}
							onClick={() => onNavigateToNote?.(connection.source_id)}
						/>
					{/each}
				</div>
			</div>
		{/if}
	</div>
{/if}
