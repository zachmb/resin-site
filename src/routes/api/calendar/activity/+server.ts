/**
 * Calendar Activity Endpoint
 *
 * GET /api/calendar/activity?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns daily_activity records for the given date range.
 * Removes the need for direct Supabase calls from the calendar component.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = {
	'Cache-Control': 'no-store, max-age=0',
	Pragma: 'no-cache'
};
const MAX_DATE_RANGE_DAYS = 366;
const ACTIVITY_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser();

	if (!user || authError) {
		return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
	}

	// Parse query parameters
	const startStr = url.searchParams.get('start');
	const endStr = url.searchParams.get('end');

	if (!startStr || !endStr) {
		return json(
			{ error: 'Missing required query parameters: start, end' },
			{ status: 400, headers: NO_STORE_HEADERS }
		);
	}

	// Validate date format
	if (!ACTIVITY_DATE_RE.test(startStr) || !ACTIVITY_DATE_RE.test(endStr)) {
		return json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400, headers: NO_STORE_HEADERS });
	}
	const startDate = new Date(`${startStr}T00:00:00.000Z`);
	const endDate = new Date(`${endStr}T00:00:00.000Z`);
	const rangeDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
	if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || rangeDays < 1 || rangeDays > MAX_DATE_RANGE_DAYS) {
		return json({ error: 'Date range must be valid and no longer than one year' }, { status: 400, headers: NO_STORE_HEADERS });
	}

	try {
		const { data: activities, error } = await supabase
			.from('daily_activity')
			.select('activity_date, focus_minutes, amber_plans_completed, notes_created, stones_earned')
			.eq('user_id', user.id)
			.gte('activity_date', startStr)
			.lte('activity_date', endStr)
			.order('activity_date', { ascending: false })
			.limit(MAX_DATE_RANGE_DAYS);

		if (error) {
			console.error('[calendar/activity] Query error');
			return json({ error: 'Failed to fetch activity data' }, { status: 500, headers: NO_STORE_HEADERS });
		}

		return json({
			activities: activities || []
		}, { headers: NO_STORE_HEADERS });
	} catch {
		console.error('[calendar/activity] Unexpected error');
		return json({ error: 'Internal server error' }, { status: 500, headers: NO_STORE_HEADERS });
	}
};
