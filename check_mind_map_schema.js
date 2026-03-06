import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("Checking amber_sessions for mind map columns...");
    const { data: sessionData, error: sessionError } = await supabase.from('amber_sessions').select('*').limit(1);
    if (sessionError) {
        console.error("amber_sessions error:", sessionError);
    } else if (sessionData && sessionData.length > 0) {
        console.log("amber_sessions columns:", Object.keys(sessionData[0]));
    }

    console.log("\nChecking mind_map_edges table...");
    const { data: edgeData, error: edgeError } = await supabase.from('mind_map_edges').select('*').limit(1);
    if (edgeError) {
        console.error("mind_map_edges error (might not exist):", edgeError);
    } else {
        console.log("mind_map_edges exists. Columns:", edgeData.length > 0 ? Object.keys(edgeData[0]) : "Empty table, but exists.");
    }
}
run();
