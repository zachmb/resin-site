<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let canvas: HTMLCanvasElement;
	let isDrawing = false;
	let selectedTool: 'pen' | 'eraser' | 'highlighter' = 'pen';
	let selectedColor = '#000000';
	let context: CanvasRenderingContext2D | null;

	let { onSave, onDismiss, noteHeight = 400 } = $props<{
		onSave: (dataUrl: string) => void;
		onDismiss: () => void;
		noteHeight?: number;
	}>();

	onMount(() => {
		if (canvas) {
			context = canvas.getContext('2d');
			if (context) {
				canvas.width = canvas.offsetWidth;
				canvas.height = noteHeight;
				context.fillStyle = 'transparent';
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
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		if (e instanceof MouseEvent) {
			return { x: e.clientX - rect.left, y: e.clientY - rect.top };
		} else if (e instanceof TouchEvent && e.touches.length > 0) {
			return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
		}
		return null;
	};

	const saveAnnotation = () => {
		if (canvas) {
			const dataUrl = canvas.toDataURL('image/png');
			onSave(dataUrl);
		}
	};

	const clearCanvas = () => {
		if (context) {
			context.clearRect(0, 0, canvas.width, canvas.height);
		}
	};
</script>

<div
	transition:fade={{ duration: 150 }}
	class="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
	onclick={(e) => {
		if (e.target === e.currentTarget) onDismiss();
	}}
>
	<div class="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col">
		<!-- Toolbar -->
		<div class="bg-gradient-to-r from-resin-forest to-resin-forest/90 text-white p-3 flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				<button
					onclick={() => (selectedTool = 'pen')}
					class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
						selectedTool === 'pen' ? 'bg-white text-resin-forest' : 'hover:bg-white/20'
					}`}
				>
					✏️ Pen
				</button>
				<button
					onclick={() => (selectedTool = 'highlighter')}
					class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
						selectedTool === 'highlighter' ? 'bg-white text-resin-forest' : 'hover:bg-white/20'
					}`}
				>
					🖍️ Highlight
				</button>
				<button
					onclick={() => (selectedTool = 'eraser')}
					class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
						selectedTool === 'eraser' ? 'bg-white text-resin-forest' : 'hover:bg-white/20'
					}`}
				>
					🗑️ Erase
				</button>
				<input
					type="color"
					bind:value={selectedColor}
					class="w-8 h-8 rounded cursor-pointer border border-white"
				/>
			</div>

			<div class="flex items-center gap-2">
				<button
					onclick={clearCanvas}
					class="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
				>
					Clear
				</button>
				<button
					onclick={saveAnnotation}
					class="px-4 py-1.5 rounded-lg text-sm font-semibold bg-white text-resin-forest hover:bg-white/90 transition-all"
				>
					Save
				</button>
				<button
					onclick={onDismiss}
					class="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-white/20 transition-all"
				>
					Cancel
				</button>
			</div>
		</div>

		<!-- Canvas Area -->
		<div class="flex-1 overflow-auto">
			<canvas
				bind:this={canvas}
				onmousedown={startDrawing}
				onmousemove={draw}
				onmouseup={stopDrawing}
				onmouseleave={stopDrawing}
				ontouchstart={startDrawing}
				ontouchmove={draw}
				ontouchend={stopDrawing}
				class="cursor-crosshair w-full"
			/>
		</div>
	</div>
</div>
