import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const userId = 'd12907e1-c65b-466e-b878-bc004b944dbb'; // One of the valid IDs
    console.log(`Testing insert for user ${userId}...`);

    const { data, error } = await supabase
        .from('amber_sessions')
        .insert({
            user_id: userId,
            raw_text: 'Test note from investigator',
            display_title: 'Investigator Note',
            status: 'draft',
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) {
        console.error('Insert failed:', error);
    } else {
        console.log('Insert successful:', data.id);
        // Now try to delete it to clean up
        await supabase.from('amber_sessions').delete().eq('id', data.id);
    }
}
run();
