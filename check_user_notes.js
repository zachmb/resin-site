import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const userId = '5d839b9a-3b2a-4ed6-ad18-68a23d12c24d'; // User from browser test
    console.log(`Checking notes for user ${userId}...`);

    const { data, error } = await supabase
        .from('amber_sessions')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${data.length} notes.`);
        data.forEach(n => console.log(`- ID: ${n.id}, Title: ${n.display_title}, Status: ${n.status}`));
    }
}
run();
