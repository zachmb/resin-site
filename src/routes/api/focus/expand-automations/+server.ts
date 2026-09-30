import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const NO_STORE_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    Pragma: 'no-cache'
};
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MAX_DURATION_MINUTES = 24 * 60;
const MAX_ENABLED_AUTOMATIONS = 50;
const MAX_SESSIONS_TO_CREATE = 200;

export const POST: RequestHandler = async ({ locals: { getAuthenticatedSupabase, session }, setHeaders }) => {
    setHeaders({
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'pragma': 'no-cache',
        'expires': '0'
    });

    try {
        if (!session) {
            return json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE_HEADERS });
        }

        const supabase = await getAuthenticatedSupabase();

        // Fetch all enabled automations for this user
        const { data: automations, error: fetchError } = await supabase
            .from('focus_automations')
            .select('id, title, time, days_of_week, duration_minutes')
            .eq('user_id', session.user.id)
            .eq('enabled', true)
            .limit(MAX_ENABLED_AUTOMATIONS + 1);

        if (fetchError) throw fetchError;

        if (!automations || automations.length === 0) {
            return json({ success: true, expanded: 0 }, { headers: NO_STORE_HEADERS });
        }
        if (automations.length > MAX_ENABLED_AUTOMATIONS) {
            return json({ error: 'Too many enabled automations to expand at once' }, { status: 413, headers: NO_STORE_HEADERS });
        }

        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const sessionsToCreate: any[] = [];

        // Expand each automation into blocking_sessions for the next 7 days
        for (const automation of automations) {
            // Parse time "HH:MM"
            const timeMatch = typeof automation.time === 'string' ? TIME_RE.exec(automation.time) : null;
            const durationMinutes = Number(automation.duration_minutes);
            if (!timeMatch || !Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
                console.warn('[focus/expand-automations] Skipping invalid automation');
                continue;
            }
            const hours = Number(timeMatch[1]);
            const minutes = Number(timeMatch[2]);

            // Parse days of week
            const dayMap: { [key: string]: number } = {
                'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
                'Friday': 5, 'Saturday': 6, 'Sunday': 0
            };

            const targetDays = automation.days_of_week
                .split(',')
                .map((day: string) => dayMap[day.trim()])
                .filter((d: number) => d !== undefined);

            // Generate sessions for next 7 days
            let currentDate = new Date(now);
            currentDate.setHours(0, 0, 0, 0);

            while (currentDate <= sevenDaysLater) {
                const dayOfWeek = currentDate.getDay();

                if (targetDays.includes(dayOfWeek)) {
                    // Create start time
                    const startTime = new Date(currentDate);
                    startTime.setHours(hours, minutes, 0, 0);

                    // Skip if start time is in the past
                    if (startTime > now && sessionsToCreate.length < MAX_SESSIONS_TO_CREATE) {
                        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

                        // Check if this session already exists (avoid duplicates)
                        const { data: existing, error: existingError } = await supabase
                            .from('blocking_sessions')
                            .select('id')
                            .eq('user_id', session.user.id)
                            .eq('title', automation.title)
                            .gte('start_time', startTime.toISOString())
                            .lt('start_time', new Date(startTime.getTime() + 60 * 1000).toISOString())
                            .maybeSingle();

                        if (existingError) {
                            console.warn('[focus/expand-automations] Duplicate check failed');
                            continue;
                        }

                        // Only create if this specific session doesn't exist
                        if (!existing) {
                            sessionsToCreate.push({
                                user_id: session.user.id,
                                title: automation.title,
                                start_time: startTime.toISOString(),
                                end_time: endTime.toISOString(),
                                is_active: true,
                                device_scheduled: false
                            });
                        }
                    }
                }

                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        // Batch insert sessions
        if (sessionsToCreate.length > 0) {
            const { error: insertError } = await supabase
                .from('blocking_sessions')
                .insert(sessionsToCreate);

            if (insertError) {
                // Some inserts may fail due to duplicates from iOS, which is fine
                console.warn('[focus/expand-automations] Some blocking sessions may already exist');
            }
        }

        return json({
            success: true,
            automations: automations.length,
            expanded: sessionsToCreate.length
        }, { headers: NO_STORE_HEADERS });
    } catch {
        console.error('Error expanding automations');
        return json({ error: 'Failed to expand focus automations' }, { status: 500, headers: NO_STORE_HEADERS });
    }
};
