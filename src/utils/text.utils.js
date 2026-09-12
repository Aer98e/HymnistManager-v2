/**
 * Normaliza cadenas de texto eliminando acentos/tildes, signos de puntuación
 * y espacios redundantes para búsquedas y comparaciones altamente permisivas.
 */
export function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos/tildes
    .replace(/[^a-z0-9\s]/g, '')     // Elimina signos y puntuación
    .trim();
}

export function debounce(callback, delay = 300) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}

/**
 * Calcula la similitud relativa entre dos cadenas usando coincidencia difusa (token overlap + subcadena).
 * @returns {number} Coeficiente entre 0.0 y 1.0
 */
export function calculateStringSimilarity(str1, str2) {
  const norm1 = normalizeText(str1);
  const norm2 = normalizeText(str2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;

  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    if (minLen / maxLen > 0.55) return 0.88;
  }

  const tokens1 = new Set(norm1.split(/\s+/));
  const tokens2 = new Set(norm2.split(/\s+/));
  
  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * Pondera la coincidencia entre dos himnos combinando Título (60%), 1ª Estrofa (25%) y Compositor (15%).
 * @returns {number} Score de 0 a 100
 */
export function computeHymnMatchScore(localHymn, publicHymn) {
  const titleScore = Math.max(
    calculateStringSimilarity(localHymn.title_es, publicHymn.title_es),
    calculateStringSimilarity(localHymn.title_original, publicHymn.title_es),
    calculateStringSimilarity(localHymn.title_es, publicHymn.title_original)
  );

  let firstLineScore = 0;
  if (localHymn.first_line && publicHymn.first_line) {
    firstLineScore = calculateStringSimilarity(localHymn.first_line, publicHymn.first_line);
  }

  let composerScore = 0;
  if (localHymn.composer && publicHymn.composer) {
    composerScore = calculateStringSimilarity(localHymn.composer, publicHymn.composer);
  }

  let finalScore = (titleScore * 0.60) + (firstLineScore * 0.25) + (composerScore * 0.15);

  if (titleScore >= 0.60) finalScore = Math.max(finalScore, titleScore);

  return Math.round(finalScore * 100);
}
