import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals: { supabase, getSession } }) => {
    try {
        const session = await getSession();
        if (!session) {
            return json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch all enabled automations for this user
        const { data: automations, error: fetchError } = await supabase
            .from('focus_automations')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('enabled', true);

        if (fetchError) throw fetchError;

        if (!automations || automations.length === 0) {
            return json({ success: true, expanded: 0 });
        }

        const now = new Date();
        const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const sessionsToCreate: any[] = [];

        // Expand each automation into blocking_sessions for the next 7 days
        for (const automation of automations) {
            // Parse time "HH:MM"
            const [hours, minutes] = automation.time.split(':').map(Number);

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
                    if (startTime > now) {
                        const endTime = new Date(startTime.getTime() + automation.duration_minutes * 60 * 1000);

                        // Check if this session already exists (avoid duplicates)
                        const { data: existing } = await supabase
                            .from('blocking_sessions')
                            .select('id')
                            .eq('user_id', session.user.id)
                            .eq('title', automation.title)
                            .gte('start_time', startTime.toISOString())
                            .lt('start_time', new Date(startTime.getTime() + 60 * 1000).toISOString())
                            .single();

                        // Only create if this specific session doesn't exist
                        if (!existing) {
                            sessionsToCreate.push({
                                user_id: session.user.id,
                                title: automation.title,
                                start_time: startTime.toISOString(),
                                end_time: endTime.toISOString(),
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
                console.warn('Some blocking sessions may have already been created:', insertError);
            }
        }

        return json({
            success: true,
            automations: automations.length,
            expanded: sessionsToCreate.length
        });
    } catch (error) {
        console.error('Error expanding automations:', error);
        return json({ error: String(error) }, { status: 500 });
    }
};
