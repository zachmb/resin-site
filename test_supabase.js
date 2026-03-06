import { createClient } from '@supabase/supabase-js';

import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('amber_sessions')
    .select('*')
    .limit(1);

  console.log('Data columns:', data ? Object.keys(data[0] || {}) : 'No data');
  console.log('Error:', error);
}
test();
