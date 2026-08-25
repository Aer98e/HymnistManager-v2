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

  async createHymnal(name, languageId, isPublic = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const isAdmin = user.app_metadata?.role === 'admin';
    const hymnalType = (isAdmin && isPublic) ? 'public' : 'private';

    const { data, error } = await supabase
      .from('hymnals')
      .insert({
        name,
        language_id: languageId,
        type: hymnalType,
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
  },

  async importHymnalFromCSV(hymnalName, csvContent, languageId = 1, isPublic = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Create the hymnal container
    const hymnal = await this.createHymnal(hymnalName, languageId, isPublic);


    // 2. Parse CSV lines
    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) throw new Error('El archivo CSV está vacío');

    // Detect delimiter (, or ;)
    const delimiter = lines[0].includes(';') ? ';' : ',';

    // Parse header to find column indices
    const header = lines[0].toLowerCase().split(delimiter).map(c => c.replace(/["']/g, '').trim());
    let numIdx = header.findIndex(h => h.includes('num') || h.includes('number') || h === '#');
    let titleIdx = header.findIndex(h => h.includes('titul') || h.includes('title') || h.includes('nombre'));
    let compIdx = header.findIndex(h => h.includes('comp') || h.includes('autor'));
    let origIdx = header.findIndex(h => h.includes('orig'));
    let firstLineIdx = header.findIndex(h => h.includes('primera') || h.includes('first_line') || h.includes('linea') || h.includes('estrofa'));
    let refrainIdx = header.findIndex(h => h.includes('coro') || h.includes('refrain') || h.includes('estribillo'));

    // Fallbacks if no header match
    if (numIdx === -1) numIdx = 0;
    if (titleIdx === -1) titleIdx = 1;

    let importedCount = 0;
    const startLineIndex = (header.some(h => isNaN(parseInt(h, 10)))) ? 1 : 0;

    // Fetch existing hymns to avoid duplicates
    const { data: existingHymns } = await supabase.from('hymns').select('id, title_es');
    const hymnMap = new Map((existingHymns || []).map(h => [h.title_es.toLowerCase().trim(), h.id]));

    for (let i = startLineIndex; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length < 2) continue;

      const numVal = parseInt(cols[numIdx], 10);
      const titleVal = cols[titleIdx];
      const compVal = compIdx !== -1 && cols[compIdx] ? cols[compIdx] : null;
      const origVal = origIdx !== -1 && cols[origIdx] ? cols[origIdx] : null;
      const firstLineVal = firstLineIdx !== -1 && cols[firstLineIdx] ? cols[firstLineIdx] : null;
      const refrainVal = refrainIdx !== -1 && cols[refrainIdx] ? cols[refrainIdx] : null;

      if (!titleVal || isNaN(numVal)) continue;

      let hymnId = hymnMap.get(titleVal.toLowerCase().trim());

      // If hymn doesn't exist, create it
      if (!hymnId) {
        const { data: newHymn, error: hErr } = await supabase
          .from('hymns')
          .insert({
            title_es: titleVal,
            title_original: origVal,
            composer: compVal,
            first_line: firstLineVal,
            refrain_first_line: refrainVal,
            type: 'private',
            created_by: user.id
          })
          .select()
          .single();


        if (!hErr && newHymn) {
          hymnId = newHymn.id;
          hymnMap.set(titleVal.toLowerCase().trim(), hymnId);
        }
      }

      // Link hymn to hymnal with number
      if (hymnId) {
        await supabase.from('hymnal_hymn').insert({
          hymnal_id: hymnal.id,
          hymn_id: hymnId,
          number: numVal
        });
        importedCount++;
      }
    }

    return { hymnal, importedCount };
  }
};

