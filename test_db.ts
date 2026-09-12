import { supabase } from './src/lib/supabase';
async function run() {
  const { data } = await supabase.from('prospects').select('*').eq('id', '19');
  console.log(data);
}
run();
