import { supabase } from '../config/supabase.js';
import { authService } from './auth.service.js';

export const contextsService = {
  async getContexts() {
    const { data, error } = await supabase
      .from('contexts')
      .select(`
        *,
        new_hymns_category:categories!contexts_new_hymns_category_id_fkey(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createContext(name) {
    const user = await authService.getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Create a private category for new hymns for this context
    const categoryName = `Nuevos - ${name}`;
    const { data: category, error: catError } = await supabase
      .from('categories')
      .insert({
        name: categoryName,
        created_by: user.id
      })
      .select()
      .single();

    if (catError) throw catError;

    // 2. Create context linking new_hymns_category_id
    const { data: context, error: ctxError } = await supabase
      .from('contexts')
      .insert({
        name,
        user_id: user.id,
        new_hymns_category_id: category.id
      })
      .select()
      .single();

    if (ctxError) throw ctxError;
    return context;
  },

  async deleteContext(contextId) {
    const { error } = await supabase
      .from('contexts')
      .delete()
      .eq('id', contextId);

    if (error) throw error;
  },

  async getActiveNewHymns(contextId) {
    const { data, error } = await supabase
      .from('v_active_new_hymns')
      .select(`
        *,
        hymn:hymns(*)
      `)
      .eq('context_id', contextId);

    if (error) throw error;
    return data;
  },

  async addHymnToNewHymnsCategory(categoryId, hymnId) {
    const { data, error } = await supabase
      .from('category_hymn')
      .insert({
        category_id: categoryId,
        hymn_id: hymnId
      })
      .select();

    if (error) throw error;
    return data;
  }
};
