<script lang="ts">
	import type { ParsedCommand } from '$lib/utils/commandParser';
	import { getCommandMetadata } from '$lib/utils/commandParser';

	let { commands = [] } = $props<{
		commands: ParsedCommand[];
	}>();
</script>

{#if commands.length > 0}
	<div class="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
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
					class="p-3 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
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
					<div class="mt-2 text-xs text-blue-600 font-medium">
						{meta.description}
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700 border border-blue-100">
			💡 <strong>Tip:</strong> These commands will trigger automations when you save this note. Set them up
			in your account settings to connect to external services.
		</div>
	</div>
{/if}

<style lang="postcss">
	:global(.dark) {
		background: linear-gradient(to right, rgb(30 41 59 / 0.5), rgb(55 48 163 / 0.1));
	}
</style>
