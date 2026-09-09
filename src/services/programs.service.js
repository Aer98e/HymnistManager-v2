import { supabase } from '../config/supabase.js';

export const programsService = {
  async getPrograms(contextId = null) {
    let query = supabase
      .from('programs')
      .select(`
        *,
        context:contexts(id, name),
        program_hymn (
          hymn_id,
          order_index,
          hymn:hymns(
            *,
            hymnal_hymn(number, hymnal_id, hymnal:hymnals(id, name)),
            user_hymn(
              key_mode,
              energy,
              has_modulation,
              key_note:notes!user_hymn_key_id_fkey(id, name_es, name_en)
            )
          )
        )
      `)
      .order('date', { ascending: false });

    if (contextId) {
      query = query.eq('context_id', contextId);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data) {
      data.forEach(p => {
        if (p.program_hymn) {
          p.program_hymn.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        }
      });
    }

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
  },

  async getForgottenHymns(contextId, limit = 10) {
    // 1. Fetch all hymns
    const { data: allHymns, error: hymnErr } = await supabase
      .from('hymns')
      .select(`
        *,
        hymnal_hymn(number, hymnal_id, hymnal:hymnals(id, name)),
        user_hymn(key_mode, energy, key_note:notes!user_hymn_key_id_fkey(id, name_es, name_en))
      `);

    if (hymnErr) throw hymnErr;

    // 2. Fetch usage stats for this context
    const { data: usageStats, error: statErr } = await supabase
      .from('v_hymn_usage_stats')
      .select('*')
      .eq('context_id', contextId);

    if (statErr) throw statErr;

    const statsMap = new Map((usageStats || []).map(s => [s.hymn_id, s]));

    // 3. Map and sort
    const mapped = allHymns.map(hymn => {
      const stat = statsMap.get(hymn.id);
      const lastUsedAt = stat ? stat.last_used_at : null;
      const totalUses = stat ? stat.total_uses : 0;
      
      let daysElapsed = 99999;
      if (lastUsedAt) {
        const diffMs = new Date() - new Date(lastUsedAt);
        daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        ...hymn,
        total_uses: totalUses,
        last_used_at: lastUsedAt,
        days_elapsed: daysElapsed
      };
    });

    // Sort by days elapsed descending (never used / longest time ago first)
    mapped.sort((a, b) => b.days_elapsed - a.days_elapsed);

    return mapped.slice(0, limit);
  },

  async getActiveNewHymns(contextId) {
    const { data, error } = await supabase
      .from('v_active_new_hymns')
      .select(`
        *,
        hymn:hymns(
          *,
          hymnal_hymn(number, hymnal_id, hymnal:hymnals(id, name)),
          user_hymn(key_mode, energy, key_note:notes!user_hymn_key_id_fkey(id, name_es, name_en))
        )
      `)
      .eq('context_id', contextId);

    if (error) throw error;
    return data || [];
  },

  async checkRecentHymnUsage(contextId, hymnId) {
    const { data, error } = await supabase
      .from('v_hymn_usage_stats')
      .select('*')
      .eq('context_id', contextId)
      .eq('hymn_id', hymnId)
      .maybeSingle();

    if (error) throw error;
    if (!data || !data.last_used_at) {
      return { usedRecently: false, daysAgo: null, lastDate: null };
    }

    const lastDate = new Date(data.last_used_at);
    const today = new Date();
    const diffMs = today - lastDate;
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return {
      usedRecently: daysAgo <= 28, // Warning if used in the last 4 weeks
      daysAgo,
      lastDate: data.last_used_at
    };
  },

  async getContextRecentUsageStats(contextId) {
    const { data, error } = await supabase
      .from('v_hymn_usage_stats')
      .select('*')
      .eq('context_id', contextId);

    if (error) throw error;

    const statsMap = new Map();
    const today = new Date();

    (data || []).forEach(row => {
      if (row.last_used_at) {
        const lastDate = new Date(row.last_used_at);
        const diffMs = today - lastDate;
        const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        statsMap.set(row.hymn_id, {
          usedRecently: daysAgo <= 28,
          daysAgo,
          lastDate: row.last_used_at
        });
      }
    });

    return statsMap;
  },

  async updateProgramHymnOrder(programId, orderedHymnIds = []) {
    // Delete existing
    const { error: delErr } = await supabase
      .from('program_hymn')
      .delete()
      .eq('program_id', programId);

    if (delErr) throw delErr;

    if (orderedHymnIds.length > 0) {
      const items = orderedHymnIds.map((hymnId, index) => ({
        program_id: programId,
        hymn_id: hymnId,
        order_index: index + 1
      }));

      const { error: insErr } = await supabase
        .from('program_hymn')
        .insert(items);

      if (insErr) throw insErr;
    }

    return true;
  },

  async updateProgram(programId, { name, date, contextId, hymnIds }) {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (date !== undefined) updateData.date = date;
    if (contextId !== undefined) updateData.context_id = contextId;

    if (Object.keys(updateData).length > 0) {
      const { error: progErr } = await supabase
        .from('programs')
        .update(updateData)
        .eq('id', programId);

      if (progErr) throw progErr;
    }

    if (hymnIds !== undefined) {
      await this.updateProgramHymnOrder(programId, hymnIds);
    }

    return true;
  },

  async deleteProgram(programId) {
    const { error } = await supabase
      .from('programs')
      .delete()
      .eq('id', programId);

    if (error) throw error;
    return true;
  }
};

