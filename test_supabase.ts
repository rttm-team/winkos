import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://wltqsayrupcvcrodsjmn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_z3uOEmQzAfN8Pz4F2w5cbw_dgdIYbGJ";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data: gms } = await supabase.from('gms').select('*');
  const { data: prospects } = await supabase.from('prospects').select('*');
  console.log('GMs:', JSON.stringify(gms, null, 2));
  console.log('Prospects:', JSON.stringify(prospects?.slice(0, 2), null, 2));
}
test();
