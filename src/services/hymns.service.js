import { supabase } from '../config/supabase.js';

export const hymnsService = {
  async getHymns(searchQuery = '', categoryId = null) {
    let query = supabase
      .from('hymns')
      .select(`
        *,
        category_hymn (
          category_id,
          categories (id, name, created_by)
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
    const { data: { user } } = await supabase.auth.getUser();
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

  async getUserHymnAttributes(hymnId) {
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
    const { data: { user } } = await supabase.auth.getUser();
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
  }
};
