import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("Investigating amber_sessions columns (including empty ones)...");
    // Select a row and look at the keys - if it's empty, we might not see all columns
    // But we can try to insert a garbage row to see what columns exist in the definition
    // BETTER: just use the 'select' to fetch 1 row.
    const { data: sData } = await supabase.from('amber_sessions').select('*').limit(1);
    if (sData && sData.length > 0) {
        console.log('amber_sessions actual keys:', Object.keys(sData[0]));
    } else {
        console.log('amber_sessions is empty.');
    }

    console.log("\nInvestigating amber_tasks columns...");
    const { data: tData } = await supabase.from('amber_tasks').select('*').limit(1);
    if (tData && tData.length > 0) {
        console.log('amber_tasks actual keys:', Object.keys(tData[0]));
    } else {
        console.log('amber_tasks is empty.');
    }
}
run();
