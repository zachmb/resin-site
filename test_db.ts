import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
    const isMissingColumnError = (error: any) => {
        if (!error) return false;
        return error.code === 'PGRST204' || String(error.message || '').includes("Could not find");
    };

    const row = {
        user_id: '43eb2c5b-3b69-45eb-8924-f5ad0e2de744', // random uuid structure
        title: 'test note',
        content: 'testing save',
        created_at: new Date().toISOString()
    };

    const preferred = await supabase
        .from('amber_sessions')
        .insert({
            user_id: row.user_id,
            raw_text: row.content,
            display_title: row.title,
            status: 'draft',
            created_at: row.created_at
        })
        .select()
        .single();

    console.log('Preferred approach result:', preferred.error);

    if (preferred.error && !isMissingColumnError(preferred.error)) {
        console.log('Not a missing column error according to isMissingColumnError! Error code:', preferred.error.code, 'Message:', preferred.error.message);
    }
}
run();
