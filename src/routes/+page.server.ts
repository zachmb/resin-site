import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';

const extractTitle = (content: string) => {
    if (!content || !content.trim()) return '';
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed !== '#') {
            return trimmed.replace(/^#+\s*/, '').substring(0, 60);
        }
    }
    return '';
};

const insertNote = async (supabase: any, row: { user_id: string; title: string; content: string; created_at: string }) => {
    const result = await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            status: 'draft',
            created_at: row.created_at
        })
        .select()
        .single();

    if (!result.error) return result;

    // Fallback for older schema
    console.warn('[home] Preferred schema insert failed, trying fallback...', result.error.message);
    return await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            content: row.content,
            title: row.title,
            status: 'draft',
            created_at: row.created_at
        })
        .select()
        .single();
};

export const load: PageServerLoad = async ({ locals }) => {
    const session = await locals.getSession();

    if (!session) {
        return {
            session: null,
            profile: null,
            recentNotes: [],
            todayTasks: [],
            weeklyStats: null,
            automations: [],
        };
    }

    const userId = session.user.id;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    // Week boundaries for heatmap
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 6);
    startOfWeek.setHours(0, 0, 0, 0);

    // 1. Profile
    const { data: profile } = await locals.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    // 2. Recent Notes (amber_sessions)
    const { data: recentNotes } = await locals.supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);

    // 3. Today's Tasks
    const { data: todayTasks } = await locals.supabase
        .from('amber_tasks')
        .select(`
            *,
            amber_sessions!inner(user_id)
        `)
        .eq('amber_sessions.user_id', userId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .order('start_time', { ascending: true });

    // 4. All sessions this week (for heatmap + stats)
    const { data: weekSessions } = await locals.supabase
        .from('amber_sessions')
        .select('id, display_title, status, created_at')
        .eq('user_id', userId)
        .gte('created_at', startOfWeek.toISOString())
        .order('created_at', { ascending: true });

    // 5. All tasks this week (for focus minutes)
    const { data: weekTasks } = await locals.supabase
        .from('amber_tasks')
        .select('id, title, estimated_minutes, requires_focus, start_time, end_time, amber_sessions!inner(user_id)')
        .eq('amber_sessions.user_id', userId)
        .gte('start_time', startOfWeek.toISOString())
        .order('start_time', { ascending: true });

    // 6. Recent feedback (for taste insights)
    const { data: feedback } = await locals.supabase
        .from('amber_task_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    // 7. Focus automations
    const { data: automations } = await locals.supabase
        .from('focus_automations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    // Build weekly stats
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmap: { day: string; date: string; sessions: number; focusMinutes: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const daySessions = (weekSessions || []).filter((s: any) => s.created_at?.startsWith(dateStr));
        const dayTasks = (weekTasks || []).filter((t: any) => t.start_time?.startsWith(dateStr));
        const focusMins = dayTasks.reduce((sum: number, t: any) => sum + (t.estimated_minutes || 0), 0);
        heatmap.push({
            day: dayNames[d.getDay()],
            date: dateStr,
            sessions: daySessions.length,
            focusMinutes: focusMins,
        });
    }

    const totalFocusMinutes = heatmap.reduce((s, d) => s + d.focusMinutes, 0);
    const totalSessions = (weekSessions || []).length;
    const scheduledPlans = (weekSessions || []).filter((s: any) => s.status === 'scheduled').length;

    // Extract taste signals from feedback
    const feelingCounts: Record<string, number> = {};
    const enjoyedThings: string[] = [];
    for (const fb of (feedback || [])) {
        const comments = fb.comments || '';
        const feelingMatch = comments.match(/feeling:(\S+)/);
        if (feelingMatch) {
            feelingCounts[feelingMatch[1]] = (feelingCounts[feelingMatch[1]] || 0) + 1;
        }
        const enjoyedMatch = comments.match(/enjoyed:(.+)/);
        if (enjoyedMatch) {
            enjoyedThings.push(enjoyedMatch[1].trim());
        }
    }

    const avgRating = (feedback || []).length > 0
        ? (feedback || []).reduce((s: number, f: any) => s + (f.rating || 0), 0) / (feedback || []).length
        : 0;

    const weeklyStats = {
        heatmap,
        totalFocusMinutes,
        totalSessions,
        scheduledPlans,
        avgRating: Math.round(avgRating * 10) / 10,
        topFeeling: Object.entries(feelingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
        feelingCounts,
        enjoyedThings: enjoyedThings.slice(0, 5),
        feedbackCount: (feedback || []).length,
    };

    // Check if user has visited the web app before
    const isNewUser = !profile?.web_onboarded;

    return {
        session,
        profile,
        recentNotes: recentNotes || [],
        todayTasks: todayTasks || [],
        weeklyStats,
        automations: automations || [],
        isNewUser,
    };
};

export const actions: Actions = {
    quickNote: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const content = data.get('content')?.toString() || '';

        if (!content.trim()) {
            return fail(400, { error: 'Note content cannot be empty' });
        }

        const title = extractTitle(content);
        const { data: note, error } = await insertNote(supabase, {
            user_id: session.user.id,
            title: title,
            content: content,
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error('Error creating note:', error);
            return fail(500, { error: 'Failed to create note' });
        }

        throw redirect(303, `/notes?id=${note.id}`);
    },

    quickSchedule: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const content = data.get('content')?.toString() || '';

        if (!content.trim()) {
            return fail(400, { error: 'Note content cannot be empty' });
        }

        const title = extractTitle(content);
        const { data: note, error } = await insertNote(supabase, {
            user_id: session.user.id,
            title: title,
            content: content,
            created_at: new Date().toISOString()
        });

        if (error) {
            console.error('Error creating note:', error);
            return fail(500, { error: 'Failed to create note' });
        }

        throw redirect(303, `/amber`);
    },

    createAutomation: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const title = data.get('title')?.toString() || '';
        const time = data.get('time')?.toString() || '';
        const duration = parseInt(data.get('duration')?.toString() || '25');
        const daysOfWeek = data.get('daysOfWeek')?.toString() || '';

        if (!title || !time || !daysOfWeek) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            const { data: automation, error } = await supabase
                .from('focus_automations')
                .insert({
                    user_id: session.user.id,
                    title: title,
                    time: time,
                    duration_minutes: duration,
                    days_of_week: daysOfWeek,
                    enabled: true
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, automation };
        } catch (err) {
            console.error('Error creating automation:', err);
            return fail(500, { error: String(err) });
        }
    },

    deleteAutomation: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const automationId = data.get('automationId')?.toString();

        if (!automationId) return fail(400, { error: 'Missing automation ID' });

        try {
            const { error } = await supabase
                .from('focus_automations')
                .delete()
                .eq('id', automationId)
                .eq('user_id', session.user.id);

            if (error) throw error;

            return { success: true };
        } catch (err) {
            console.error('Error deleting automation:', err);
            return fail(500, { error: String(err) });
        }
    },

    markWebOnboarded: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ web_onboarded: true })
                .eq('id', session.user.id);

            if (error) throw error;
            return { success: true };
        } catch (err) {
            console.error('Error marking web onboarded:', err);
            return fail(500, { error: String(err) });
        }
    }
};
