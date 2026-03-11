<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let isDrawing = false;
	let selectedTool: 'pen' | 'eraser' | 'highlighter' = 'pen';
	let selectedColor = '#000000';
	let context: CanvasRenderingContext2D | null;

	let { onSave, onDismiss } = $props<{
		onSave: (dataUrl: string) => void;
		onDismiss: () => void;
	}>();

	onMount(() => {
		if (canvas) {
			context = canvas.getContext('2d');
			if (context) {
				// Set canvas size to window size
				canvas.width = window.innerWidth;
				canvas.height = window.innerHeight;
				context.fillStyle = 'white';
				context.fillRect(0, 0, canvas.width, canvas.height);
			}
		}
	});

	const startDrawing = (e: MouseEvent | TouchEvent) => {
		isDrawing = true;
		const pos = getPosition(e);
		if (context && pos) {
			context.beginPath();
			context.moveTo(pos.x, pos.y);
		}
	};

	const draw = (e: MouseEvent | TouchEvent) => {
		if (!isDrawing || !context) return;

		const pos = getPosition(e);
		if (!pos) return;

		if (selectedTool === 'eraser') {
			context.clearRect(pos.x - 10, pos.y - 10, 20, 20);
		} else if (selectedTool === 'highlighter') {
			context.globalAlpha = 0.3;
			context.strokeStyle = selectedColor;
			context.lineWidth = 15;
			context.globalCompositeOperation = 'multiply';
			context.lineTo(pos.x, pos.y);
			context.stroke();
			context.globalAlpha = 1;
		} else {
			context.globalCompositeOperation = 'source-over';
			context.strokeStyle = selectedColor;
			context.lineWidth = 2;
			context.lineCap = 'round';
			context.lineJoin = 'round';
			context.lineTo(pos.x, pos.y);
			context.stroke();
		}
	};

	const stopDrawing = () => {
		if (context) {
			context.closePath();
		}
		isDrawing = false;
	};

	const getPosition = (e: MouseEvent | TouchEvent): { x: number; y: number } | null => {
		if (e instanceof MouseEvent) {
			return { x: e.clientX, y: e.clientY };
		} else if (e instanceof TouchEvent && e.touches.length > 0) {
			return { x: e.touches[0].clientX, y: e.touches[0].clientY };
		}
		return null;
	};

	const saveDrawing = () => {
		if (canvas) {
			const dataUrl = canvas.toDataURL('image/png');
			onSave(dataUrl);
		}
	};

	const clearCanvas = () => {
		if (context) {
			context.fillStyle = 'white';
			context.fillRect(0, 0, canvas.width, canvas.height);
		}
	};
</script>

<div class="fixed inset-0 z-50 bg-white flex flex-col">
	<!-- Toolbar -->
	<div class="bg-gradient-to-r from-resin-forest to-resin-forest/90 text-white p-4 shadow-lg">
		<div class="flex items-center justify-between max-w-4xl mx-auto">
			<button
				onclick={onDismiss}
				class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/20 transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back
			</button>

			<div class="flex items-center gap-3">
				<!-- Tool buttons -->
				<button
					onclick={() => (selectedTool = 'pen')}
					class={`px-4 py-2 rounded-lg font-semibold transition-all ${
						selectedTool === 'pen' ? 'bg-white text-resin-forest' : 'hover:bg-white/20'
					}`}
				>
					✏️ Pen
				</button>
				<button
					onclick={() => (selectedTool = 'highlighter')}
					class={`px-4 py-2 rounded-lg font-semibold transition-all ${
						selectedTool === 'highlighter' ? 'bg-white text-resin-forest' : 'hover:bg-white/20'
					}`}
				>
					🖍️ Highlight
				</button>
				<button
					onclick={() => (selectedTool = 'eraser')}
					class={`px-4 py-2 rounded-lg font-semibold transition-all ${
						selectedTool === 'eraser' ? 'bg-white text-resin-forest' : 'hover:bg-white/20'
					}`}
				>
					🗑️ Erase
				</button>

				<!-- Color picker -->
				<input
					type="color"
					bind:value={selectedColor}
					class="w-10 h-10 rounded cursor-pointer border-2 border-white"
				/>

				<!-- Clear button -->
				<button
					onclick={clearCanvas}
					class="px-4 py-2 rounded-lg hover:bg-white/20 transition-colors"
					title="Clear canvas"
				>
					Clear
				</button>

				<!-- Save button -->
				<button
					onclick={saveDrawing}
					class="px-6 py-2 rounded-lg font-semibold bg-white text-resin-forest hover:bg-white/90 transition-all shadow-md"
				>
					✓ Save Annotation
				</button>
			</div>
		</div>
	</div>

	<!-- Canvas -->
	<canvas
		bind:this={canvas}
		onmousedown={startDrawing}
		onmousemove={draw}
		onmouseup={stopDrawing}
		onmouseleave={stopDrawing}
		ontouchstart={startDrawing}
		ontouchmove={draw}
		ontouchend={stopDrawing}
		class="flex-1 cursor-crosshair bg-white"
	/>

	<!-- Info bar -->
	<div class="bg-blue-50 border-t border-blue-200 px-4 py-3 text-sm text-blue-700">
		<strong>💡 Tip:</strong> Draw or highlight directly on your note. Use the toolbar to switch tools and
		colors. Your annotations will be saved and synced across all devices.
	</div>
</div>

<style>
	:global(body.drawing-mode) {
		overflow: hidden;
	}
</style>
