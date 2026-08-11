<script lang="ts">
	import type { ParsedCommand } from '$lib/utils/commandParser';
	import { getCommandMetadata } from '$lib/utils/commandParser';

	let { commands = [] } = $props<{
		commands: ParsedCommand[];
	}>();
</script>

{#if commands.length > 0}
	<div class="mt-6 p-4 bg-resin-amber/5 rounded-xl border border-resin-amber/20">
		<div class="flex items-center gap-2 mb-3">
			<span class="text-lg">⚡</span>
			<h3 class="font-semibold text-resin-charcoal">
				{commands.length} Automation{commands.length !== 1 ? 's' : ''} Detected
			</h3>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
			{#each commands as command (command.fullCommand)}
				{@const meta = getCommandMetadata(command.type)}
				<div
					class="p-3 bg-white rounded-lg border border-resin-earth/10 hover:border-resin-amber/40 transition-colors"
				>
					<div class="flex items-start gap-2">
						<span class="text-lg">{meta.icon}</span>
						<div class="flex-1 min-w-0">
							<div class="font-semibold text-sm text-resin-charcoal">
								{meta.label}
							</div>
							<div class="text-xs text-resin-earth/70 line-clamp-1">
								{command.args.join(' ') || '(no arguments)'}
							</div>
						</div>
					</div>
					<div class="mt-2 text-xs text-resin-amber font-medium">
						{meta.description}
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-3 p-2 bg-resin-amber/5 rounded text-xs text-resin-earth border border-resin-amber/15">
			💡 <strong>Tip:</strong> These commands will trigger automations when you save this note. Set them up
			in your account settings to connect to external services.
		</div>
	</div>
{/if}
