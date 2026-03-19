import { json, error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { DEEPSEEK_API_KEY } from '$env/static/private';

export const POST = async ({ request, locals: { supabase, session } }: RequestEvent) => {
    try {
        if (!session) {
            return error(401, 'Unauthorized');
        }

        const body = await request.json();
        const { sessionId } = body;

        if (!sessionId) {
            return error(400, 'Missing sessionId');
        }

        // Fetch the amber session with full details
        const { data: amberSession, error: fetchError } = await supabase
            .from('amber_sessions')
            .select(`
                id,
                display_title,
                raw_text,
                status,
                created_at,
                amber_tasks(
                    title,
                    estimated_minutes,
                    start_time,
                    end_time,
                    description
                )
            `)
            .eq('id', sessionId)
            .eq('user_id', session.user.id)
            .single();

        if (fetchError || !amberSession) {
            return error(404, 'Session not found');
        }

        // Calculate actual time spent
        const tasks = (amberSession.amber_tasks as any[]) || [];
        const insightsData = generateInsights(amberSession as any, tasks);

        // Call DeepSeek to generate AI insights
        const aiInsights = await generateAIInsights(amberSession as any, tasks, insightsData);

        return json({
            success: true,
            insights: insightsData,
            aiInsights
        });

    } catch (err: any) {
        console.error('[insights/generate] Error:', err);
        return error(500, 'Failed to generate insights');
    }
};

interface Task {
    title: string;
    estimated_minutes: number;
    start_time: string | null;
    end_time: string | null;
    description?: string;
}

interface MiniSession {
    display_title: string;
    raw_text: string;
    status: string;
    created_at: string;
}

function generateInsights(session: MiniSession, tasks: Task[]) {
    let totalEstimated = 0;
    let totalActual = 0;
    let completedTasks = 0;

    tasks.forEach(task => {
        totalEstimated += task.estimated_minutes;
        if (task.start_time && task.end_time) {
            const start = new Date(task.start_time).getTime();
            const end = new Date(task.end_time).getTime();
            const actual = Math.round((end - start) / 60000);
            totalActual += actual;
            completedTasks++;
        }
    });

    const accuracy = completedTasks > 0
        ? Math.round((totalActual / totalEstimated) * 100)
        : 0;

    return {
        totalEstimated,
        totalActual,
        completedTasks,
        accuracy,
        taskCount: tasks.length,
        status: session.status
    };
}

async function generateAIInsights(session: MiniSession, tasks: Task[], metrics: any) {
    const taskSummary = tasks.map((t, i) => `
${i + 1}. ${t.title} (Est: ${t.estimated_minutes}m${t.start_time && t.end_time ? `, Actual: ${Math.round((new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 60000)}m` : ', Not started'})
${t.description ? `   Details: ${t.description}` : ''}`).join('\n');

    const prompt = `Analyze this focus session and provide actionable insights:

**Session:** ${session.display_title}
**Original Note:** ${session.raw_text}
**Status:** ${session.status}

**Task Breakdown:**
${taskSummary}

**Summary:**
- Total Time Estimated: ${metrics.totalEstimated}m
- Total Time Actual: ${metrics.totalActual}m
- Tasks Completed: ${metrics.completedTasks}/${metrics.taskCount}
- Accuracy: ${metrics.accuracy}%

Please provide 2-3 brief, actionable insights about:
1. What went well in this session
2. One key area for improvement
3. A specific tip for next time

Keep each insight to 1-2 sentences. Be encouraging but honest.`;

    try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a productivity coach providing brief, actionable insights on focus sessions. Be encouraging, specific, and practical.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!res.ok) {
            console.error('[generateAIInsights] DeepSeek error:', await res.text());
            return null;
        }

        const completion = await res.json();
        return completion.choices?.[0]?.message?.content || null;
    } catch (err) {
        console.error('[generateAIInsights] Error:', err);
        return null;
    }
}
