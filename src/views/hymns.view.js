import { hymnsService } from '../services/hymns.service.js';
import { hymnalsService } from '../services/hymnals.service.js';
import { authService } from '../services/auth.service.js';
import { createModal, showConfirmModal, showToast } from '../components/modal.js';
import { normalizeText } from '../utils/text.utils.js';

export async function renderHymnsView() {
  const hymns = await hymnsService.getHymns();
  const categories = await hymnsService.getCategories();
  const currentUser = await authService.getCurrentUser();

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            🎵 Biblioteca de Himnos
          </h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Explora himnos globales, gestiona tus himnos sueltos y personaliza atributos musicales
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
        <input type="text" id="hymn-search-input" placeholder="🔍 Buscar por título, compositor, primera línea (omite tildes y comas)..." style="
          flex: 1; min-width: 250px; padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-color);
          border-radius: var(--radius-md); color: var(--text-main); font-size: 0.95rem; outline: none;
        " />
        
        <select id="hymn-type-filter" style="
          padding: 0.75rem 1rem; background: var(--bg-surface); border: 1px solid var(--border-color);
          border-radius: var(--radius-md); color: var(--text-main); font-size: 0.95rem; outline: none; cursor: pointer;
        ">
          <option value="all">📚 Todos los Himnos</option>
          <option value="user_loose">🧩 Mis Himnos Sueltos (Privados)</option>
          <option value="public_loose">🌐 Himnos Sueltos Públicos</option>
        </select>

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
        ${renderHymnCards(hymns, currentUser, 'all')}
      </div>
    </div>
  `;
}

function renderHymnCards(hymns, currentUser, typeFilter = 'all') {
  if (!hymns || hymns.length === 0) {
    let emptyMsg = 'No se encontraron himnos.';
    if (typeFilter === 'user_loose') emptyMsg = '✨ No tienes himnos sueltos privados. (Los himnos sin himnario aparecerán aquí).';
    if (typeFilter === 'public_loose') emptyMsg = '✨ No hay himnos sueltos públicos sin himnario en este momento.';
    return `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">${emptyMsg}</div>`;
  }

  const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

  return hymns.map(hymn => {
    const isOwner = currentUser && (hymn.created_by === currentUser.id);
    const canDelete = (isOwner && hymn.type === 'private') || isAdmin;

    return `
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
          
          ${hymn.hymnal_hymn && hymn.hymnal_hymn.length > 0 ? `
            <div style="font-size: 0.8rem; color: var(--accent-cyan); margin-top: 0.4rem;">
              📖 Vinculado en: ${hymn.hymnal_hymn.map(hh => `${hh.hymnal ? hh.hymnal.name : 'Himnario'} (<strong style="color: white;">#${hh.number}</strong>)`).join(', ')}
            </div>
          ` : `
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.4rem; font-style: italic;">
              🧩 Himno suelto (Sin himnario)
            </div>
          `}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <button class="configure-music-btn" data-hymn-id="${hymn.id}" data-hymn-title="${hymn.title_es}" style="
            background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main);
            padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer;
          ">
            🎼 Tonalidad & Atributos
          </button>

          ${canDelete ? `
            <button class="delete-hymn-btn" data-hymn-id="${hymn.id}" data-hymn-title="${hymn.title_es}" title="Eliminar Himno" style="
              background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-danger);
              padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer; font-weight: 500;
            ">
              🗑️ Eliminar
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

export function setupHymnsEvents() {
  const searchInput = document.getElementById('hymn-search-input');
  const typeFilter = document.getElementById('hymn-type-filter');
  const categoryFilter = document.getElementById('hymn-category-filter');
  const container = document.getElementById('hymns-list-container');
  const addBtn = document.getElementById('add-hymn-btn');

  const filterHandler = async () => {
    const rawQuery = searchInput ? searchInput.value : '';
    const normalizedQuery = normalizeText(rawQuery);
    const selectedType = typeFilter ? typeFilter.value : 'all';
    const catId = categoryFilter ? categoryFilter.value : null;

    let hymns = [];
    if (selectedType === 'user_loose') {
      hymns = await hymnalsService.getUserLooseHymns();
    } else if (selectedType === 'public_loose') {
      hymns = await hymnalsService.getPublicLooseHymns();
    } else {
      hymns = await hymnsService.getHymns('', catId);
    }

    // Busqueda permisiva que ignora tildes, acentos, comas y signos
    if (normalizedQuery) {
      hymns = hymns.filter(h => {
        const titleEs = normalizeText(h.title_es);
        const titleOrig = normalizeText(h.title_original);
        const composer = normalizeText(h.composer);
        const firstLine = normalizeText(h.first_line);
        const refrainLine = normalizeText(h.refrain_first_line);

        return titleEs.includes(normalizedQuery) ||
               titleOrig.includes(normalizedQuery) ||
               composer.includes(normalizedQuery) ||
               firstLine.includes(normalizedQuery) ||
               refrainLine.includes(normalizedQuery);
      });
    }

    const currentUser = await authService.getCurrentUser();
    if (container) container.innerHTML = renderHymnCards(hymns, currentUser, selectedType);
    attachCardEvents(filterHandler);
  };

  if (searchInput) searchInput.addEventListener('input', filterHandler);
  if (typeFilter) typeFilter.addEventListener('change', filterHandler);
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
        showToast('Himno añadido con éxito.', 'success');
        filterHandler();
      });
    });
  }

  attachCardEvents(filterHandler);
}

