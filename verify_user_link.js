import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const email = 'zachmb2008@gmail.com';
    console.log(`Checking user ID for ${email}...`);

    // Note: We can only check the 'profiles' table if it exists and has email
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', '5d839b9a-3b2a-4ed6-ad18-68a23d12c24d')
        .single();

    if (pError) {
        console.error('Profile check error:', pError.message);
    } else {
        console.log('Profile exists for ID 5d839b9a-3b2a-4ed6-ad18-68a23d12c24d');
    }

    // Double check the sessions for this ID
    const { data: notes, error: nError } = await supabase
        .from('amber_sessions')
        .select('id, user_id')
        .eq('user_id', '5d839b9a-3b2a-4ed6-ad18-68a23d12c24d')
        .limit(5);

    if (nError) {
        console.error('Notes check error:', nError.message);
    } else {
        console.log(`Found ${notes.length} notes for this ID.`);
    }
}
run();
