<script lang="ts">
	import { onMount } from 'svelte';

	let countdown = 5;
	let isExtensionInstalled = false;

	onMount(() => {
		// Check if the Resin extension is installed by trying to send a message
		if (typeof chrome !== 'undefined' && chrome.runtime) {
			chrome.runtime
				.sendMessage({ type: 'EXTENSION_CHECK' })
				.then(() => {
					isExtensionInstalled = true;
				})
				.catch(() => {
					isExtensionInstalled = false;
				});
		}

		// Countdown timer - auto-close or redirect after 5 seconds
		const timer = setInterval(() => {
			countdown--;
			if (countdown === 0) {
				clearInterval(timer);
				window.close();
			}
		}, 1000);

		return () => clearInterval(timer);
	});

	function closeWindow() {
		window.close();
	}

	function openDashboard() {
		window.location.href = '/';
	}
</script>

<div class="container">
	<div class="card">
		<div class="icon">✨</div>
		<h1>Resin Activated</h1>
		<p class="subtitle">Your productivity companion is now ready</p>

		<div class="status">
			{#if isExtensionInstalled}
				<div class="success">
					<span class="checkmark">✓</span>
					<p>Extension installed successfully</p>
				</div>
			{:else}
				<div class="info">
					<p>Extension verification pending...</p>
				</div>
			{/if}
		</div>

		<div class="features">
			<h2>What's next?</h2>
			<ul>
				<li>📱 Create your first focus session</li>
				<li>🚫 Configure your blocked sites</li>
				<li>⏱️ Start blocking distractions</li>
			</ul>
		</div>

		<div class="actions">
			<button class="btn primary" on:click={openDashboard}>
				Open Dashboard
			</button>
			<button class="btn secondary" on:click={closeWindow}>
				Close ({countdown}s)
			</button>
		</div>

		<p class="footer">This window will close automatically in {countdown} seconds</p>
	</div>
</div>

<style>
	.container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
			sans-serif;
		padding: 20px;
	}

	.card {
		background: white;
		border-radius: 16px;
		padding: 40px;
		max-width: 500px;
		width: 100%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		text-align: center;
	}

	.icon {
		font-size: 60px;
		margin-bottom: 20px;
	}

	h1 {
		font-size: 28px;
		font-weight: 700;
		margin: 0 0 8px 0;
		color: #1a202c;
	}

	.subtitle {
		font-size: 14px;
		color: #718096;
		margin: 0 0 30px 0;
	}

	.status {
		margin: 30px 0;
	}

	.success {
		background: #f0fdf4;
		border: 2px solid #86efac;
		border-radius: 8px;
		padding: 20px;
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.checkmark {
		font-size: 24px;
		color: #22c55e;
		font-weight: bold;
	}

	.success p {
		margin: 0;
		color: #166534;
		font-weight: 500;
	}

	.info {
		background: #eff6ff;
		border: 2px solid #bfdbfe;
		border-radius: 8px;
		padding: 20px;
		color: #1e40af;
		font-weight: 500;
	}

	.features {
		margin: 30px 0;
		text-align: left;
	}

	.features h2 {
		font-size: 16px;
		font-weight: 600;
		margin: 0 0 12px 0;
		color: #1a202c;
	}

	.features ul {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.features li {
		font-size: 14px;
		color: #4a5568;
		padding: 8px 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 30px 0;
	}

	.btn {
		padding: 12px 24px;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.btn.primary {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.btn.primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
	}

	.btn.secondary {
		background: #f3f4f6;
		color: #374151;
	}

	.btn.secondary:hover {
		background: #e5e7eb;
	}

	.footer {
		font-size: 12px;
		color: #a0aec0;
		margin: 20px 0 0 0;
	}
</style>
