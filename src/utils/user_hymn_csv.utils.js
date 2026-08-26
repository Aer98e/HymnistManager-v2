import { parseCSV } from './csv.utils.js';

// Mapa de notas para validación y conversión rápida (Spanish & English notation)
export const NOTE_MAP = {
  'do': 1, 'c': 1,
  'do#': 2, 'c#': 2, 'dos': 2,
  're': 3, 'd': 3,
  'mib': 4, 'eb': 4,
  'mi': 5, 'e': 5,
  'fa': 6, 'f': 6,
  'fa#': 7, 'f#': 7, 'fas': 7,
  'sol': 8, 'g': 8,
  'sol#': 9, 'g#': 9, 'sols': 9,
  'la': 10, 'a': 10,
  'sib': 11, 'bb': 11,
  'si': 12, 'b': 12,
  'reb': 13, 'db': 13,
  're#': 14, 'd#': 14, 'res': 14,
  'solb': 15, 'gb': 15,
  'lab': 16, 'ab': 16,
  'la#': 17, 'a#': 17, 'las': 17
};

export const NOTE_NAMES_BY_ID = {
  1: 'Do', 2: 'Do#', 3: 'Re', 4: 'Mib', 5: 'Mi', 6: 'Fa', 7: 'Fa#', 8: 'Sol', 9: 'Sol#', 10: 'La',
  11: 'Sib', 12: 'Si', 13: 'Reb', 14: 'Re#', 15: 'Solb', 16: 'Lab', 17: 'La#'
};

/**
 * Genera el contenido de una plantilla CSV para la carga masiva de user_hymn.
 * @param {Array} hymns - Lista de himnos con sus relaciones de himnario.
 * @param {Array} existingUserHymns - Atributos actuales de user_hymn si existen.
 */
export function generateUserHymnCSVTemplate(hymns = [], existingUserHymns = []) {
  const headers = [
    'ID_Himno',
    'Himnario',
    'Numero',
    'Titulo',
    'Tonalidad',
    'Modo',
    'Nota_Mas_Alta',
    'Octava_Mas_Alta',
    'Nota_Mas_Baja',
    'Octava_Mas_Baja',
    'Modulacion',
    'Energia'
  ];

  const userHymnMap = new Map();
  (existingUserHymns || []).forEach(uh => {
    userHymnMap.set(uh.hymn_id, uh);
  });

  const rows = [headers.join(',')];

  hymns.forEach(hymn => {
    const existing = userHymnMap.get(hymn.id) || {};

    const hymnalName = (hymn.hymnal_hymn && hymn.hymnal_hymn[0] && hymn.hymnal_hymn[0].hymnal)
      ? hymn.hymnal_hymn[0].hymnal.name
      : 'General';

    const hymnalNumber = (hymn.hymnal_hymn && hymn.hymnal_hymn[0])
      ? hymn.hymnal_hymn[0].number
      : '';

    const keyName = existing.key_id ? (NOTE_NAMES_BY_ID[existing.key_id] || '') : '';
    const keyMode = existing.key_mode ? (existing.key_mode === 'minor' ? 'Menor' : 'Mayor') : '';
    const highestNote = existing.highest_note_id ? (NOTE_NAMES_BY_ID[existing.highest_note_id] || '') : '';
    const highestOctave = existing.highest_octave ?? '';
    const lowestNote = existing.lowest_note_id ? (NOTE_NAMES_BY_ID[existing.lowest_note_id] || '') : '';
    const lowestOctave = existing.lowest_octave ?? '';
    const modulation = existing.has_modulation ? 'Si' : 'No';
    const energy = existing.energy ?? '';

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    rows.push([
      escapeCsv(hymn.id),
      escapeCsv(hymnalName),
      escapeCsv(hymnalNumber),
      escapeCsv(hymn.title_es),
      escapeCsv(keyName),
      escapeCsv(keyMode),
      escapeCsv(highestNote),
      escapeCsv(highestOctave),
      escapeCsv(lowestNote),
      escapeCsv(lowestOctave),
      escapeCsv(modulation),
      escapeCsv(energy)
    ].join(','));
  });

  // UTF-8 BOM prefix for Excel compatibility
  return '\uFEFF' + rows.join('\n');
}

/**
 * Valida y parsea el archivo CSV cargado para user_hymn.
 * @param {string} csvText - Texto del archivo CSV subido.
 * @returns {{ validRecords: Array, errors: Array }}
 */
