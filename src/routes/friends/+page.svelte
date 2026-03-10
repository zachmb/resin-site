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

<div class="min-h-screen bg-gradient-to-br from-resin-bg via-white/20 to-resin-bg pt-24 pb-16 px-4 sm:px-6">
	<div class="max-w-4xl mx-auto">
		<!-- Header -->
		<div class="mb-12">
			<div
				class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-resin-amber/10 border border-resin-amber/20 text-resin-amber text-[10px] font-bold uppercase tracking-widest mb-3"
			>
				Social
			</div>
			<h1 class="text-4xl md:text-6xl font-serif font-bold text-resin-charcoal tracking-tight mb-2">
				Friends
			</h1>
			<p class="text-resin-earth/60 font-medium">
				Connect with others and plan together
			</p>
		</div>

		<!-- Search Card -->
		<div class="glass-card rounded-[2.5rem] p-8 border border-white/20 shadow-premium bg-gradient-to-br from-white/40 to-transparent mb-12">
			<h2 class="text-lg font-bold text-resin-charcoal mb-6">Find Friends</h2>
			<form
				on:submit|preventDefault={handleSearch}
				class="flex gap-3 mb-6"
			>
				<input
					type="email"
					placeholder="Search by email address..."
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
				<div class="p-6 rounded-2xl bg-white/60 border border-resin-forest/20">
					<div class="flex items-center gap-4 mb-6">
						<div
							class="w-16 h-16 rounded-full bg-gradient-to-br from-resin-forest/20 to-resin-forest/10 text-resin-forest font-bold text-2xl flex items-center justify-center"
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

		<!-- Friends Sections -->
		{#if data.friends.length > 0}
			<section class="mb-12">
				<h2 class="text-2xl font-bold text-resin-charcoal mb-6 flex items-center gap-2">
					<svg class="w-6 h-6 text-resin-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292m0 0H7m5 0h5m-5 0a4 4 0 100-5.292m0 5.292V21" />
					</svg>
					Your Friends ({data.friends.length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each data.friends as friend (friend.id)}
						<div
							class="glass-card rounded-2xl p-6 border border-white/20 shadow-premium bg-gradient-to-br from-white/30 to-transparent hover:shadow-lg transition-all"
						>
							<div class="flex items-center gap-4 mb-6">
								<div
									class="w-14 h-14 rounded-full bg-gradient-to-br from-resin-forest/20 to-resin-forest/10 text-resin-forest font-bold text-lg flex items-center justify-center"
								>
									{getInitial(friend.email)}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-bold text-resin-charcoal">
										{friend.email.split('@')[0]}
									</p>
									<p class="text-xs text-resin-earth/60 truncate">{friend.email}</p>
								</div>
							</div>
							<div class="flex gap-2">
								<button
									on:click={() => openJointPlanModal(friend)}
									class="flex-1 px-4 py-2 text-sm rounded-lg bg-resin-amber/10 text-resin-amber hover:bg-resin-amber/20 transition-all font-medium border border-resin-amber/20"
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
									class="flex-1"
								>
									<input type="hidden" name="friendship_id" value={friend.id} />
									<button
										type="submit"
										class="w-full px-4 py-2 text-sm rounded-lg text-red-600/60 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-200"
									>
										Remove
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Incoming Requests -->
		{#if data.pendingReceived.length > 0}
			<section class="mb-12">
				<h2 class="text-2xl font-bold text-resin-amber mb-6 flex items-center gap-2">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
					</svg>
					Requests ({data.pendingReceived.length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each data.pendingReceived as request (request.id)}
						<div
							class="glass-card rounded-2xl p-6 border border-resin-amber/30 shadow-premium bg-gradient-to-br from-resin-amber/5 to-transparent hover:shadow-lg transition-all"
						>
							<div class="flex items-center gap-4 mb-6">
								<div
									class="w-14 h-14 rounded-full bg-gradient-to-br from-resin-amber/20 to-resin-amber/10 text-resin-amber font-bold text-lg flex items-center justify-center"
								>
									{getInitial(request.email)}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-bold text-resin-charcoal">
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
										class="w-full px-4 py-2 text-sm rounded-lg bg-resin-forest/10 text-resin-forest hover:bg-resin-forest/20 transition-all font-medium border border-resin-forest/20"
									>
										Accept
									</button>
								</form>
								<form action="?/declineRequest" method="POST" use:enhance class="flex-1">
									<input type="hidden" name="friendship_id" value={request.id} />
									<button
										type="submit"
										class="w-full px-4 py-2 text-sm rounded-lg text-red-600/60 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-200"
									>
										Decline
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Sent Requests -->
		{#if data.pendingSent.length > 0}
			<section class="mb-12">
				<h2 class="text-2xl font-bold text-resin-earth/70 mb-6 flex items-center gap-2">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
					</svg>
					Pending ({data.pendingSent.length})
				</h2>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each data.pendingSent as request (request.id)}
						<div
							class="glass-card rounded-2xl p-6 border border-resin-earth/20 shadow-premium bg-gradient-to-br from-white/20 to-transparent opacity-75"
						>
							<div class="flex items-center gap-4">
								<div
									class="w-14 h-14 rounded-full bg-gradient-to-br from-resin-earth/20 to-resin-earth/10 text-resin-earth font-bold text-lg flex items-center justify-center flex-shrink-0"
								>
									{getInitial(request.email)}
								</div>
								<div class="flex-1 min-w-0">
									<p class="font-bold text-resin-charcoal">
										{request.email.split('@')[0]}
									</p>
									<p class="text-xs text-resin-earth/60 truncate">{request.email}</p>
									<p class="text-xs text-resin-earth/50 font-mono mt-2">Awaiting response...</p>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Empty State -->
		{#if data.friends.length === 0 && data.pendingReceived.length === 0 && data.pendingSent.length === 0}
			<div
				class="glass-card rounded-[2.5rem] p-16 border border-white/20 shadow-premium bg-gradient-to-br from-white/30 to-transparent text-center"
			>
				<svg class="w-16 h-16 text-resin-forest/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292m0 0H7m5 0h5m-5 0a4 4 0 100-5.292m0 5.292V21" />
				</svg>
				<p class="text-resin-earth/60 text-lg font-medium mb-2">No friends yet</p>
				<p class="text-resin-earth/40 text-sm">Search by email above to add friends and start collaborating</p>
			</div>
		{/if}
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
