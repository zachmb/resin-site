import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("Fetching table definition...");
    const { data, error } = await supabase
        .from('amber_sessions')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Core Table Error:', error);
    } else if (data && data.length > 0) {
        console.log('Columns found from existing data:', Object.keys(data[0]));
    } else {
        console.log('Table exists but is empty.');
        // Try to insert a dummy to see what columns fail
        const dummy = { user_id: '00000000-0000-0000-0000-000000000000', raw_text: 'test' };
        const { error: insertError } = await supabase
            .from('amber_sessions')
            .insert(dummy);
        console.log('Insert Error (test raw_text):', insertError);
    }
}
run();
