import { supabase } from './src/lib/supabase';
async function testSchema() {
  const { data, error } = await supabase.from('prospects').select('id, gm_name, player_name').limit(5);
  console.log(data);
}
testSchema();
