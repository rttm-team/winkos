import { supabase } from './src/lib/supabase';
async function testUpdateStr() {
  const { data, error } = await supabase.from('prospects')
    .update({ promoted: false, promotion_date: null })
    .eq('id', '19')
    .select();
  console.log('Error:', error);
  console.log('Data:', data);
}
testUpdateStr();
