import { supabase } from './src/lib/supabase';

async function testUpdate() {
  const { data, error } = await supabase.from('prospects')
    .update({ promoted: true, promotion_date: '01/01/2026' })
    .eq('id', 19)
    .select();
  
  console.log('Error:', error);
  console.log('Data:', data);
}

testUpdate();
