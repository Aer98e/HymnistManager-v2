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
  console.log('--- SCRIPT A: Revisando himnos faltantes en la tabla "hymns" ---');

  const email = process.env.EMAIL;
  const password = process.env.PASSWORD;

  if (email && password) {
    console.log(`Autenticando en Supabase como: ${email}...`);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) console.warn('Aviso al autenticar:', authErr.message);
  } else {
    console.log('💡 Nota: Para consultar tus himnos privados con RLS, ejecuta: EMAIL="tu@email.com" PASSWORD="tu_password" node scripts/check_missing_hymns.js');
  }

  // Read CSV
  const csvContent = fs.readFileSync('./searchResults.csv', 'utf8');
  const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const headerCols = parseCSVLine(lines[0]).map(c => c.toLowerCase());
  const titleIdx = headerCols.indexOf('titulo');

  const csvTitles = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const title = cols[titleIdx];
    if (title) csvTitles.push(title.trim());
  }

  console.log(`Total de himnos en searchResults.csv: ${csvTitles.length}`);

  // Query DB hymns
  const { data: dbHymns, error } = await supabase.from('hymns').select('id, title_es, type');
  if (error) {
    console.error('Error al consultar hymns en Supabase:', error);
    return;
  }

  console.log(`Total de himnos visibles en la tabla "hymns": ${(dbHymns || []).length}`);

  const dbTitleSet = new Set((dbHymns || []).map(h => h.title_es.toLowerCase().trim()));
  const missingInDb = csvTitles.filter(t => !dbTitleSet.has(t.toLowerCase().trim()));

  console.log(`\nResultados del diagnóstico:`);
  console.log(`- Himnos del CSV que FALTAN en la base de datos: ${missingInDb.length}`);

  if (missingInDb.length > 0) {
    console.log('\nMuestra de himnos no subidos:');
    missingInDb.slice(0, 15).forEach((t, index) => console.log(`  ${index + 1}. ${t}`));
  } else {
    console.log('✅ ¡Todos los himnos del CSV existen en la tabla "hymns"!');
  }
}

run();