function attachCardEvents(refreshCallback) {
  // Configure music attributes
  document.querySelectorAll('.configure-music-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const hymnId = e.currentTarget.getAttribute('data-hymn-id');
      const hymnTitle = e.currentTarget.getAttribute('data-hymn-title');
      
      try {
        const notes = await hymnsService.getNotes();
        const existing = await hymnsService.getUserHymnAttributes(hymnId) || {};

        const notesOptionsHtml = notes && notes.length > 0 
          ? notes.map(n => `<option value="${n.id}" ${existing.key_id === n.id ? 'selected' : ''}>${n.name_es} (${n.name_en})</option>`).join('')
          : '<option value="">No hay notas cargadas en la BD</option>';

        createModal(`Configuración Musical: ${hymnTitle}`, `
          <form style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Tonalidad Usada</label>
                <select id="attr-key" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                  <option value="">Seleccionar nota</option>
                  ${notesOptionsHtml}
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
          showToast('Atributos musicales guardados.', 'success');
        });
      } catch (err) {
        showToast(`Error al cargar notas: ${err.message}`, 'error');
      }
    });
  });

  // Delete hymn handler with program impact check
  document.querySelectorAll('.delete-hymn-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const hymnId = e.currentTarget.getAttribute('data-hymn-id');
      const hymnTitle = e.currentTarget.getAttribute('data-hymn-title');

      try {
        const affectedPrograms = await hymnsService.getHymnProgramUsage(hymnId);

        let warningMessage = `¿Estás seguro de que deseas eliminar permanentemente el himno "${hymnTitle}"?`;
        
        if (affectedPrograms && affectedPrograms.length > 0) {
          const programList = affectedPrograms.map(p => 
            `• ${p.name || 'Programa sin nombre'} (${p.date}) - Contexto: ${p.context ? p.context.name : 'General'}`
          ).join('\n');

          warningMessage = `⚠️ ¡ADVERTENCIA DE IMPACTO!\n\nEste himno está registrado en ${affectedPrograms.length} programa(s):\n\n${programList}\n\nSi confirmas la eliminación, el himno se removerá permanentemente de estos programas. ¿Deseas continuar?`;
        }

        showConfirmModal({
          title: '¿Eliminar Himno?',
          message: warningMessage.replace(/\n/g, '<br>'),
          confirmText: '🗑️ Sí, Eliminar',
          danger: true,
          onConfirm: async () => {
            await hymnsService.deleteHymn(hymnId);
            showToast(`Himno "${hymnTitle}" eliminado con éxito.`, 'success');
            if (refreshCallback) refreshCallback();
          }
        });
      } catch (err) {
        showToast(`Error al consultar programas: ${err.message}`, 'error');
      }
    });
  });
}
