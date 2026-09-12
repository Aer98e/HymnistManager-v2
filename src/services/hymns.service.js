import { supabase } from '../config/supabase.js';
import { authService } from './auth.service.js';

export const hymnsService = {
  async getHymns(searchQuery = '', categoryId = null) {
    let query = supabase
      .from('hymns')
      .select(`
        *,
        category_hymn (
          category_id,
          categories (id, name, created_by)
        ),
        hymnal_hymn (
          number,
          hymnal:hymnals (id, name)
        )
      `)
      .order('title_es', { ascending: true });

    if (searchQuery) {
      query = query.or(`title_es.ilike.%${searchQuery}%,title_original.ilike.%${searchQuery}%,composer.ilike.%${searchQuery}%,first_line.ilike.%${searchQuery}%,refrain_first_line.ilike.%${searchQuery}%`);
    }


    const { data, error } = await query;
    if (error) throw error;

    if (categoryId) {
      return data.filter(hymn => 
        hymn.category_hymn && hymn.category_hymn.some(ch => ch.category_id === categoryId)
      );
    }

    return data;
  },

  async createHymn(hymnData) {
    const user = await authService.getCurrentUser();
    const payload = {
      ...hymnData,
      created_by: user ? user.id : null,
      type: hymnData.type || 'private'
    };

    const { data, error } = await supabase
      .from('hymns')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateHymn(hymnId, hymnData) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('hymns')
      .update({
        title_es: hymnData.title_es,
        title_original: hymnData.title_original || null,
        composer: hymnData.composer || null,
        first_line: hymnData.first_line || null,
        refrain_first_line: hymnData.refrain_first_line || null
      })
      .eq('id', hymnId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserHymnAttributes(hymnId) {
    const user = await authService.getCurrentUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_hymn')
      .select(`
        *,
        key_note:notes!user_hymn_key_id_fkey(id, name_es, name_en),
        highest_note:notes!user_hymn_highest_note_id_fkey(id, name_es, name_en),
        lowest_note:notes!user_hymn_lowest_note_id_fkey(id, name_es, name_en)
      `)
      .eq('user_id', user.id)
      .eq('hymn_id', hymnId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async saveUserHymnAttributes(hymnId, attributes) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const payload = {
      user_id: user.id,
      hymn_id: hymnId,
      ...attributes
    };

    const { data, error } = await supabase
      .from('user_hymn')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getNotes() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createCategory(name) {
    const user = await authService.getCurrentUser();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        created_by: user ? user.id : null
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCategory(catId, newName) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: newName })
      .eq('id', catId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(catId) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', catId);

    if (error) throw error;
    return true;
  },

  async getHymnProgramUsage(hymnId) {
    const { data, error } = await supabase
      .from('program_hymn')
      .select(`
        order_index,
        program:programs(
          id,
          name,
          date,
          context:contexts(name)
        )
      `)
      .eq('hymn_id', hymnId);

    if (error) throw error;
    return (data || []).map(item => item.program).filter(Boolean);
  },

  async deleteHymn(hymnId) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('hymns')
      .delete()
      .eq('id', hymnId);

    if (error) throw error;
    return true;
  },

  async getHymnsByHymnalIds(hymnalIds = []) {
    let query = supabase
      .from('hymns')
      .select(`
        *,
        hymnal_hymn (
          number,
          hymnal:hymnals (id, name)
        )
      `)
      .order('title_es', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    if (hymnalIds && hymnalIds.length > 0) {
      return data.filter(hymn =>
        hymn.hymnal_hymn && hymn.hymnal_hymn.some(hh => hymnalIds.includes(hh.hymnal.id))
      );
    }

    return data;
  },

  async getUserHymnsAll() {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_hymn')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  },

  async bulkUpsertUserHymns(validRecords = []) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    if (!validRecords || validRecords.length === 0) return true;

    const payload = validRecords.map(rec => ({
      user_id: user.id,
      hymn_id: rec.hymn_id,
      key_id: rec.key_id,
      key_mode: rec.key_mode,
      highest_note_id: rec.highest_note_id,
      highest_octave: rec.highest_octave,
      lowest_note_id: rec.lowest_note_id,
      lowest_octave: rec.lowest_octave,
      has_modulation: rec.has_modulation,
      energy: rec.energy
    }));

    const { data, error } = await supabase
      .from('user_hymn')
      .upsert(payload, { onConflict: 'user_id,hymn_id' });

    if (error) throw error;
    return true;
  },

  async getUserHymnListFull() {
    const user = await authService.getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_hymn')
      .select(`
        *,
        hymn:hymns(id, title_es, composer),
        key_note:notes!user_hymn_key_id_fkey(id, name_es, name_en)
      `)
      .eq('user_id', user.id);

    if (error) throw error;
    return data || [];
  },

  async deleteUserHymn(hymnId) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('user_hymn')
      .delete()
      .eq('user_id', user.id)
      .eq('hymn_id', hymnId);

    if (error) throw error;
    return true;
  }
};
