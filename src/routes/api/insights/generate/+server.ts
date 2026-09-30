import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { DEEPSEEK_API_KEY } from '$env/static/private';
import { readBoundedJsonBody, readBoundedJsonResponse, RequestBodyError } from '$lib/server/requestBody';
import { browserCorsHeaders, browserCorsOptions } from '$lib/server/browserCors';

const MAX_REQUEST_BODY_LENGTH = 4_000;
const MAX_AI_TEXT_LENGTH = 4_000;
const MAX_AI_RESPONSE_LENGTH = 32_000;
const OUTBOUND_FETCH_TIMEOUT_MS = 8_000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function responseHeaders(request: Request): HeadersInit {
    return browserCorsHeaders(request);
}

export const POST = async ({ request, locals: { getAuthenticatedSupabase, session } }: RequestEvent) => {
    const headers = responseHeaders(request);
    try {
        if (!session) {
            return json({ error: 'Unauthorized' }, { status: 401, headers });
        }

        const supabase = await getAuthenticatedSupabase();

        const body = await readBoundedJsonBody<{ sessionId?: unknown }>(request, MAX_REQUEST_BODY_LENGTH);
        const { sessionId } = body;
        const safeSessionId = typeof sessionId === 'string' ? sessionId.trim() : '';

        if (!safeSessionId) {
            return json({ error: 'Missing sessionId' }, { status: 400, headers });
        }
        if (!UUID_RE.test(safeSessionId)) {
            return json({ error: 'Invalid sessionId' }, { status: 400, headers });
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
            .eq('id', safeSessionId)
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (fetchError || !amberSession) {
            return json({ error: 'Session not found' }, { status: 404, headers });
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
        }, { headers });

    } catch (err: any) {
        if (err instanceof RequestBodyError) {
            return json({
                error: err.status === 413 ? 'Request body too large' : 'Invalid JSON body'
            }, { status: err.status, headers });
        }
        console.error('[insights/generate] Error');
        return json({ error: 'Failed to generate insights' }, { status: 500, headers });
    }
};

export const OPTIONS = async ({ request }: RequestEvent) => browserCorsOptions(request);

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
${i + 1}. ${safeAIText(t.title, 160)} (Est: ${t.estimated_minutes}m${t.start_time && t.end_time ? `, Actual: ${Math.round((new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 60000)}m` : ', Not started'})
${t.description ? `   Details: ${safeAIText(t.description, 600)}` : ''}`).join('\n');

    const prompt = `Analyze this focus session and provide actionable insights:

**Session:** ${safeAIText(session.display_title, 160)}
**Original Note:** ${safeAIText(session.raw_text, MAX_AI_TEXT_LENGTH)}
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
            }),
            signal: AbortSignal.timeout(OUTBOUND_FETCH_TIMEOUT_MS)
        });

        if (!res.ok) {
            console.error('[generateAIInsights] DeepSeek error');
            return null;
        }

        const completion = await readBoundedJsonResponse<unknown>(res, MAX_AI_RESPONSE_LENGTH);
        if (!completion || typeof completion !== 'object') return null;
        const choices = (completion as { choices?: unknown }).choices;
        if (!Array.isArray(choices)) return null;
        const firstChoice = choices[0];
        if (!firstChoice || typeof firstChoice !== 'object') return null;
        const message = (firstChoice as { message?: unknown }).message;
        if (!message || typeof message !== 'object') return null;
        const content = (message as { content?: unknown }).content;
        return typeof content === 'string' ? safeAIText(content, MAX_AI_TEXT_LENGTH) : null;
    } catch {
        console.error('[generateAIInsights] Error');
        return null;
    }
}

function safeAIText(value: string, maxLength: number): string {
    return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
