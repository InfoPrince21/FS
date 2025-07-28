import { supabase } from 'src/lib/supabase';

export async function saveH2HMatchResult(matchId, data) {
  const { error } = await supabase.from('h2h_matches').update(data).eq('id', matchId);

  if (error) {
    console.error('Error saving match result:', error.message);
    return { success: false, error };
  }

  return { success: true };
}
