import { supabase } from './src/lib/supabase';

async function testPersist() {
  // 1. Update prospect 19 to promoted: true
  const { error: updateError } = await supabase.from('prospects')
    .update({ promoted: true, promotion_date: '09/12/2026' })
    .eq('id', 19);

  console.log('Update error:', updateError);

  // 2. Fetch it back immediately
  const { data, error: fetchError } = await supabase.from('prospects')
    .select('*')
    .eq('id', 19)
    .single();

  console.log('Fetch error:', fetchError);
  console.log('Fetched prospect row:', data);
}

testPersist();
