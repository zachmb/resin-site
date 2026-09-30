import { adminClient } from '$lib/server/auth';

const USER_OWNED_TABLES = [
	['active_blocks', 'user_id'],
	['amber_task_feedback', 'user_id'],
	['attestation_challenges', 'user_id'],
	['attested_keys', 'user_id'],
	['block_audit_log', 'user_id'],
	['blocking_sessions', 'user_id'],
	['command_integrations', 'user_id'],
	['command_execution_logs', 'user_id'],
	['daily_activity', 'user_id'],
	['device_tokens', 'user_id'],
	['emergency_blocks', 'user_id'],
	['focus_automations', 'user_id'],
	['focus_group_members', 'user_id'],
	['forest_events', 'user_id'],
	['mind_map_edges', 'source_user_id'],
	['mind_map_edges', 'target_user_id'],
	['mind_map_edges', 'user_id'],
	['purchased_trees', 'user_id'],
	['referral_rewards', 'referrer_id'],
	['referral_rewards', 'referred_user_id'],
	['time_sync_audit', 'user_id'],
	['user_achievements', 'user_id'],
	['user_apns_tokens', 'user_id'],
	['user_custom_blocks', 'user_id']
] as const;

const USER_RELATIONSHIP_TABLES = [
	['friend_requests', 'from_user_id'],
	['friend_requests', 'to_user_id'],
	['friends', 'user_id_1'],
	['friends', 'user_id_2'],
	['friendships', 'requester_id'],
	['friendships', 'addressee_id']
] as const;

const USER_PARENT_TABLES = [
	['focus_groups', 'created_by']
] as const;

const OPTIONAL_COLLABORATION_CHILD_TABLES = [
	['board_members', 'user_id'],
	['board_notes', 'user_id'],
	['group_session_participants', 'user_id'],
	['group_invites', 'created_by'],
	['shared_focus_sessions', 'initiator_id'],
	['shared_focus_sessions', 'collaborator_id'],
	['joint_amber_plans', 'initiator_id'],
	['joint_amber_plans', 'collaborator_id'],
	['shared_notes', 'owner_id'],
	['shared_notes', 'shared_with_id']
] as const;

const OPTIONAL_COLLABORATION_PARENT_TABLES = [
	['group_focus_sessions', 'created_by'],
	['boards', 'created_by']
] as const;

const OPTIONAL_USER_CHILD_TABLES = [
	['group_members', 'user_id']
] as const;

const OWNED_FOCUS_GROUP_CHILD_TABLES = [
	['focus_group_members', 'group_id'],
	['group_members', 'group_id'],
	['group_invites', 'group_id'],
	['group_focus_sessions', 'group_id']
] as const;

const OWNED_BOARD_CHILD_TABLES = [
	['board_members', 'board_id'],
	['board_notes', 'board_id']
] as const;

type CleanupFailure = {
	table: string;
	column: string;
	message: string;
};

const SELECT_PAGE_SIZE = 1000;
const DELETE_IN_CHUNK_SIZE = 200;

function isMissingSchemaError(error: any) {
	return error?.code === '42P01' || error?.code === '42703' || error?.code === 'PGRST204';
}

function safeCleanupFailure(table: string, column: string, error: any): CleanupFailure {
	return {
		table,
		column,
		message: error?.code ? `Cleanup failed (${error.code})` : 'Cleanup failed'
	};
}

function logCleanupIssue(kind: 'required' | 'optional', table: string, column: string, error: any) {
	const area = kind === 'required' ? 'required' : 'optional';
	console.warn(`[account:delete] ${area} cleanup failed`);
}

async function deleteRowsByUserId(table: string, column: string, userId: string) {
	const { error } = await (adminClient as any).from(table).delete().eq(column, userId);
	if (error) {
		if (isMissingSchemaError(error)) return null;
		logCleanupIssue('required', table, column, error);
	}
	return error ? safeCleanupFailure(table, column, error) : null;
}

async function deleteRowsByValues(table: string, column: string, values: string[]) {
	if (values.length === 0) return null;

	for (let index = 0; index < values.length; index += DELETE_IN_CHUNK_SIZE) {
		const chunk = values.slice(index, index + DELETE_IN_CHUNK_SIZE);
		const { error } = await (adminClient as any).from(table).delete().in(column, chunk);
		if (error) {
			if (isMissingSchemaError(error)) return null;
			logCleanupIssue('required', table, column, error);
			return safeCleanupFailure(table, column, error);
		}
	}
	return null;
}

