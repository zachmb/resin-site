import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    console.log("Starting test...");
    const isMissingColumnError = (error) => {
        if (!error) return false;
        return error.code === 'PGRST204' || String(error.message || '').includes("Could not find");
    };

    const row = {
        user_id: '43eb2c5b-3b69-45eb-8924-f5ad0e2de744',
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

    console.log('Preferred approach error:', preferred.error);

    if (preferred.error && !isMissingColumnError(preferred.error)) {
        console.log('NOT CAUGHT BY isMissingColumnError! Code:', preferred.error.code, 'Msg:', preferred.error.message);
    } else if (preferred.error) {
        console.log('Caught by isMissingColumnError');
    }

    // also test update with undefined id
    const updateErr = await supabase
        .from('amber_sessions')
        .update({ raw_text: row.content, display_title: row.title })
        .eq('id', 'undefined')
        .eq('user_id', row.user_id)
        .select()
        .single();

    console.log('Update with id=undefined error:', updateErr.error);
}
run();
