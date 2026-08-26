import { supabase } from '../config/supabase.js';
import { normalizeText, computeHymnMatchScore } from '../utils/text.utils.js';

function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        cell += char;
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }


    if (char === delimiter && !inQuotes) {
      result.push(cell.trim());
      cell = '';
      i++;
      continue;
    }

    cell += char;
    i++;
  }

  result.push(cell.trim());
  return result;
}

export const hymnalsService = {
  async getHymnals() {
    const { data, error } = await supabase
      .from('hymnals')
      .select(`
        *,
        language:languages(id, name, abbreviation)
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
        hymnal_hymn(number, hymn:hymns(*))
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

  async updateHymnal(hymnalId, newName) {
    const { data, error } = await supabase
      .from('hymnals')
      .update({ name: newName })
      .eq('id', hymnalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteHymnal(hymnalId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Delete hymnal_hymn links for this hymnal
    await supabase.from('hymnal_hymn').delete().eq('hymnal_id', hymnalId);

    // 2. Unlink preferred_hymnal_id if set to this hymnal
    await supabase.from('user_preferences').update({ preferred_hymnal_id: null }).eq('preferred_hymnal_id', hymnalId);

    // 3. Delete the hymnal record itself
    const { error: deleteHymnalErr } = await supabase
      .from('hymnals')
      .delete()
      .eq('id', hymnalId);

    if (deleteHymnalErr) throw new Error(`No se pudo eliminar el himnario: ${deleteHymnalErr.message}`);

    // Note: Private hymns previously in this hymnal are NOT deleted.
    // They automatically remain as "Himnos Sueltos" in the user's account.
  },

  async duplicateHymnal(hymnalId, customName = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Fetch source hymnal and its hymns
    const sourceHymnal = await this.getHymnalDetails(hymnalId);
    if (!sourceHymnal) throw new Error('Himnario no encontrado');

    const newHymnalName = customName || `${sourceHymnal.name} (Copia)`;

    // 2. Create the new private hymnal for current user
    const { data: newHymnal, error: createErr } = await supabase
      .from('hymnals')
      .insert({
        name: newHymnalName,
        language_id: sourceHymnal.language_id,
        type: 'private',
        created_by: user.id
      })
      .select()
      .single();

    if (createErr) throw createErr;

    // 3. Duplicate each hymn as a new private hymn for the current user, and link it
    const items = sourceHymnal.hymnal_hymn || [];
    for (const item of items) {
      const srcHymn = item.hymn;
      if (!srcHymn) continue;

      // Create new private hymn copy for current user
      const { data: newHymn, error: hymnErr } = await supabase
        .from('hymns')
        .insert({
          title_es: srcHymn.title_es,
          title_original: srcHymn.title_original,
          composer: srcHymn.composer,
          first_line: srcHymn.first_line,
          refrain_first_line: srcHymn.refrain_first_line,
          type: 'private',
          created_by: user.id
        })
        .select()
        .single();

      if (hymnErr) {
        console.error('Error duplicando himno:', hymnErr);
        continue;
      }

      // Link to new hymnal with the original number
      await supabase.from('hymnal_hymn').insert({
        hymnal_id: newHymnal.id,
        hymn_id: newHymn.id,
        number: item.number
      });
    }

    return newHymnal;
  },

  async getUserLooseHymns() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('v_user_loose_hymns')
      .select('*')
      .eq('created_by', user.id)
      .order('title_es', { ascending: true });

    if (error) {
      // Fallback if view is not deployed yet in DB
      const { data: hymns } = await supabase
        .from('hymns')
        .select('*, hymnal_hymn(hymnal_id)')
        .eq('type', 'private')
        .eq('created_by', user.id);

      return (hymns || []).filter(h => !h.hymnal_hymn || h.hymnal_hymn.length === 0);
    }

    return data;
  },

  async getPublicLooseHymns() {
    const { data, error } = await supabase
      .from('v_public_loose_hymns')
      .select('*')
      .order('title_es', { ascending: true });

    if (error) {
      // Fallback if view is not deployed yet in DB
      const { data: hymns } = await supabase
        .from('hymns')
        .select('*, hymnal_hymn(hymnal_id)')
        .eq('type', 'public');

      return (hymns || []).filter(h => !h.hymnal_hymn || h.hymnal_hymn.length === 0);
    }

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

    // Promote all hymns inside this approved hymnal to type = 'public'
    const { data: linkedItems } = await supabase
      .from('hymnal_hymn')
      .select('hymn_id')
      .eq('hymnal_id', hymnalId);

    if (linkedItems && linkedItems.length > 0) {
      const hymnIds = linkedItems.map(item => item.hymn_id);
      await supabase
        .from('hymns')
        .update({ type: 'public' })
        .in('id', hymnIds);
    }

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

  async importHymnalFromCSV(hymnalName, csvContent, languageId = 1, isPublic = false, reuseExisting = true) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Create the hymnal container
    const hymnal = await this.createHymnal(hymnalName, languageId, isPublic);
    const hymnType = hymnal.type === 'public' ? 'public' : 'private';

    // 2. Parse CSV lines
    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) throw new Error('El archivo CSV está vacío');

    let delimiter = ',';
    if (lines[0].includes(';')) delimiter = ';';
    else if (lines[0].includes('\t')) delimiter = '\t';

    const firstLineCols = parseCSVLine(lines[0], delimiter);
    const headerColsLower = firstLineCols.map(c => c.toLowerCase());

    // Standard RFC 4180 Column Index Matching
    let numIdx = headerColsLower.findIndex(h => h === 'numero' || h === 'número' || h === 'number' || h === 'num' || h === '#' || h === 'no' || h === 'id');
    let titleIdx = headerColsLower.findIndex(h => h === 'titulo' || h === 'título' || h === 'title' || h === 'nombre' || h === 'cancion' || h === 'canción' || h === 'song');
    let origIdx = headerColsLower.findIndex(h => h.includes('orig') || h.includes('english') || h.includes('ingles'));
    let compIdx = headerColsLower.findIndex(h => h.includes('comp') || h.includes('autor') || h.includes('artist') || h.includes('escritor'));
    let firstLineIdx = headerColsLower.findIndex(h => h.includes('primera') || h.includes('first_line') || h.includes('linea') || h.includes('línea') || h.includes('estrofa') || h.includes('verse'));
    let refrainIdx = headerColsLower.findIndex(h => h.includes('coro') || h.includes('refrain') || h.includes('estribillo') || h.includes('chorus'));

    if (titleIdx === -1) {
      throw new Error('El archivo CSV no contiene una columna válida para el título del himno ("titulo").');
    }

    const isHeaderLine = (numIdx !== -1 || titleIdx !== -1 || isNaN(parseInt(firstLineCols[0], 10)));
    const startLineIndex = isHeaderLine ? 1 : 0;

    // Fetch existing hymns to avoid duplicates if reuseExisting is true
    const { data: existingHymns } = reuseExisting 
      ? await supabase.from('hymns').select('id, title_es, composer, title_original') 
      : { data: [] };

    const makeHymnKey = (t, c, o) => {
      const title = (t || '').toLowerCase().trim();
      const comp = (c || '').toLowerCase().trim();
      const orig = (o || '').toLowerCase().trim();
      return `${title}|${comp}|${orig}`;
    };

    const hymnMap = new Map(
      (existingHymns || []).map(h => [makeHymnKey(h.title_es, h.composer, h.title_original), h.id])
    );

    let autoNumber = 1;
    const hymnalHymnInserts = [];

    for (let i = startLineIndex; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i], delimiter);
      if (cols.length === 0 || cols.every(c => c.length === 0)) continue;

      const titleVal = titleIdx !== -1 && titleIdx < cols.length ? cols[titleIdx] : null;
      if (!titleVal || titleVal.trim().length === 0) continue;

      let numVal = numIdx !== -1 && numIdx < cols.length ? parseInt(cols[numIdx], 10) : NaN;
      if (isNaN(numVal)) {
        numVal = autoNumber;
      }
      autoNumber = Math.max(autoNumber, numVal + 1);

      const compVal = compIdx !== -1 && compIdx < cols.length ? cols[compIdx] : null;
      const origVal = origIdx !== -1 && origIdx < cols.length ? cols[origIdx] : null;
      const firstLineVal = firstLineIdx !== -1 && firstLineIdx < cols.length ? cols[firstLineIdx] : null;
      const refrainVal = refrainIdx !== -1 && refrainIdx < cols.length ? cols[refrainIdx] : null;

      const hymnKey = makeHymnKey(titleVal, compVal, origVal);
      let hymnId = hymnMap.get(hymnKey);

      if (!hymnId) {
        const { data: newHymn, error: hErr } = await supabase
          .from('hymns')
          .insert({
            title_es: titleVal,
            title_original: origVal,
            composer: compVal,
            first_line: firstLineVal,
            refrain_first_line: refrainVal,
            type: hymnType,
            created_by: user.id
          })
          .select()
          .single();

        if (hErr) {
          throw new Error(`Error en el himno "${titleVal}" (Fila ${i + 1}): ${hErr.message}`);
        }

        if (newHymn) {
          hymnId = newHymn.id;
          hymnMap.set(hymnKey, hymnId);
        }
      }



      if (hymnId) {
        hymnalHymnInserts.push({
          hymnal_id: hymnal.id,
          hymn_id: hymnId,
          number: numVal
        });
      }
    }

    if (hymnalHymnInserts.length > 0) {
      // Deduplicate by (hymnal_id, hymn_id) to prevent PRIMARY KEY 23505 conflicts if same song is repeated
      const uniqueLinksMap = new Map();
      for (const item of hymnalHymnInserts) {
        const key = `${item.hymnal_id}:${item.hymn_id}`;
        if (!uniqueLinksMap.has(key)) {
          uniqueLinksMap.set(key, item);
        }
      }
      const finalInserts = Array.from(uniqueLinksMap.values());

      const chunkSize = 100;
      for (let c = 0; c < finalInserts.length; c += chunkSize) {
        const chunk = finalInserts.slice(c, c + chunkSize);
        const { error: linkErr } = await supabase.from('hymnal_hymn').insert(chunk);
        if (linkErr) throw new Error(`Error vinculando himnos (lote ${Math.floor(c / chunkSize) + 1}): ${linkErr.message}`);
      }
    }

    return { hymnal, importedCount: hymnalHymnInserts.length };
  },


  async getHymnalLinkSuggestions(hymnalId) {
    // 1. Fetch hymnal details
    const hymnal = await this.getHymnalDetails(hymnalId);
    if (!hymnal || !hymnal.hymnal_hymn) return { hymnal, suggestions: [] };

    // 2. Fetch all candidate hymns in catalog (both public and user private hymns) with linked hymnal info
    const { data: targetHymns, error } = await supabase
      .from('hymns')
      .select(`
        *,
        hymnal_hymn(
          number,
          hymnal:hymnals(id, name)
        )

      `);

    if (error) throw error;


    const suggestions = [];

    for (const item of hymnal.hymnal_hymn) {
      const localHymn = item.hymn;
      if (!localHymn) continue;

      const isAlreadyPublic = localHymn.type === 'public';

      // Compare local song against all other catalog songs
      const candidates = (targetHymns || [])
        .map(targetHymn => {
          const score = computeHymnMatchScore(localHymn, targetHymn);
          return { publicHymn: targetHymn, score };
        })
        .filter(c => c.score >= 35 && c.publicHymn.id !== localHymn.id)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4); // top candidate suggestions

      suggestions.push({
        number: item.number,
        localHymn,
        isAlreadyPublic,
        candidates
      });
    }

    return { hymnal, suggestions };
  },


  async relinkHymnalHymn(hymnalId, oldHymnId, newPublicHymnId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Update hymnal_hymn link
    const { error: updateErr } = await supabase
      .from('hymnal_hymn')
      .update({ hymn_id: newPublicHymnId })
      .eq('hymnal_id', hymnalId)
      .eq('hymn_id', oldHymnId);

    if (updateErr) throw updateErr;

    // 2. Check if oldHymnId was private and is now orphaned
    const { count: refCount } = await supabase
      .from('hymnal_hymn')
      .select('hymn_id', { count: 'exact', head: true })
      .eq('hymn_id', oldHymnId);

    if (refCount === 0) {
      await supabase.from('hymns').delete().eq('id', oldHymnId).eq('type', 'private');
    }
  },

  async linkHymnToPublic(hymnalId, oldHymnId, newPublicHymnId) {
    return this.relinkHymnalHymn(hymnalId, oldHymnId, newPublicHymnId);
  }
};

