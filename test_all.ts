import { supabase } from './src/lib/supabase';

async function testAllProspects() {
  const { data } = await supabase.from('prospects').select('id, player_name, promoted');
  console.log('All prospects promoted status:', data);
}
testAllProspects();
