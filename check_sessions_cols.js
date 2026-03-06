import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    const { data: notes, error } = await supabase
        .from('amber_sessions')
        .select('id, raw_text, display_title, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        process.stdout.write(JSON.stringify(error, null, 2) + '\n');
        return;
    }

    notes.forEach((n, i) => {
        const text = n.raw_text || '';
        const title = n.display_title || '';
        process.stdout.write(`[${i}] Title: "${title}" | Text: "${text.substring(0, 30).replace(/\n/g, '\\n')}"\n`);
    });
}
run();
