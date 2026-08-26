/**
 * Parsea una cadena de texto en formato CSV respetando comillas RFC 4180, saltos de línea y delimitadores.
 * @param {string} text - Contenido en texto del archivo CSV.
 * @param {string} delimiter - Delimitador (por defecto ',')
 * @returns {Array<Array<string>>} Matriz de filas y columnas.
 */
export function parseCSV(text, delimiter = ',') {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  // Limpiar BOM si existe
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 2;
        continue;
      } else {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !inQuotes) {
      currentRow.push(currentCell.trim());
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';

      if (char === '\r' && nextChar === '\n') {
        i += 2;
      } else {
        i++;
      }
      continue;
    }

    currentCell += char;
    i++;
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows;
}
