import { fetchLeagueData } from './src/lib/supabase';

async function test() {
  const gms = await fetchLeagueData();
  const adam = gms.find(g => g.name === 'Adam');
  console.log('Adam GM:', JSON.stringify(adam, null, 2));
}
test();
