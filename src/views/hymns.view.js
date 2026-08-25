import { hymnsService } from '../services/hymns.service.js';
import { createModal } from '../components/modal.js';

export async function renderHymnsView() {
  const hymns = await hymnsService.getHymns();
  const categories = await hymnsService.getCategories();

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            🎵 Biblioteca de Himnos
          </h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Explora himnos globales y personaliza sus atributos musicales para tu iglesia
          </p>
        </div>
        <button id="add-hymn-btn" style="
          background: var(--gradient-primary); border: none; color: white; padding: 0.65rem 1.2rem;
          border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
        ">
          <span>➕</span> Añadir Himno
        </button>
      </div>

      <!-- Filters Bar -->
      <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
        <input type="text" id="hymn-search-input" placeholder="🔍 Buscar por título o compositor..." style="
          flex: 1; min-width: 250px; padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-color);
          border-radius: var(--radius-md); color: var(--text-main); font-size: 0.95rem; outline: none;
        " />
        <select id="hymn-category-filter" style="
          padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-color);
          border-radius: var(--radius-md); color: var(--text-main); font-size: 0.95rem; outline: none; cursor: pointer;
        ">
          <option value="">Todas las categorías</option>
          ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
        </select>
      </div>

      <!-- Hymns Grid -->
      <div id="hymns-list-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
        ${renderHymnCards(hymns)}
      </div>
    </div>
  `;
}

function renderHymnCards(hymns) {
  if (hymns.length === 0) {
    return `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No se encontraron himnos.</div>`;
  }

  return hymns.map(hymn => `
    <div style="
      background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;
      transition: var(--transition-fast);
    " class="hymn-card" data-hymn-id="${hymn.id}">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem;">
          <h3 style="font-size: 1.1rem; color: var(--text-main); font-weight: 600;">${hymn.title_es}</h3>
          <span style="
            font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 20px; font-weight: 600;
            background: ${hymn.type === 'public' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)'};
            color: ${hymn.type === 'public' ? 'var(--status-success)' : 'var(--accent)'};
          ">
            ${hymn.type === 'public' ? 'Público' : 'Privado'}
          </span>
        </div>
        ${hymn.title_original ? `<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic;">Original: ${hymn.title_original}</div>` : ''}
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem;">Compositor: ${hymn.composer || 'Desconocido'}</div>
        ${hymn.first_line ? `<div style="font-size: 0.8rem; color: var(--accent-cyan); margin-top: 0.4rem; font-style: italic;">🎶 1ª Estrofa: "${hymn.first_line}"</div>` : ''}
        ${hymn.refrain_first_line ? `<div style="font-size: 0.8rem; color: var(--status-warning); margin-top: 0.2rem; font-style: italic;">✨ Coro: "${hymn.refrain_first_line}"</div>` : ''}
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.5rem; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
        <button class="configure-music-btn" data-hymn-id="${hymn.id}" data-hymn-title="${hymn.title_es}" style="
          background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main);
          padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer;
        ">
          🎼 Tonalidad & Atributos
        </button>
      </div>
    </div>
  `).join('');
}

export function setupHymnsEvents() {
  const searchInput = document.getElementById('hymn-search-input');
  const categoryFilter = document.getElementById('hymn-category-filter');
  const container = document.getElementById('hymns-list-container');
  const addBtn = document.getElementById('add-hymn-btn');

  const filterHandler = async () => {
    const query = searchInput ? searchInput.value : '';
    const catId = categoryFilter ? categoryFilter.value : null;
    const hymns = await hymnsService.getHymns(query, catId);
    if (container) container.innerHTML = renderHymnCards(hymns);
    attachCardEvents();
  };

  if (searchInput) searchInput.addEventListener('input', filterHandler);
  if (categoryFilter) categoryFilter.addEventListener('change', filterHandler);

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      createModal('Añadir Nuevo Himno', `
        <form id="create-hymn-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Título en Español *</label>
            <input type="text" id="new-title-es" required style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Primera Línea (1ª Estrofa)</label>
            <input type="text" id="new-first-line" placeholder="ej. Sublime gracia del Señor que a un pecador salvó" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Primera Línea del Coro / Estribillo</label>
            <input type="text" id="new-refrain-line" placeholder="ej. En la cruz, en la cruz, do primero vi la luz" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Título Original</label>
            <input type="text" id="new-title-orig" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Compositor</label>
            <input type="text" id="new-composer" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
        </form>
      `, async () => {
        const titleEs = document.getElementById('new-title-es').value;
        const firstLine = document.getElementById('new-first-line').value;
        const refrainLine = document.getElementById('new-refrain-line').value;
        const titleOrig = document.getElementById('new-title-orig').value;
        const composer = document.getElementById('new-composer').value;

        await hymnsService.createHymn({
          title_es: titleEs,
          first_line: firstLine || null,
          refrain_first_line: refrainLine || null,
          title_original: titleOrig || null,
          composer: composer || null
        });
        filterHandler();
      });
    });
  }


  attachCardEvents();
}

function attachCardEvents() {
  document.querySelectorAll('.configure-music-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const hymnId = e.currentTarget.getAttribute('data-hymn-id');
      const hymnTitle = e.currentTarget.getAttribute('data-hymn-title');
      const notes = await hymnsService.getNotes();
      const existing = await hymnsService.getUserHymnAttributes(hymnId) || {};

      createModal(`Configuración Musical: ${hymnTitle}`, `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Tonalidad Usada</label>
              <select id="attr-key" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                <option value="">Seleccionar nota</option>
                ${notes.map(n => `<option value="${n.id}" ${existing.key_id === n.id ? 'selected' : ''}>${n.name_es} (${n.name_en})</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Modo de Tonalidad</label>
              <select id="attr-key-mode" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                <option value="major" ${existing.key_mode === 'major' ? 'selected' : ''}>Mayor</option>
                <option value="minor" ${existing.key_mode === 'minor' ? 'selected' : ''}>Menor</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Energía (1 - 5)</label>
              <input type="number" id="attr-energy" min="1" max="5" value="${existing.energy || 3}" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
            </div>
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">¿Tiene Modulación?</label>
              <select id="attr-modulation" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                <option value="false" ${!existing.has_modulation ? 'selected' : ''}>No</option>
                <option value="true" ${existing.has_modulation ? 'selected' : ''}>Sí</option>
              </select>
            </div>
          </div>
        </form>
      `, async () => {
        const keyId = document.getElementById('attr-key').value;
        const keyMode = document.getElementById('attr-key-mode').value;
        const energy = document.getElementById('attr-energy').value;
        const modulation = document.getElementById('attr-modulation').value === 'true';

        await hymnsService.saveUserHymnAttributes(hymnId, {
          key_id: keyId ? parseInt(keyId, 10) : null,
          key_mode: keyMode,
          energy: parseInt(energy, 10),
          has_modulation: modulation
        });
      });
    });
  });
}
