import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("Investigating profiles table...");
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching profile:', error);
    } else {
        console.log('Sample Profile Columns:', Object.keys(profile));
        console.log('Sample Profile Data:', profile);
    }

    // Check for RCP triggers or functions related to profiles
    const { data: rpcResp, error: rpcError } = await supabase.rpc('get_table_info', { table_name: 'profiles' });
    if (rpcError) {
        console.log('RPC get_table_info not available (expected if not custom)');
    } else {
        console.log('Table Info:', rpcResp);
    }
}
run();
