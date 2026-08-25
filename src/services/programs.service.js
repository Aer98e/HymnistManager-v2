import { supabase } from '../config/supabase.js';

export const programsService = {
  async getPrograms(contextId = null) {
    let query = supabase
      .from('programs')
      .select(`
        *,
        context:contexts(id, name),
        program_hymn (
          order_index,
          hymn:hymns(
            *,
            hymnal_hymn(number, hymnal_id)
          )
        )
      `)
      .order('date', { ascending: false });

    if (contextId) {
      query = query.eq('context_id', contextId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },


  async createProgram(contextId, date, name, hymnIds = []) {
    const { data: program, error: progError } = await supabase
      .from('programs')
      .insert({
        context_id: contextId,
        date,
        name
      })
      .select()
      .single();

    if (progError) throw progError;

    if (hymnIds.length > 0) {
      const items = hymnIds.map((hymnId, index) => ({
        program_id: program.id,
        hymn_id: hymnId,
        order_index: index + 1
      }));

      const { error: itemError } = await supabase
        .from('program_hymn')
        .insert(items);

      if (itemError) throw itemError;
    }

    return program;
  },

  async getHymnRecurrenceStats(contextId, hymnId) {
    const { data, error } = await supabase
      .from('v_hymn_usage_stats')
      .select('*')
      .eq('context_id', contextId)
      .eq('hymn_id', hymnId)
      .maybeSingle();

    if (error) throw error;
    return data || { total_uses: 0, last_used_at: null };
  }
};
