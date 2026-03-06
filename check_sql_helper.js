import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("Checking for SQL execution helper...");
    try {
        const { data, error } = await supabase.rpc('exec', { sql: 'SELECT 1' });
        if (error) {
            console.log("RPC 'exec' failed or missing:", error.message);
        } else {
            console.log("RPC 'exec' exists!");
            return;
        }

        const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
        if (error2) {
            console.log("RPC 'exec_sql' failed or missing:", error2.message);
        } else {
            console.log("RPC 'exec_sql' exists!");
            return;
        }
    } catch (e) {
        console.error("Error during check:", e);
    }
}
run();