async function deleteOptionalRowsByUserId(table: string, column: string, userId: string) {
	const { error } = await (adminClient as any).from(table).delete().eq(column, userId);
	if (error && !isMissingSchemaError(error)) {
		logCleanupIssue('optional', table, column, error);
	}
	return error && !isMissingSchemaError(error) ? safeCleanupFailure(table, column, error) : null;
}

async function deleteRowsInParallel<T extends readonly (readonly [string, string])[]>(
	tables: T,
	userId: string,
	deleteFn: (table: string, column: string, userId: string) => Promise<any>
) {
	return Promise.allSettled(tables.map(([table, column]) => deleteFn(table, column, userId)));
}

async function deleteRowsByValuesInParallel<T extends readonly (readonly [string, string])[]>(
	tables: T,
	values: string[]
) {
	return Promise.allSettled(tables.map(([table, column]) => deleteRowsByValues(table, column, values)));
}

async function deleteUserCredentials(userId: string) {
	const { error: idError } = await (adminClient as any).from('user_credentials').delete().eq('id', userId);
	if (idError) {
		if (!isMissingSchemaError(idError)) logCleanupIssue('required', 'user_credentials', 'id', idError);
	}

	const { error: legacyUserIdError } = await (adminClient as any)
		.from('user_credentials')
		.delete()
		.eq('user_id', userId);

	if (legacyUserIdError && !isMissingSchemaError(legacyUserIdError)) {
		logCleanupIssue('required', 'user_credentials', 'user_id', legacyUserIdError);
	}

	return idError && !isMissingSchemaError(idError)
		? safeCleanupFailure('user_credentials', 'id', idError)
		: legacyUserIdError && !isMissingSchemaError(legacyUserIdError)
			? safeCleanupFailure('user_credentials', 'user_id', legacyUserIdError)
			: null;
}

function failuresFromSettled(results: PromiseSettledResult<CleanupFailure | null>[]) {
	return results.flatMap((result) => {
		if (result.status === 'rejected') {
			return [{ table: 'unknown', column: 'unknown', message: 'Cleanup failed' }];
		}
		return result.value ? [result.value] : [];
	});
}

async function selectRowsByEquality(table: string, columns: string, column: string, value: string) {
	const rows: any[] = [];
	for (let from = 0; ; from += SELECT_PAGE_SIZE) {
		const { data, error } = await (adminClient as any)
			.from(table)
			.select(columns)
			.eq(column, value)
			.range(from, from + SELECT_PAGE_SIZE - 1);
		if (error) return { data: rows, error };
		rows.push(...(data ?? []));
		if (!data || data.length < SELECT_PAGE_SIZE) return { data: rows, error: null };
	}
}

async function selectRowsByValues(table: string, columns: string, column: string, values: string[]) {
	const rows: any[] = [];
	for (let index = 0; index < values.length; index += DELETE_IN_CHUNK_SIZE) {
		const chunk = values.slice(index, index + DELETE_IN_CHUNK_SIZE);
		for (let from = 0; ; from += SELECT_PAGE_SIZE) {
			const { data, error } = await (adminClient as any)
				.from(table)
				.select(columns)
				.in(column, chunk)
				.range(from, from + SELECT_PAGE_SIZE - 1);
			if (error) return { data: rows, error };
			rows.push(...(data ?? []));
			if (!data || data.length < SELECT_PAGE_SIZE) break;
		}
	}
	return { data: rows, error: null };
}

