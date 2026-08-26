import fs from 'fs';
import path from 'path';

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
  return { result, inQuotes };
}

function validateCSV(filePath) {
  console.log(`\n==================================================`);
  console.log(`🔍 VALIDANDO ARCHIVO CSV: ${path.basename(filePath)}`);
  console.log(`==================================================\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: El archivo "${filePath}" no existe.`);
    return;
  }

  const rawContent = fs.readFileSync(filePath, 'utf8');
  const lines = rawContent.split(/\r?\n/);
  
  const totalLines = lines.length;
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  console.log(`📊 Información General:`);
  console.log(`  - Tamaño del archivo: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
  console.log(`  - Total de líneas: ${totalLines}`);
  console.log(`  - Líneas con contenido: ${nonEmptyLines.length}`);

  if (nonEmptyLines.length === 0) {
    console.log(`❌ EL ARCHIVO ESTÁ CORRUPTO: El archivo está completamente vacío.`);
    return;
  }

  // 1. Detect delimiter
  const firstLine = nonEmptyLines[0];
  let delimiter = ',';
  if (firstLine.includes(';')) delimiter = ';';
  else if (firstLine.includes('\t')) delimiter = '\t';

  console.log(`  - Delimitador detectado: "${delimiter === '\t' ? '\\t (Tab)' : delimiter}"`);

  // 2. Parse header
  const headerParsed = parseCSVLine(firstLine, delimiter);
  const headerCols = headerParsed.result.map(c => c.toLowerCase());
  const expectedColumnCount = headerCols.length;

  console.log(`  - Columnas en el encabezado (${expectedColumnCount}): [ ${headerCols.join(', ')} ]`);

  const issues = [];
  const warnings = [];
  const numbersSeen = new Map();

  // Column indexes
  const numIdx = headerCols.findIndex(h => h.includes('num') || h === '#' || h === 'id' || h === 'no');
  const titleIdx = headerCols.findIndex(h => h === 'titulo' || h === 'título' || h === 'title' || (h.includes('titul') && !h.includes('orig')));

  if (titleIdx === -1) {
    warnings.push(`No se encontró una columna explícita llamada "titulo". El sistema intentará detectar la columna de texto automáticamente.`);
  }

  // 3. Inspect every row
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const lineNumber = i + 1;

    if (rawLine.trim().length === 0) continue; // skip trailing newlines

    const parsed = parseCSVLine(rawLine, delimiter);

    // Check for unclosed quotes
    if (parsed.inQuotes) {
      issues.push(`Fila ${lineNumber}: Comillas desbalanceadas o sin cerrar: "${rawLine}"`);
    }

    // Check column count mismatch
    if (parsed.result.length !== expectedColumnCount) {
      issues.push(`Fila ${lineNumber}: Desfasaje de columnas (se esperaban ${expectedColumnCount}, pero se encontraron ${parsed.result.length}). Contenido: [${parsed.result.join(' | ')}]`);
    }

    // Check hymn number
    if (numIdx !== -1 && numIdx < parsed.result.length) {
      const numStr = parsed.result[numIdx];
      const numVal = parseInt(numStr, 10);
      if (isNaN(numVal)) {
        warnings.push(`Fila ${lineNumber}: El número de himno "${numStr}" no es un número entero válido.`);
      } else {
        if (numbersSeen.has(numVal)) {
          warnings.push(`Fila ${lineNumber}: Número de himno #${numVal} DUPLICADO (ya visto en la fila ${numbersSeen.get(numVal)}). Himno: "${parsed.result[titleIdx] || 'sin título'}"`);
        } else {
          numbersSeen.set(numVal, lineNumber);
        }
      }
    }

    // Check title
    if (titleIdx !== -1 && titleIdx < parsed.result.length) {
      const titleStr = parsed.result[titleIdx];
      if (!titleStr || titleStr.trim().length === 0) {
        issues.push(`Fila ${lineNumber}: El campo de título está vacío.`);
      }
    }
  }

  // 4. Print Diagnosis Report
  console.log(`\n--------------------------------------------------`);
  console.log(`📋 RESULTADO DE LA VALIDACIÓN:`);
  console.log(`--------------------------------------------------`);

  if (issues.length === 0 && warnings.length === 0) {
    console.log(`✅ EL ARCHIVO CSV ESTÁ 100% CORRECTO Y BIEN FORMATEADO.`);
    console.log(`  - No se encontraron errores de sintaxis, desfasajes de columnas ni comillas corruptas.`);
    console.log(`  - Total de registros válidos procesados: ${nonEmptyLines.length - 1}`);
  } else {
    if (issues.length > 0) {
      console.log(`❌ SE ENCONTRARON ${issues.length} ERRORES CRÍTICOS / CORRUPCIÓN:`);
      issues.slice(0, 20).forEach(iss => console.log(`   • ${iss}`));
      if (issues.length > 20) console.log(`   ... y ${issues.length - 20} errores más.`);
    } else {
      console.log(`✅ NO HAY ERRORES CRÍTICOS DE SINTAXIS.`);
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️ SE ENCONTRARON ${warnings.length} ADVERTENCIAS / DUPLICADOS DE NÚMERO:`);
      warnings.slice(0, 20).forEach(w => console.log(`   • ${w}`));
      if (warnings.length > 20) console.log(`   ... y ${warnings.length - 20} advertencias más.`);
    }
  }
  console.log(`==================================================\n`);
}

const targetFile = process.argv[2] || 'searchResults.csv';
validateCSV(targetFile);
