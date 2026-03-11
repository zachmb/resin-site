import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/login?next=/account');
	}

	const { data: profile } = await supabase
		.from('profiles')
		.select('*')
		.eq('id', session.user.id)
		.single();

	const { data: feedback } = await supabase
		.from('amber_task_feedback')
		.select('*')
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: false });

	// Process feedback (same as taste page)
	const feelingCounts: Record<string, number> = {};
	const enjoyedThings: { text: string; date: string }[] = [];
	const ratingHistory: { date: string; rating: number }[] = [];

	for (const fb of (feedback || [])) {
		if (fb.rating) {
			ratingHistory.push({
				date: new Date(fb.created_at).toISOString().split('T')[0],
				rating: fb.rating
			});
		}

		const comments = fb.comments || '';
		const feelingMatch = comments.match(/feeling:(\S+)/);
		if (feelingMatch) {
			feelingCounts[feelingMatch[1]] = (feelingCounts[feelingMatch[1]] || 0) + 1;
		}

		const enjoyedMatch = comments.match(/enjoyed:(.+)/);
		if (enjoyedMatch) {
			enjoyedThings.push({
				text: enjoyedMatch[1].trim(),
				date: new Date(fb.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
			});
		}
	}

	// Load device tokens
	const { data: deviceTokens } = await supabase
		.from('device_tokens')
		.select('device_token, platform, updated_at')
		.eq('user_id', session.user.id)
		.order('updated_at', { ascending: false });

	// Load command integrations
	const { data: commandConfigs } = await supabase
		.from('command_integrations')
		.select('id, command_type, config, enabled')
		.eq('user_id', session.user.id)
		.order('created_at', { ascending: true });

	return {
		profile,
		deviceTokens: deviceTokens || [],
		commandConfigs: commandConfigs || [],
		tasteData: {
			feelingCounts,
			enjoyedThings,
			ratingHistory: ratingHistory.reverse() // chronological
		}
	};
};

export const actions: Actions = {
    signInWithGoogle: async ({ locals: { supabase }, url }) => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${url.origin}/auth/callback?next=/account`,
                scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })

        if (error) {
            console.error(error)
            return fail(500, { error: 'Could not authenticate with Google' })
        }

        if (data.url) {
            throw redirect(303, data.url)
        }
    },

    updateProfile: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const openclaw_url = formData.get('openclaw_url') as string;
        const openclaw_api_key = formData.get('openclaw_api_key') as string;
        const availability_start = formData.get('availability_start') as string;
        const availability_end = formData.get('availability_end') as string;
        const sync_notes = formData.get('sync_notes') === 'on';
        const widget_enabled = formData.get('widget_enabled') === 'on';

        const updates = {
            id: session.user.id,
            openclaw_url,
            openclaw_api_key,
            availability_start,
            availability_end,
            sync_notes,
            widget_enabled,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) return { success: false, error: 'Failed to update preferences' };
        return { success: true };
    },

    generateToken: async ({ locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const newKey = crypto.randomUUID();

        const updates = {
            id: session.user.id,
            openclaw_api_key: newKey,
            updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase.from('profiles').upsert(updates);

        if (updateError) return { success: false, error: 'Failed to generate token' };
        return { success: true, token: newKey };
    },

    removeDevice: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const data = await request.formData();
        const token = data.get('device_token')?.toString();

        if (!token) return fail(400, { error: 'Missing device token' });

        const { error } = await supabase
            .from('device_tokens')
            .delete()
            .eq('user_id', session.user.id)
            .eq('device_token', token);

        if (error) return fail(500, { error: 'Failed to remove device' });
        return { success: true };
    },

    saveCommandConfig: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const commandType = formData.get('commandType')?.toString();
        const configJson = formData.get('config')?.toString();

        if (!commandType || !configJson) {
            return fail(400, { error: 'Missing required fields' });
        }

        try {
            const config = JSON.parse(configJson);

            const { error } = await supabase
                .from('command_integrations')
                .upsert({
                    user_id: session.user.id,
                    command_type: commandType,
                    config,
                    enabled: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,command_type'
                });

            if (error) {
                console.error('Error saving command config:', error);
                return fail(500, { error: 'Failed to save configuration' });
            }

            return { success: true };
        } catch (e) {
            console.error('Error parsing config:', e);
            return fail(400, { error: 'Invalid configuration format' });
        }
    },

    toggleCommandConfig: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const configId = formData.get('configId')?.toString();
        const enabled = formData.get('enabled') === 'true';

        if (!configId) {
            return fail(400, { error: 'Missing config ID' });
        }

        const { error } = await supabase
            .from('command_integrations')
            .update({ enabled })
            .eq('id', configId)
            .eq('user_id', session.user.id);

        if (error) return fail(500, { error: 'Failed to update configuration' });
        return { success: true };
    },

    deleteCommandConfig: async ({ request, locals: { supabase, getSession } }) => {
        const session = await getSession();
        if (!session) return fail(401, { error: 'Unauthorized' });

        const formData = await request.formData();
        const configId = formData.get('configId')?.toString();

        if (!configId) {
            return fail(400, { error: 'Missing config ID' });
        }

        const { error } = await supabase
            .from('command_integrations')
            .delete()
            .eq('id', configId)
            .eq('user_id', session.user.id);

        if (error) return fail(500, { error: 'Failed to delete configuration' });
        return { success: true };
    }
};