export function parseAndValidateUserHymnCSV(csvText) {
  const parsedRows = parseCSV(csvText);
  if (!parsedRows || parsedRows.length < 2) {
    return {
      validRecords: [],
      errors: [{ line: 1, message: 'El archivo CSV está vacío o carece de encabezados.' }]
    };
  }

  // Mapear encabezados por nombre
  const headerRow = parsedRows[0].map(h => h.trim().toLowerCase());
  const getCol = (row, fieldNames) => {
    for (const name of fieldNames) {
      const idx = headerRow.findIndex(h => h.includes(name.toLowerCase()));
      if (idx !== -1 && row[idx] !== undefined) {
        return row[idx].trim();
      }
    }
    return '';
  };

  const validRecords = [];
  const errors = [];

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length === 0 || (row.length === 1 && !row[0].trim())) continue;

    const lineNo = i + 1;
    const hymnId = getCol(row, ['id_himno', 'hymn_id', 'id']);
    const title = getCol(row, ['titulo', 'title']);
    const keyRaw = getCol(row, ['tonalidad', 'key']);
    const modeRaw = getCol(row, ['modo', 'mode']);
    const highestNoteRaw = getCol(row, ['nota_mas_alta', 'highest_note']);
    const highestOctaveRaw = getCol(row, ['octava_mas_alta', 'highest_octave']);
    const lowestNoteRaw = getCol(row, ['nota_mas_baja', 'lowest_note']);
    const lowestOctaveRaw = getCol(row, ['octava_mas_baja', 'lowest_octave']);
    const modulationRaw = getCol(row, ['modulacion', 'has_modulation']);
    const energyRaw = getCol(row, ['energia', 'energy']);

    if (!hymnId) {
      errors.push({ line: lineNo, message: `Fila ${lineNo}: Falta el ID_Himno.` });
      continue;
    }

    const recordErrors = [];

    // Validar Tonalidad Principal
    let keyId = null;
    if (keyRaw) {
      const normalizedKey = keyRaw.toLowerCase().replace(/\s+/g, '');
      if (NOTE_MAP[normalizedKey] !== undefined) {
        keyId = NOTE_MAP[normalizedKey];
      } else {
        recordErrors.push(`Tonalidad invalida "${keyRaw}". Use valores como Do, Re, Mi, Fa, Sol, La, Si, C, D, Eb, etc.`);
      }
    }

    // Validar Modo (Major/Minor)
    let keyMode = 'major';
    if (modeRaw) {
      const normMode = modeRaw.toLowerCase();
      if (normMode.includes('menor') || normMode.includes('minor') || normMode === 'm') {
        keyMode = 'minor';
      } else if (normMode.includes('mayor') || normMode.includes('major') || normMode === 'm') {
        keyMode = 'major';
      } else {
        recordErrors.push(`Modo invalido "${modeRaw}". Use "Mayor" o "Menor".`);
      }
    }

    // Validar Nota Mas Alta
    let highestNoteId = null;
    if (highestNoteRaw) {
      const norm = highestNoteRaw.toLowerCase().replace(/\s+/g, '');
      if (NOTE_MAP[norm] !== undefined) {
        highestNoteId = NOTE_MAP[norm];
      } else {
        recordErrors.push(`Nota Mas Alta invalida "${highestNoteRaw}".`);
      }
    }

    // Validar Octava Mas Alta
    let highestOctave = null;
    if (highestOctaveRaw) {
      const oct = parseInt(highestOctaveRaw, 10);
      if (!isNaN(oct) && oct >= 1 && oct <= 8) {
        highestOctave = oct;
      } else {
        recordErrors.push(`Octava Mas Alta invalida "${highestOctaveRaw}" (debe ser un numero entre 1 y 8).`);
      }
    }

    // Validar Nota Mas Baja
    let lowestNoteId = null;
    if (lowestNoteRaw) {
      const norm = lowestNoteRaw.toLowerCase().replace(/\s+/g, '');
      if (NOTE_MAP[norm] !== undefined) {
        lowestNoteId = NOTE_MAP[norm];
      } else {
        recordErrors.push(`Nota Mas Baja invalida "${lowestNoteRaw}".`);
      }
    }

    // Validar Octava Mas Baja
    let lowestOctave = null;
    if (lowestOctaveRaw) {
      const oct = parseInt(lowestOctaveRaw, 10);
      if (!isNaN(oct) && oct >= 1 && oct <= 8) {
        lowestOctave = oct;
      } else {
        recordErrors.push(`Octava Mas Baja invalida "${lowestOctaveRaw}" (debe ser un numero entre 1 y 8).`);
      }
    }

    // Validar Modulación
    let hasModulation = false;
    if (modulationRaw) {
      const norm = modulationRaw.toLowerCase();
      hasModulation = norm.includes('si') || norm.includes('sí') || norm.includes('true') || norm === '1';
    }

    // Validar Energía (1-5)
    let energy = null;
    if (energyRaw) {
      const n = parseInt(energyRaw, 10);
      if (!isNaN(n) && n >= 1 && n <= 5) {
        energy = n;
      } else {
        recordErrors.push(`Energia invalida "${energyRaw}" (debe ser un numero de 1 a 5).`);
      }
    }

    if (recordErrors.length > 0) {
      errors.push({
        line: lineNo,
        title: title || hymnId,
        message: `Fila ${lineNo} (${title || hymnId}): ${recordErrors.join(' | ')}`
      });
    } else {
      validRecords.push({
        hymn_id: hymnId,
        key_id: keyId,
        key_mode: keyMode,
        highest_note_id: highestNoteId,
        highest_octave: highestOctave,
        lowest_note_id: lowestNoteId,
        lowest_octave: lowestOctave,
        has_modulation: hasModulation,
        energy: energy,
        _title: title
      });
    }
  }

  return { validRecords, errors };
}
