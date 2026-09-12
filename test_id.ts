import { supabase } from './src/lib/supabase';

async function testUpdateId() {
  // Try updating with string id '19'
  const { data, error, count } = await supabase.from('prospects')
    .update({ promoted: true })
    .eq('id', '19')
    .select();

  console.log('Error:', error);
  console.log('Data returned:', data);
  console.log('Count:', count);
}

testUpdateId();
