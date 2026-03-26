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

export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;

	const {
		data: { user },
		error: authError
	} = await supabase.auth.getUser();

	if (!user || authError) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Parse query parameters
	const startStr = url.searchParams.get('start');
	const endStr = url.searchParams.get('end');

	if (!startStr || !endStr) {
		return json(
			{ error: 'Missing required query parameters: start, end' },
			{ status: 400 }
		);
	}

	// Validate date format
	if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
		return json({ error: 'Invalid date format (use YYYY-MM-DD)' }, { status: 400 });
	}

	try {
		const { data: activities, error } = await supabase
			.from('daily_activity')
			.select('*')
			.eq('user_id', user.id)
			.gte('activity_date', startStr)
			.lte('activity_date', endStr)
			.order('activity_date', { ascending: false });

		if (error) {
			console.error('[calendar/activity] Query error:', error);
			return json({ error: 'Failed to fetch activity data' }, { status: 500 });
		}

		return json({
			activities: activities || [],
			user_id: user.id
		});
	} catch (err) {
		console.error('[calendar/activity] Unexpected error:', err);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
