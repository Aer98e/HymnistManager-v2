import { hymnsService } from '../services/hymns.service.js';
import { hymnalsService } from '../services/hymnals.service.js';
import { authService } from '../services/auth.service.js';
import { createModal, showConfirmModal, showToast } from '../components/modal.js';
import { normalizeText } from '../utils/text.utils.js';
import { generateUserHymnCSVTemplate, parseAndValidateUserHymnCSV } from '../utils/user_hymn_csv.utils.js';

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
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; position: relative;">
          <!-- Dropdown Trigger for Tonalities Tools -->
          <div style="position: relative; display: inline-block;">
            <button id="tonalities-dropdown-toggle" style="
              background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.35); color: #c084fc;
              padding: 0.65rem 1.1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
            ">
              <span>🎼</span> Tonalidades y Atributos <span style="font-size: 0.75rem;">▼</span>
            </button>

            <!-- Dropdown Menu items -->
            <div id="tonalities-dropdown-menu" style="
              display: none; position: absolute; right: 0; top: calc(100% + 0.5rem); min-width: 230px;
              background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
              box-shadow: 0 10px 25px rgba(0,0,0,0.5); z-index: 200; padding: 0.5rem; backdrop-filter: blur(12px);
              flex-direction: column; gap: 0.25rem;
            ">
              <button id="wizard-user-hymn-btn" style="
                width: 100%; text-align: left; background: transparent; border: none; color: var(--text-main);
                padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.88rem;
                display: flex; align-items: center; gap: 0.5rem; transition: background 0.15s ease;
              " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                <span>🪄</span> Asistente In-App (Paso a Paso)
              </button>
              <button id="manage-user-hymn-btn" style="
                width: 100%; text-align: left; background: transparent; border: none; color: var(--text-main);
                padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.88rem;
                display: flex; align-items: center; gap: 0.5rem; transition: background 0.15s ease;
              " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                <span>⚙️</span> Mis Tonalidades Guardadas
              </button>
              <div style="height: 1px; background: var(--border-color); margin: 0.2rem 0;"></div>
              <button id="export-user-hymn-csv-btn" style="
                width: 100%; text-align: left; background: transparent; border: none; color: var(--text-main);
                padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.88rem;
                display: flex; align-items: center; gap: 0.5rem; transition: background 0.15s ease;
              " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                <span>📥</span> Descargar Plantilla CSV
              </button>
              <button id="import-user-hymn-csv-btn" style="
                width: 100%; text-align: left; background: transparent; border: none; color: var(--text-main);
                padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.88rem;
                display: flex; align-items: center; gap: 0.5rem; transition: background 0.15s ease;
              " onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='transparent'">
                <span>📤</span> Importar Tonalidades CSV
              </button>
            </div>
          </div>

          <button id="add-hymn-btn" style="
            background: var(--gradient-primary); border: none; color: white; padding: 0.65rem 1.2rem;
            border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          ">
            <span>➕</span> Añadir Himno
          </button>
        </div>
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

  // Dropdown de herramientas de tonalidad
  const tonalitiesToggle = document.getElementById('tonalities-dropdown-toggle');
  const tonalitiesMenu = document.getElementById('tonalities-dropdown-menu');

  if (tonalitiesToggle && tonalitiesMenu) {
    tonalitiesToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = tonalitiesMenu.style.display === 'flex';
      tonalitiesMenu.style.display = isVisible ? 'none' : 'flex';
    });

    document.addEventListener('click', () => {
      tonalitiesMenu.style.display = 'none';
    });
  }

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

  // Wizard In-App
  const wizardBtn = document.getElementById('wizard-user-hymn-btn');
  if (wizardBtn) {
    wizardBtn.addEventListener('click', async () => {
      try {
        const hymnals = await hymnalsService.getHymnals();
        const hymnalCheckboxes = hymnals.map(h => `
          <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.9rem; cursor: pointer; padding: 0.3rem 0;">
            <input type="checkbox" class="wizard-hymnal-cb" value="${h.id}" checked />
            📖 <strong>${h.name}</strong> <span style="color: var(--text-muted); font-size: 0.8rem;">(${h.type})</span>
          </label>
        `).join('');

        createModal('🪄 Asistente In-App: Selección de Himnarios', `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Selecciona los himnarios que deseas configurar. El asistente te guiará himno por himno para asignar la tonalidad, modo, octavas y energía de forma secuencial.
            </p>
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem;">
              <button type="button" id="wiz-select-all" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.8rem; cursor: pointer;">Seleccionar Todos</button>
              <button type="button" id="wiz-deselect-all" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.8rem; cursor: pointer;">Desmarcar Todos</button>
            </div>
            <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; display: flex; flex-direction: column;">
              ${hymnalCheckboxes}
            </div>
          </div>
        `, async () => {
          const selectedCbs = document.querySelectorAll('.wizard-hymnal-cb:checked');
          const selectedIds = Array.from(selectedCbs).map(cb => cb.value);

          const hymnsList = await hymnsService.getHymnsByHymnalIds(selectedIds);
          if (!hymnsList || hymnsList.length === 0) {
            showToast('No se encontraron himnos en los himnarios seleccionados.', 'warning');
            return;
          }

          const notes = await hymnsService.getNotes();
          const existingUserHymns = await hymnsService.getUserHymnsAll();

          startWizardSequence(hymnsList, notes, existingUserHymns, filterHandler);
        });

        setTimeout(() => {
          const selAll = document.getElementById('wiz-select-all');
          const deselAll = document.getElementById('wiz-deselect-all');
          if (selAll) selAll.addEventListener('click', () => document.querySelectorAll('.wizard-hymnal-cb').forEach(c => c.checked = true));
          if (deselAll) deselAll.addEventListener('click', () => document.querySelectorAll('.wizard-hymnal-cb').forEach(c => c.checked = false));
        }, 100);
      } catch (err) {
        showToast(`Error al iniciar asistente: ${err.message}`, 'error');
      }
    });
  }

  // Manage User Hymn Modal
  const manageBtn = document.getElementById('manage-user-hymn-btn');
  if (manageBtn) {
    manageBtn.addEventListener('click', async () => {
      try {
        const userHymns = await hymnsService.getUserHymnListFull();

        const renderList = (filter = '') => {
          const filtered = userHymns.filter(item => {
            const title = item.hymn ? item.hymn.title_es.toLowerCase() : '';
            return title.includes(filter.toLowerCase());
          });

          if (filtered.length === 0) {
            return `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No tienes tonalidades o atributos personalizados guardados.</div>`;
          }

          return `
            <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto;">
              ${filtered.map(item => {
                const hymnTitle = item.hymn ? item.hymn.title_es : 'Himno';
                const keyName = item.key_note ? item.key_note.name_es : 'Sin nota';
                const keyMode = item.key_mode === 'minor' ? 'm' : 'Mayor';
                const energy = item.energy ? `⚡${item.energy}/5` : '';

                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); padding: 0.6rem 0.8rem; border-radius: var(--radius-md);">
                    <div>
                      <strong style="color: var(--text-main); font-size: 0.9rem;">${hymnTitle}</strong>
                      <div style="font-size: 0.8rem; color: #93c5fd;">🎼 Tono: ${keyName} ${keyMode} | ${energy}</div>
                    </div>
                    <button class="delete-user-hymn-entry-btn" data-hymn-id="${item.hymn_id}" data-title="${hymnTitle}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                      🗑️ Eliminar
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        };

        createModal('⚙️ Gestionar Mis Tonalidades Guardadas', `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <p style="color: var(--text-muted); font-size: 0.85rem;">
              Lista de todas tus tonalidades y configuraciones musicales personalizadas. Eliminar un registro simplemente restaurará el himno a su estado inicial.
            </p>

            <input type="text" id="manage-filter-input" placeholder="🔍 Filtrar por título de himno..." style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />

            <div id="manage-hymns-list-container">
              ${renderList('')}
            </div>
          </div>
        `, null);

        setTimeout(() => {
          const filterInput = document.getElementById('manage-filter-input');
          const listContainer = document.getElementById('manage-hymns-list-container');

          const attachDeleteEvents = () => {
            document.querySelectorAll('.delete-user-hymn-entry-btn').forEach(delBtn => {
              delBtn.addEventListener('click', async (e) => {
                const hId = e.currentTarget.getAttribute('data-hymn-id');
                const hTitle = e.currentTarget.getAttribute('data-title');

                showConfirmModal({
                  title: '¿Eliminar Tonalidad Guardada?',
                  message: `¿Estás seguro de que deseas eliminar la configuración musical de "${hTitle}"? El himno volverá a su estado original sin tonalidad personalizada.`,
                  confirmText: '🗑️ Sí, Eliminar',
                  danger: true,
                  onConfirm: async () => {
                    await hymnsService.deleteUserHymn(hId);
                    showToast(`Tonalidad de "${hTitle}" eliminada.`, 'success');
                    
                    const idx = userHymns.findIndex(x => x.hymn_id === hId);
                    if (idx !== -1) userHymns.splice(idx, 1);
                    
                    listContainer.innerHTML = renderList(filterInput ? filterInput.value : '');
                    attachDeleteEvents();
                    filterHandler();
                  }
                });
              });
            });
          };

          if (filterInput && listContainer) {
            filterInput.addEventListener('input', (e) => {
              listContainer.innerHTML = renderList(e.target.value);
              attachDeleteEvents();
            });
          }

          attachDeleteEvents();
        }, 100);
      } catch (err) {
        showToast(`Error al abrir administrador: ${err.message}`, 'error');
      }
    });
  }

  // Export User Hymn CSV Template
  const exportCsvBtn = document.getElementById('export-user-hymn-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      try {
        const hymnals = await hymnalsService.getHymnals();
        const hymnalCheckboxes = hymnals.map(h => `
          <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.9rem; cursor: pointer; padding: 0.3rem 0;">
            <input type="checkbox" class="hymnal-select-cb" value="${h.id}" checked />
            📖 <strong>${h.name}</strong> <span style="color: var(--text-muted); font-size: 0.8rem;">(${h.type})</span>
          </label>
        `).join('');

        createModal('📥 Exportar Plantilla de Tonalidades CSV', `
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <p style="color: var(--text-muted); font-size: 0.9rem;">
              Selecciona los himnarios cuyos himnos deseas incluir en el archivo CSV de trabajo. 
              El archivo incluirá campos para <strong>Tonalidad, Modo (Mayor/Menor), Nota Más Alta/Baja, Octavas, Modulación y Energía</strong>.
            </p>
            <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 0.5rem;">
              <button type="button" id="select-all-hymnals-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.8rem; cursor: pointer;">Seleccionar Todos</button>
              <button type="button" id="deselect-all-hymnals-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.3rem 0.6rem; border-radius: var(--radius-sm); font-size: 0.8rem; cursor: pointer;">Desmarcar Todos</button>
            </div>
            <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; display: flex; flex-direction: column;">
              ${hymnalCheckboxes || '<span style="color: var(--text-muted);">No hay himnarios registrados. Se incluirán todos los himnos globales.</span>'}
            </div>
          </div>
        `, async () => {
          const selectedCbs = document.querySelectorAll('.hymnal-select-cb:checked');
          const selectedIds = Array.from(selectedCbs).map(cb => cb.value);

          const hymnsToExport = await hymnsService.getHymnsByHymnalIds(selectedIds);
          const existingUserHymns = await hymnsService.getUserHymnsAll();

          const csvContent = generateUserHymnCSVTemplate(hymnsToExport, existingUserHymns);

          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `plantilla_tonalidades_user_hymn_${new Date().toISOString().slice(0, 10)}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          showToast('Plantilla CSV generada y descargada con éxito.', 'success');
        });

        setTimeout(() => {
          const selectAllBtn = document.getElementById('select-all-hymnals-btn');
          const deselectAllBtn = document.getElementById('deselect-all-hymnals-btn');
          if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
              document.querySelectorAll('.hymnal-select-cb').forEach(cb => cb.checked = true);
            });
          }
          if (deselectAllBtn) {
            deselectAllBtn.addEventListener('click', () => {
              document.querySelectorAll('.hymnal-select-cb').forEach(cb => cb.checked = false);
            });
          }
        }, 100);
      } catch (err) {
        showToast(`Error al preparar la plantilla CSV: ${err.message}`, 'error');
      }
    });
  }

  // Import User Hymn CSV
  const importCsvBtn = document.getElementById('import-user-hymn-csv-btn');
  if (importCsvBtn) {
    importCsvBtn.addEventListener('click', () => {
      let validatedData = null;

      createModal('📤 Cargar y Validar Tonalidades desde CSV', `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Selecciona el archivo CSV editado. El sistema verificará automáticamente la validez de las notas, octavas, modos y niveles de energía antes de guardar.
          </p>

          <input type="file" id="user-hymn-csv-input" accept=".csv" style="
            padding: 0.75rem; background: rgba(0,0,0,0.2); border: 1px dashed var(--border-color);
            border-radius: var(--radius-md); color: var(--text-main); cursor: pointer;
          " />

          <div id="validation-preview-container" style="display: none; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--status-success); padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;">
                ✅ <span id="valid-count">0</span> Registros válidos
              </div>
              <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-danger); padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;">
                ❌ <span id="error-count">0</span> Filas con errores
              </div>
            </div>

            <div id="error-details-list" style="max-height: 180px; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 0.75rem; font-size: 0.85rem; color: #fca5a5; display: none;">
            </div>
          </div>
        </div>
      `, async () => {
        if (!validatedData || !validatedData.validRecords || validatedData.validRecords.length === 0) {
          showToast('No hay registros válidos para importar.', 'warning');
          return;
        }

        await hymnsService.bulkUpsertUserHymns(validatedData.validRecords);
        showToast(`¡Se han importado ${validatedData.validRecords.length} atributos de himnos con éxito!`, 'success');
        filterHandler();
      });

      setTimeout(() => {
        const fileInput = document.getElementById('user-hymn-csv-input');
        if (fileInput) {
          fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
              const text = event.target.result;
              validatedData = parseAndValidateUserHymnCSV(text);

              const previewContainer = document.getElementById('validation-preview-container');
              const validCountEl = document.getElementById('valid-count');
              const errorCountEl = document.getElementById('error-count');
              const errorListEl = document.getElementById('error-details-list');

              if (previewContainer) previewContainer.style.display = 'flex';
              if (validCountEl) validCountEl.textContent = validatedData.validRecords.length;
              if (errorCountEl) errorCountEl.textContent = validatedData.errors.length;

              if (errorListEl) {
                if (validatedData.errors.length > 0) {
                  errorListEl.style.display = 'block';
                  errorListEl.innerHTML = `<strong>Errores detectados en la validación:</strong><br><ul style="padding-left: 1.25rem; margin-top: 0.4rem;">` +
                    validatedData.errors.map(err => `<li>${err.message}</li>`).join('') +
                    `</ul>`;
                } else {
                  errorListEl.style.display = 'none';
                }
              }
            };
            reader.readAsText(file);
          });
        }
      }, 100);
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

