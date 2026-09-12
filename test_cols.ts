import { supabase } from './src/lib/supabase';

async function testColumns() {
  const { data, error } = await supabase.from('prospects').select('*').limit(1);
  console.log('Columns sample:', data?.[0]);
}
testColumns();
