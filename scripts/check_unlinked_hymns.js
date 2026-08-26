import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://oewxyinsstslkmctskeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ld3h5aW5zc3RzbGttY3Rza2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MDEyOTEsImV4cCI6MjEwMzE3NzI5MX0.POiMWvbP7z8O9P1k8S7KED83-05BlNgWIPJXp41tD20';

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function run() {
  console.log('--- SCRIPT B: Revisando y enlazando himnos desvinculados en "hymnal_hymn" ---');

  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;
  const autoLink = process.env.LINK === 'true';

  if (email && password) {
    console.log(`Autenticando en Supabase como: ${email}...`);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) console.warn('Aviso al autenticar:', authErr.message);
  } else {
    console.log('💡 Nota: Para autenticarte y enlazar himnos automáticamente, ejecuta: EMAIL="tu@email.com" PASSWORD="tu_password" LINK="true" node scripts/check_unlinked_hymns.js');
  }

  // 1. Fetch hymnals in DB
  const { data: hymnals, error: hErr } = await supabase.from('hymnals').select('id, name');
  if (hErr) {
    console.error('Error al obtener hymnals:', hErr);
    return;
  }

  console.log(`Himnarios encontrados en la base de datos (${(hymnals || []).length}):`, hymnals);
  if (!hymnals || hymnals.length === 0) {
    console.log('No se encontraron himnarios creados.');
    return;
  }

  const hymnal = hymnals[0]; // Target hymnal
  console.log(`\nInspeccionando himnario: "${hymnal.name}" (ID: ${hymnal.id})`);

  // 2. Fetch all linked hymnal_hymn records for this hymnal
  const { data: links, error: lErr } = await supabase.from('hymnal_hymn').select('hymnal_id, hymn_id, number').eq('hymnal_id', hymnal.id);
  if (lErr) {
    console.error('Error al obtener hymnal_hymn:', lErr);
    return;
  }

  console.log(`Vínculos/números registrados actualmente en "hymnal_hymn": ${(links || []).length}`);

  // 3. Fetch all hymns in hymns table
  const { data: dbHymns, error: hymnsErr } = await supabase.from('hymns').select('id, title_es');
  if (hymnsErr) {
    console.error('Error al obtener hymns:', hymnsErr);
    return;
  }

  console.log(`Himnos visibles en la tabla "hymns": ${(dbHymns || []).length}`);

  const linkedHymnIds = new Set((links || []).map(l => l.hymn_id));
  const unlinkedHymns = (dbHymns || []).filter(h => !linkedHymnIds.has(h.id));

  console.log(`\nResultados del diagnóstico:`);
  console.log(`- Himnos VINCULADOS a "${hymnal.name}": ${linkedHymnIds.size}`);
  console.log(`- Himnos DESVINCULADOS en la tabla "hymns": ${unlinkedHymns.length}`);

  // 4. Match unlinked hymns to searchResults.csv numbers
  const csvContent = fs.readFileSync('./searchResults.csv', 'utf8');
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const headerCols = parseCSVLine(lines[0]).map(c => c.toLowerCase());
  const titleIdx = headerCols.indexOf('titulo');
  const numIdx = headerCols.indexOf('numero');

  const csvMap = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const title = cols[titleIdx];
    const num = parseInt(cols[numIdx], 10);
    if (title && !isNaN(num)) {
      csvMap.set(title.toLowerCase().trim(), num);
    }
  }

  const toLink = [];
  const existingNumbers = new Set((links || []).map(l => l.number));

  for (const h of unlinkedHymns) {
    const csvNum = csvMap.get(h.title_es.toLowerCase().trim());
    if (csvNum !== undefined) {
      if (!existingNumbers.has(csvNum)) {
        toLink.push({
          hymnal_id: hymnal.id,
          hymn_id: h.id,
          number: csvNum,
          title: h.title_es
        });
        existingNumbers.add(csvNum); // avoid duplicate number inserts
      }
    }
  }

  console.log(`- Himnos desvinculados listos para asociarse a su número de CSV: ${toLink.length}`);

  if (toLink.length > 0) {
    console.log('\nMuestra de himnos pendientes de enlazar:');
    toLink.slice(0, 10).forEach(item => console.log(`  #${item.number} -> ${item.title}`));

    if (autoLink) {
      console.log(`\n🚀 Ejecutando enlace masivo de ${toLink.length} himnos a "${hymnal.name}"...`);
      const inserts = toLink.map(i => ({ hymnal_id: i.hymnal_id, hymn_id: i.hymn_id, number: i.number }));
      
      const chunkSize = 50;
      let count = 0;
      for (let c = 0; c < inserts.length; c += chunkSize) {
        const chunk = inserts.slice(c, c + chunkSize);
        const { error: insErr } = await supabase.from('hymnal_hymn').insert(chunk);
        if (insErr) {
          console.error(`Error en lote ${c}:`, insErr.message);
        } else {
          count += chunk.length;
        }
      }
      console.log(`✅ ¡Se enlazaron ${count} himnos con éxito en "hymnal_hymn"!`);
    } else {
      console.log('\n💡 Para ejecutar el enlace automático de estos himnos, ejecuta:');
      console.log('EMAIL="tu@email.com" PASSWORD="tu_password" LINK="true" node scripts/check_unlinked_hymns.js');
    }
  }
}

run();
