import { supabase } from '../config/supabase.js';

export const hymnalsService = {
  async getHymnals() {
    const { data, error } = await supabase
      .from('hymnals')
      .select(`
        *,
        language:languages(id, name, abbreviation),
        hymnal_hymn(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getHymnalDetails(hymnalId) {
    const { data, error } = await supabase
      .from('hymnals')
      .select(`
        *,
        language:languages(id, name, abbreviation),
        hymnal_hymn (
          number,
          hymn:hymns(*)
        )
      `)
      .eq('id', hymnalId)
      .single();

    if (error) throw error;
    return data;
  },

  async createHymnal(name, languageId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('hymnals')
      .insert({
        name,
        language_id: languageId,
        type: 'private',
        created_by: user.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addHymnToHymnal(hymnalId, hymnId, number) {
    const { data, error } = await supabase
      .from('hymnal_hymn')
      .insert({
        hymnal_id: hymnalId,
        hymn_id: hymnId,
        number: parseInt(number, 10)
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async submitHymnalForReview(hymnalId) {
    const { data, error } = await supabase
      .from('hymnals')
      .update({ type: 'pending', rejection_reason: null })
      .eq('id', hymnalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Admin methods
  async getPendingHymnals() {
    const { data, error } = await supabase
      .from('hymnals')
      .select(`
        *,
        language:languages(id, name, abbreviation),
        hymnal_hymn(number, hymn:hymns(*))
      `)
      .eq('type', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  async approveHymnal(hymnalId) {
    const { data, error } = await supabase
      .from('hymnals')
      .update({ type: 'public', rejection_reason: null })
      .eq('id', hymnalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async rejectHymnal(hymnalId, rejectionReason) {
    const { data, error } = await supabase
      .from('hymnals')
      .update({ type: 'rejected', rejection_reason: rejectionReason })
      .eq('id', hymnalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};
