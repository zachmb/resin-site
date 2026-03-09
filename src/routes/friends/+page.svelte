<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let data: PageData;
	export { data };

	let activeTab: 'friends' | 'received' | 'sent' = 'friends';
	let searchEmail = '';
	let foundUser: { id: string; email: string } | null = null;
	let isSearching = false;
	let showJointPlanModal = false;
	let jointPlanCollaborator: { id: string; email: string } | null = null;
	let jointPlanText = '';
	let jointPlanIntensity = 50;

	async function handleSearch() {
		if (!searchEmail.includes('@')) return;
		isSearching = true;
		const formData = new FormData();
		formData.append('email', searchEmail);

		const response = await fetch('?/searchUser', {
			method: 'POST',
			body: formData
		});

		const result = await response.json();
		if (result.data?.found) {
			foundUser = result.data.user;
		} else {
			foundUser = null;
		}
		isSearching = false;
	}

	function getInitial(email: string): string {
		return (email.charAt(0) || 'U').toUpperCase();
	}

	function openJointPlanModal(friend: any) {
		jointPlanCollaborator = friend;
		jointPlanText = '';
		jointPlanIntensity = 50;
		showJointPlanModal = true;
	}

	function closeJointPlanModal() {
		showJointPlanModal = false;
		jointPlanCollaborator = null;
	}
</script>

