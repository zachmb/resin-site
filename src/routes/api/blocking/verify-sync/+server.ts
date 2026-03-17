import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify cross-blocking status between web and iOS
 * Returns the current state of blocked domains and their sync status
 */
export const POST: RequestHandler = async ({ request }) => {
    try {
        const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { userId } = await request.json();

        if (!userId) {
            return json(
                { error: 'Missing userId' },
                { status: 400 }
            );
        }

        // Fetch full profile data
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('blocked_domains, blocking_enabled, extension_enabled, updated_at')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching profile:', error);
            return json(
                { error: 'Failed to verify blocking status' },
                { status: 500 }
            );
        }

        // Get total blocking sessions scheduled
        const { count: sessionCount } = await supabase
            .from('blocking_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('end_time', new Date().toISOString());

        // Calculate sync score (0-100)
        const blockedDomainsScore = (profile?.blocked_domains?.length || 0) > 0 ? 25 : 0;
        const blockingEnabledScore = profile?.blocking_enabled ? 25 : 0;
        const extensionEnabledScore = profile?.extension_enabled ? 25 : 0;
        const hasSessionsScore = (sessionCount || 0) > 0 ? 25 : 0;
        const syncScore = blockedDomainsScore + blockingEnabledScore + extensionEnabledScore + hasSessionsScore;

        return json({
            status: 'synced',
            syncScore,
            blockedDomains: {
                count: profile?.blocked_domains?.length || 0,
                domains: profile?.blocked_domains || []
            },
            settings: {
                blockingEnabled: profile?.blocking_enabled || false,
                extensionEnabled: profile?.extension_enabled || false
            },
            sessions: {
                active: sessionCount || 0
            },
            lastUpdated: profile?.updated_at,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Error verifying blocking sync:', err);
        return json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
};