function startWizardSequence(hymnsList, notes, existingUserHymns, refreshCb) {
  let currentIndex = 0;
  const userHymnMap = new Map(existingUserHymns.map(uh => [uh.hymn_id, uh]));

  const renderStep = () => {
    const hymn = hymnsList[currentIndex];
    const existing = userHymnMap.get(hymn.id) || {};

    const notesOptions = notes.map(n => 
      `<option value="${n.id}" ${existing.key_id === n.id ? 'selected' : ''}>${n.name_es} (${n.name_en})</option>`
    ).join('');

    const highestOptions = notes.map(n => 
      `<option value="${n.id}" ${existing.highest_note_id === n.id ? 'selected' : ''}>${n.name_es} (${n.name_en})</option>`
    ).join('');

    const lowestOptions = notes.map(n => 
      `<option value="${n.id}" ${existing.lowest_note_id === n.id ? 'selected' : ''}>${n.name_es} (${n.name_en})</option>`
    ).join('');

    const hymnalNumber = (hymn.hymnal_hymn && hymn.hymnal_hymn[0]) ? `#${hymn.hymnal_hymn[0].number} — ` : '';

    createModal(`🪄 Configurando Himno ${currentIndex + 1} de ${hymnsList.length}`, `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-md); padding: 0.75rem;">
          <h3 style="font-size: 1.1rem; color: var(--text-main); font-weight: 600; margin-bottom: 0.2rem;">
            ${hymnalNumber}${hymn.title_es}
          </h3>
          ${hymn.composer ? `<div style="font-size: 0.85rem; color: var(--text-muted);">Compositor: ${hymn.composer}</div>` : ''}
          ${hymn.first_line ? `<div style="font-size: 0.85rem; color: var(--primary); font-style: italic; margin-top: 0.2rem;">"${hymn.first_line}"</div>` : ''}
        </div>

        <form id="wizard-step-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.2rem;">Tonalidad Usada</label>
              <select id="wiz-key" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                <option value="">Sin asignar</option>
                ${notesOptions}
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.2rem;">Modo</label>
              <select id="wiz-mode" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                <option value="major" ${existing.key_mode === 'major' ? 'selected' : ''}>Mayor</option>
                <option value="minor" ${existing.key_mode === 'minor' ? 'selected' : ''}>Menor</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.2rem;">Energía (1-5)</label>
              <input type="number" id="wiz-energy" min="1" max="5" value="${existing.energy || 3}" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.2rem;">Modulación</label>
              <select id="wiz-mod" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                <option value="false" ${!existing.has_modulation ? 'selected' : ''}>No</option>
                <option value="true" ${existing.has_modulation ? 'selected' : ''}>Sí</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.2rem;">Nota Más Alta / Octava</label>
              <div style="display: flex; gap: 0.3rem;">
                <select id="wiz-high-note" style="flex: 1; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                  <option value="">Nota</option>
                  ${highestOptions}
                </select>
                <input type="number" id="wiz-high-oct" min="1" max="8" placeholder="Oct" value="${existing.highest_octave || ''}" style="width: 55px; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
              </div>
            </div>
            <div>
              <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.2rem;">Nota Más Baja / Octava</label>
              <div style="display: flex; gap: 0.3rem;">
                <select id="wiz-low-note" style="flex: 1; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                  <option value="">Nota</option>
                  ${lowestOptions}
                </select>
                <input type="number" id="wiz-low-oct" min="1" max="8" placeholder="Oct" value="${existing.lowest_octave || ''}" style="width: 55px; padding: 0.5rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <button type="button" id="wiz-btn-prev" ${currentIndex === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.5rem 0.8rem; border-radius: var(--radius-md); cursor: pointer; font-size: 0.85rem;">
              ⏮️ Anterior
            </button>

            <div style="display: flex; gap: 0.5rem;">
              <button type="button" id="wiz-btn-skip" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; padding: 0.5rem 0.8rem; border-radius: var(--radius-md); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                ⏭️ Omitir / Ignorar
              </button>
              <button type="button" id="wiz-btn-save" style="background: var(--gradient-primary); border: none; color: white; padding: 0.5rem 1rem; border-radius: var(--radius-md); cursor: pointer; font-size: 0.85rem; font-weight: 600;">
                💾 Guardar y Siguiente ➔
              </button>
            </div>
          </div>
        </div>
      `, null);

    setTimeout(() => {
      const prevBtn = document.getElementById('wiz-btn-prev');
      const skipBtn = document.getElementById('wiz-btn-skip');
      const saveBtn = document.getElementById('wiz-btn-save');

      if (prevBtn && currentIndex > 0) {
        prevBtn.addEventListener('click', () => {
          currentIndex--;
          renderStep();
        });
      }

      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          if (currentIndex < hymnsList.length - 1) {
            currentIndex++;
            renderStep();
          } else {
            showToast('Has completado el recorrido del asistente.', 'success');
            if (refreshCb) refreshCb();
          }
        });
      }

      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const keyId = document.getElementById('wiz-key').value;
          const keyMode = document.getElementById('wiz-mode').value;
          const energy = document.getElementById('wiz-energy').value;
          const mod = document.getElementById('wiz-mod').value === 'true';
          const highNote = document.getElementById('wiz-high-note').value;
          const highOct = document.getElementById('wiz-high-oct').value;
          const lowNote = document.getElementById('wiz-low-note').value;
          const lowOct = document.getElementById('wiz-low-oct').value;

          const payload = {
            key_id: keyId ? parseInt(keyId, 10) : null,
            key_mode: keyMode,
            energy: energy ? parseInt(energy, 10) : null,
            has_modulation: mod,
            highest_note_id: highNote ? parseInt(highNote, 10) : null,
            highest_octave: highOct ? parseInt(highOct, 10) : null,
            lowest_note_id: lowNote ? parseInt(lowNote, 10) : null,
            lowest_octave: lowOct ? parseInt(lowOct, 10) : null
          };

          await hymnsService.saveUserHymnAttributes(hymn.id, payload);
          userHymnMap.set(hymn.id, { hymn_id: hymn.id, ...payload });

          if (currentIndex < hymnsList.length - 1) {
            currentIndex++;
            renderStep();
          } else {
            showToast('¡Has completado el recorrido del asistente! Todos los datos han sido guardados.', 'success');
            if (refreshCb) refreshCb();
          }
        });
      }
    }, 100);
  };

  renderStep();
}