<div class="flex h-screen bg-resin-charcoal/5">
	<!-- Left Panel -->
	<div class="w-72 border-r border-resin-earth/10 bg-white/40 backdrop-blur-sm flex flex-col">
		<div class="p-6 border-b border-resin-earth/10">
			<h1 class="text-2xl font-bold text-resin-charcoal">Friends</h1>
			<p class="text-sm text-resin-earth/60 mt-1">Connect with other users</p>
		</div>

		<!-- Tab Navigation -->
		<div class="flex gap-2 p-4 border-b border-resin-earth/10">
			<button
				on:click={() => (activeTab = 'friends')}
				class="px-3 py-2 rounded-lg font-medium transition-all text-sm {activeTab === 'friends'
					? 'bg-resin-forest text-white'
					: 'text-resin-earth/60 hover:bg-black/5'}"
			>
				Friends
				{#if data.friends.length > 0}
					<span class="ml-1 text-xs bg-white/30 rounded px-1.5">
						{data.friends.length}
					</span>
				{/if}
			</button>
			<button
				on:click={() => (activeTab = 'received')}
				class="px-3 py-2 rounded-lg font-medium transition-all text-sm {activeTab === 'received'
					? 'bg-resin-forest text-white'
					: 'text-resin-earth/60 hover:bg-black/5'}"
			>
				Requests
				{#if data.pendingReceived.length > 0}
					<span class="ml-1 text-xs bg-resin-amber/30 rounded px-1.5">
						{data.pendingReceived.length}
					</span>
				{/if}
			</button>
			<button
				on:click={() => (activeTab = 'sent')}
				class="px-3 py-2 rounded-lg font-medium transition-all text-sm {activeTab === 'sent'
					? 'bg-resin-forest text-white'
					: 'text-resin-earth/60 hover:bg-black/5'}"
			>
				Pending
				{#if data.pendingSent.length > 0}
					<span class="ml-1 text-xs bg-resin-earth/30 rounded px-1.5">
						{data.pendingSent.length}
					</span>
				{/if}
			</button>
		</div>

		<!-- Content Areas -->
		<div class="flex-1 overflow-y-auto">
			{#if activeTab === 'friends'}
				<div class="p-4 space-y-2">
					{#each data.friends as friend (friend.id)}
						<div
							class="p-4 rounded-xl bg-white/60 border border-resin-forest/10 hover:border-resin-forest/20 transition-all"
						>
							<div class="flex items-center gap-3 mb-3">
								<div
									class="w-10 h-10 rounded-lg bg-resin-forest/10 text-resin-forest font-bold flex items-center justify-center"
								>
									{getInitial(friend.email)}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-resin-charcoal truncate">
										{friend.email.split('@')[0]}
									</p>
									<p class="text-xs text-resin-earth/60 truncate">{friend.email}</p>
								</div>
							</div>
							<div class="flex gap-2">
								<button
									on:click={() => openJointPlanModal(friend)}
									class="flex-1 px-3 py-2 text-sm rounded-lg bg-resin-amber/10 text-resin-amber hover:bg-resin-amber/20 transition-all font-medium border border-resin-amber/20"
								>
									Joint Plan
								</button>
								<form
									action="?/removeFriend"
									method="POST"
									use:enhance
									on:submit={(e) => {
										if (!confirm('Remove this friend?')) e.preventDefault();
									}}
									class="flex-shrink-0"
								>
									<input type="hidden" name="friendship_id" value={friend.id} />
									<button
										type="submit"
										class="px-3 py-2 text-sm rounded-lg text-red-600/60 hover:bg-red-50 transition-all"
									>
										Remove
									</button>
								</form>
							</div>
						</div>
					{/each}

					{#if data.friends.length === 0}
						<div class="p-8 text-center">
							<p class="text-resin-earth/60 text-sm">No friends yet</p>
							<p class="text-xs text-resin-earth/40 mt-1">Search to add friends above</p>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'received'}
				<div class="p-4 space-y-2">
					{#each data.pendingReceived as request (request.id)}
						<div
							class="p-4 rounded-xl bg-white/60 border border-resin-amber/20 hover:border-resin-amber/30 transition-all"
						>
							<div class="flex items-center gap-3 mb-3">
								<div
									class="w-10 h-10 rounded-lg bg-resin-amber/10 text-resin-amber font-bold flex items-center justify-center"
								>
									{getInitial(request.email)}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-resin-charcoal truncate">
										{request.email.split('@')[0]}
									</p>
									<p class="text-xs text-resin-earth/60 truncate">{request.email}</p>
								</div>
							</div>
							<div class="flex gap-2">
								<form action="?/acceptRequest" method="POST" use:enhance class="flex-1">
									<input type="hidden" name="friendship_id" value={request.id} />
									<button
										type="submit"
										class="w-full px-3 py-2 text-sm rounded-lg bg-resin-forest/10 text-resin-forest hover:bg-resin-forest/20 transition-all font-medium border border-resin-forest/20"
									>
										Accept
									</button>
								</form>
								<form action="?/declineRequest" method="POST" use:enhance class="flex-1">
									<input type="hidden" name="friendship_id" value={request.id} />
									<button
										type="submit"
										class="w-full px-3 py-2 text-sm rounded-lg text-red-600/60 hover:bg-red-50 transition-all border border-red-200/30"
									>
										Decline
									</button>
								</form>
							</div>
						</div>
					{/each}

					{#if data.pendingReceived.length === 0}
						<div class="p-8 text-center">
							<p class="text-resin-earth/60 text-sm">No pending requests</p>
						</div>
					{/if}
				</div>
			{:else if activeTab === 'sent'}
				<div class="p-4 space-y-2">
					{#each data.pendingSent as request (request.id)}
						<div
							class="p-4 rounded-xl bg-white/60 border border-resin-earth/10 opacity-75"
						>
							<div class="flex items-center gap-3 mb-3">
								<div
									class="w-10 h-10 rounded-lg bg-resin-earth/10 text-resin-earth font-bold flex items-center justify-center"
								>
									{getInitial(request.email)}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-resin-charcoal truncate">
										{request.email.split('@')[0]}
									</p>
									<p class="text-xs text-resin-earth/60 truncate">{request.email}</p>
								</div>
							</div>
							<p class="text-xs text-resin-earth/50 font-mono">Awaiting response...</p>
						</div>
					{/each}

					{#if data.pendingSent.length === 0}
						<div class="p-8 text-center">
							<p class="text-resin-earth/60 text-sm">No pending requests</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Right Panel: Search -->
	<div class="flex-1 flex flex-col p-8">
		<div class="max-w-2xl">
			<h2 class="text-3xl font-bold text-resin-charcoal mb-2">Find Friends</h2>
			<p class="text-resin-earth/60 mb-8">Search by email address to connect with other users</p>

			<form
				on:submit|preventDefault={handleSearch}
				class="mb-8 flex gap-3"
			>
				<input
					type="email"
					placeholder="friend@example.com"
					bind:value={searchEmail}
					class="flex-1 px-4 py-3 rounded-xl border border-resin-earth/20 bg-white/60 backdrop-blur-sm placeholder-resin-earth/40 focus:outline-none focus:border-resin-forest/50 focus:ring-2 focus:ring-resin-forest/10"
				/>
				<button
					type="submit"
					disabled={isSearching}
					class="px-6 py-3 rounded-xl bg-resin-forest text-white font-medium hover:bg-resin-forest/90 transition-all disabled:opacity-50"
				>
					{isSearching ? 'Searching...' : 'Search'}
				</button>
			</form>

			{#if foundUser}
				<div class="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-resin-forest/20">
					<div class="flex items-center gap-4 mb-6">
						<div
							class="w-14 h-14 rounded-lg bg-resin-forest/10 text-resin-forest font-bold text-xl flex items-center justify-center"
						>
							{getInitial(foundUser.email)}
						</div>
						<div>
							<p class="font-bold text-resin-charcoal text-lg">
								{foundUser.email.split('@')[0]}
							</p>
							<p class="text-sm text-resin-earth/60">{foundUser.email}</p>
						</div>
					</div>
					<form action="?/sendRequest" method="POST" use:enhance>
						<input type="hidden" name="addressee_id" value={foundUser.id} />
						<button
							type="submit"
							class="w-full px-4 py-3 rounded-xl bg-resin-forest text-white font-medium hover:bg-resin-forest/90 transition-all"
						>
							Send Friend Request
						</button>
					</form>
				</div>
			{:else if searchEmail && !isSearching}
				<div class="p-6 rounded-2xl bg-red-50/60 border border-red-200/50 text-center">
					<p class="text-red-600 font-medium">User not found</p>
					<p class="text-sm text-red-500/70 mt-1">Try a different email address</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Joint Plan Modal -->
{#if showJointPlanModal && jointPlanCollaborator}
	<div
		class="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
		on:click={closeJointPlanModal}
		on:keydown={(e) => e.key === 'Escape' && closeJointPlanModal()}
		role="dialog"
		aria-modal="true"
	>
		<div
			class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
			on:click={(e) => e.stopPropagation()}
		>
			<h3 class="text-2xl font-bold text-resin-charcoal mb-2">
				Joint Plan with {jointPlanCollaborator.email.split('@')[0]}
			</h3>
			<p class="text-resin-earth/60 text-sm mb-6">
				Create a collaborative plan that works with both of your schedules
			</p>

			<form action="?/createJointPlan" method="POST" use:enhance on:submit={closeJointPlanModal}>
				<input type="hidden" name="collaborator_id" value={jointPlanCollaborator.id} />

				<div class="mb-4">
					<label class="block text-sm font-medium text-resin-charcoal mb-2">What's the plan?</label>
					<textarea
						name="raw_text"
						bind:value={jointPlanText}
						placeholder="Describe what you want to plan together..."
						class="w-full px-4 py-3 rounded-lg border border-resin-earth/20 bg-white focus:outline-none focus:border-resin-forest/50 focus:ring-2 focus:ring-resin-forest/10 resize-none"
						rows="4"
						required
					/>
				</div>

				<div class="mb-6">
					<label class="block text-sm font-medium text-resin-charcoal mb-2">
						Intensity: <span class="text-resin-amber">{jointPlanIntensity}%</span>
					</label>
					<input
						type="range"
						name="intensity"
						bind:value={jointPlanIntensity}
						min="0"
						max="100"
						class="w-full"
					/>
				</div>

				<div class="flex gap-3">
					<button
						type="button"
						on:click={closeJointPlanModal}
						class="flex-1 px-4 py-2 rounded-lg border border-resin-earth/20 text-resin-charcoal font-medium hover:bg-black/5 transition-all"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="flex-1 px-4 py-2 rounded-lg bg-resin-forest text-white font-medium hover:bg-resin-forest/90 transition-all"
					>
						Create Plan
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
