import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const extractTitle = (content) => {
    if (!content || !content.trim()) return null;
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && trimmed !== '#') {
            return trimmed.replace(/^#+\s*/, '').substring(0, 60);
        }
    }
    return null;
};

async function run() {
    console.log("Fetching all notes...");
    const { data: notes, error } = await supabase
        .from('amber_sessions')
        .select('id, raw_text, display_title');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${notes.length} notes. Checking for generic titles...`);

    let updatedCount = 0;
    for (const note of notes) {
        const title = note.display_title || '';
        const content = note.raw_text || '';

        if (!title || title.toLowerCase().startsWith('untitled')) {
            const newTitle = extractTitle(content);
            if (newTitle && newTitle !== title) {
                console.log(`Updating Note ${note.id}: "${title}" -> "${newTitle}"`);
                const { error: updateErr } = await supabase
                    .from('amber_sessions')
                    .update({ display_title: newTitle })
                    .eq('id', note.id);

                if (updateErr) {
                    console.error(`Error updating note ${note.id}:`, updateErr);
                } else {
                    updatedCount++;
                }
            }
        }
    }

    console.log(`Done. Updated ${updatedCount} notes.`);
}
run();
