
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- SCREENS ---');
    const { data: screens } = await supabase.from('screens').select('id, name, screen_group, dashboard_section');
    console.log(JSON.stringify(screens, null, 2));

    console.log('\n--- TASKS (RECENT) ---');
    const { data: tasks } = await supabase
        .from('detailed_tasks')
        .select('id, screen_group, start_date, state, screen_id')
        .order('start_date', { ascending: false })
        .limit(10);
    console.log(JSON.stringify(tasks, null, 2));
}

run();