export async function deleteAccountData(userId: string) {
	const requiredCleanupFailures: CleanupFailure[] = [];

	const { data: ownedGroups, error: groupLookupError } = await selectRowsByEquality(
		'focus_groups',
		'id, board_id',
		'created_by',
		userId
	);

	if (groupLookupError && !isMissingSchemaError(groupLookupError)) {
		logCleanupIssue('required', 'focus_groups', 'created_by', groupLookupError);
		requiredCleanupFailures.push(safeCleanupFailure('focus_groups', 'created_by', groupLookupError));
	}

	const ownedGroupIds = (ownedGroups ?? [])
		.map((group: { id?: string }) => group.id)
		.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
	const ownedGroupBoardIds = (ownedGroups ?? [])
		.map((group: { board_id?: string }) => group.board_id)
		.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

	const { data: ownedBoards, error: boardLookupError } = await selectRowsByEquality(
		'boards',
		'id',
		'created_by',
		userId
	);

	if (boardLookupError && !isMissingSchemaError(boardLookupError)) {
		logCleanupIssue('required', 'boards', 'created_by', boardLookupError);
		requiredCleanupFailures.push(safeCleanupFailure('boards', 'created_by', boardLookupError));
	}

	const ownedBoardIds = Array.from(new Set([
		...ownedGroupBoardIds,
		...(ownedBoards ?? [])
			.map((board: { id?: string }) => board.id)
			.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
	]));

	const { data: ownedGroupFocusSessions, error: groupSessionLookupError } = ownedGroupIds.length > 0
		? await selectRowsByValues('group_focus_sessions', 'id', 'group_id', ownedGroupIds)
		: { data: [], error: null };

	if (groupSessionLookupError && !isMissingSchemaError(groupSessionLookupError)) {
		logCleanupIssue('required', 'group_focus_sessions', 'group_id', groupSessionLookupError);
		requiredCleanupFailures.push(safeCleanupFailure('group_focus_sessions', 'group_id', groupSessionLookupError));
	}

	const ownedGroupFocusSessionIds = (ownedGroupFocusSessions ?? [])
		.map((session: { id?: string }) => session.id)
		.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

	const { data: amberSessions, error: sessionLookupError } = await selectRowsByEquality(
		'amber_sessions',
		'id',
		'user_id',
		userId
	);

	if (sessionLookupError) {
		if (!isMissingSchemaError(sessionLookupError)) {
			logCleanupIssue('required', 'amber_sessions', 'user_id', sessionLookupError);
			requiredCleanupFailures.push(safeCleanupFailure('amber_sessions', 'user_id', sessionLookupError));
		}
	}

	const amberSessionIds = (amberSessions ?? []).map((session: { id: string }) => session.id);
	if (amberSessionIds.length > 0) {
		const taskDeleteError = await deleteRowsByValues('amber_tasks', 'session_id', amberSessionIds);
		if (taskDeleteError) {
			requiredCleanupFailures.push(taskDeleteError);
		}
	}

	const requiredCleanupResults = [
		...(await deleteRowsByValuesInParallel([['group_session_participants', 'session_id']] as const, ownedGroupFocusSessionIds)),
		...(await deleteRowsByValuesInParallel(OWNED_FOCUS_GROUP_CHILD_TABLES, ownedGroupIds)),
		...(await deleteRowsByValuesInParallel(OWNED_BOARD_CHILD_TABLES, ownedBoardIds)),
		...(await deleteRowsInParallel(USER_RELATIONSHIP_TABLES, userId, deleteRowsByUserId)),
		...(await deleteRowsInParallel(USER_OWNED_TABLES, userId, deleteRowsByUserId)),
		...(await deleteRowsInParallel(USER_PARENT_TABLES, userId, deleteRowsByUserId)),
		...(await Promise.allSettled([
			deleteUserCredentials(userId),
			deleteRowsByUserId('amber_sessions', 'user_id', userId)
		]))
	];
	requiredCleanupFailures.push(...failuresFromSettled(requiredCleanupResults));

	const noteGroupError = await deleteRowsByUserId('note_groups', 'user_id', userId);
	if (noteGroupError) requiredCleanupFailures.push(noteGroupError);

	await Promise.allSettled([
		...(await deleteRowsInParallel(OPTIONAL_USER_CHILD_TABLES, userId, deleteOptionalRowsByUserId)),
		...(await deleteRowsInParallel(
			OPTIONAL_COLLABORATION_CHILD_TABLES,
			userId,
			deleteOptionalRowsByUserId
		)),
		...(await deleteRowsInParallel(
			OPTIONAL_COLLABORATION_PARENT_TABLES,
			userId,
			deleteOptionalRowsByUserId
		))
	]);

	const profileError = await deleteRowsByUserId('profiles', 'id', userId);
	if (profileError) requiredCleanupFailures.push(profileError);

	return requiredCleanupFailures;
}

export async function deleteUserAccount(userId: string) {
	const cleanupFailures = await deleteAccountData(userId);
	if (cleanupFailures.length > 0) {
		console.warn('[account:delete] Required cleanup failed; auth user was not deleted.');
		return {
			error: new Error('Required account cleanup failed. Auth user was not deleted.')
		};
	}

	const { error } = await adminClient.auth.admin.deleteUser(userId);
	return { error };
}
