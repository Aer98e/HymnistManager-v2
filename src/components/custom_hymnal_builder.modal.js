import { hymnalsService } from '../services/hymnals.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { createModal, showToast, showConfirmModal } from './modal.js';
import { normalizeText } from '../utils/text.utils.js';

export async function openCustomHymnalBuilderModal(hymnalId = null, onSaveSuccess = null) {
  showToast('Cargando catálogo y plantilla...', 'info');

  let hymnalData = null;
  let allHymns = [];
  let allHymnals = [];

  try {
    const [hymnsRes, hymnalsRes] = await Promise.all([
      hymnsService.getHymns(),
      hymnalsService.getHymnals()
    ]);
    allHymns = hymnsRes || [];
    allHymnals = hymnalsRes || [];

    if (hymnalId) {
      hymnalData = await hymnalsService.getHymnalDetails(hymnalId);
    }
  } catch (err) {
    showToast(`Error al cargar datos: ${err.message}`, 'error');
    return;
  }

  // Determine initial slots (At least 10 slots)
  let slots = [];
  const initialMinSlots = 10;

  if (hymnalData && hymnalData.hymnal_hymn && hymnalData.hymnal_hymn.length > 0) {
    const maxNum = Math.max(...hymnalData.hymnal_hymn.map(item => item.number), 0);
    const targetLength = Math.max(initialMinSlots, maxNum + 3);

    for (let i = 1; i <= targetLength; i++) {
      const existing = hymnalData.hymnal_hymn.find(item => item.number === i);
      slots.push({
        number: i,
        hymn: existing ? existing.hymn : null
      });
    }
  } else {
    for (let i = 1; i <= initialMinSlots; i++) {
      slots.push({ number: i, hymn: null });
    }
  }

  // Track active slot index (default to first empty slot or index 0)
  let activeSlotIndex = slots.findIndex(s => s.hymn === null);
  if (activeSlotIndex === -1) activeSlotIndex = 0;

  let selectedSourceHymnalId = '';
  let searchQuery = '';
  let hymnalName = hymnalData ? hymnalData.name : '';

  // Source hymnal detailed cache map to quickly load tracks when a source hymnal is selected
  const sourceHymnalDetailsMap = new Map();

  // Create the modal layout
  const titleText = hymnalData 
    ? `⚡ Editor Consecutivo de Himnario: ${hymnalData.name}` 
    : '⚡ Constructor de Himnario Personalizado';

  createModal(titleText, `
    <div style="display: flex; flex-direction: column; gap: 1rem; max-height: 80vh; overflow: hidden;">
      <!-- Header Controls & Hymnal Name -->
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; background: rgba(0,0,0,0.25); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <div style="flex: 1; min-width: 260px;">
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 0.25rem; font-weight: 600;">Nombre del Himnario *</label>
          <input type="text" id="builder-hymnal-name" value="${hymnalName}" placeholder="ej. Mi Himnario Favorito 2026" style="
            width: 100%; padding: 0.55rem 0.8rem; font-weight: 600; font-size: 0.95rem;
          " />
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <!-- Counter Badge -->
          <div id="builder-stats-badge" style="
            background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.35); color: var(--primary);
            padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 600; text-align: center;
          ">
            0 Asignados / 10 Casillas
          </div>

          <button id="builder-add-slots-btn" style="
            background: rgba(255, 255, 255, 0.08); border: 1px solid var(--border-color); color: var(--text-main);
            padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.82rem; cursor: pointer; font-weight: 500;
          ">
            ➕ 5 Casillas
          </button>

          <button id="builder-clear-all-btn" style="
            background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-danger);
            padding: 0.5rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.82rem; cursor: pointer; font-weight: 500;
          ">
            🗑️ Limpiar Todo
          </button>

          <button id="builder-save-btn" style="
            background: var(--gradient-primary); border: none; color: white;
            padding: 0.55rem 1.2rem; border-radius: var(--radius-sm); font-size: 0.88rem; font-weight: 600; cursor: pointer;
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          ">
            💾 Guardar Himnario
          </button>
        </div>
      </div>

      <!-- Split Main Panel -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; height: 60vh; min-height: 400px;" id="builder-split-container">
        
        <!-- Left Panel: Numbered Slots Matrix -->
        <div style="
          background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md);
          display: flex; flex-direction: column; overflow: hidden;
        ">
          <div style="
            padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-color);
            display: flex; justify-content: space-between; align-items: center;
          ">
            <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-main);">
              📋 Matriz de Casillas Numeradas
            </span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              Haz clic en una casilla para activarla
            </span>
          </div>

          <!-- Scrollable Slots list -->
          <div id="builder-slots-list" style="flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
          </div>
        </div>

        <!-- Right Panel: Catalog Explorer & Realtime Search -->
        <div style="
          background: rgba(0, 0, 0, 0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md);
          display: flex; flex-direction: column; overflow: hidden;
        ">
          <!-- Search Header & Source Filter -->
          <div style="
            padding: 0.75rem; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-color);
            display: flex; flex-direction: column; gap: 0.5rem;
          ">
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <input type="text" id="builder-search-input" placeholder="Buscar por título, 1ª línea o compositor..." style="
                flex: 1; min-width: 180px; padding: 0.55rem 0.8rem; font-size: 0.88rem;
              " />

              <select id="builder-source-hymnal-select" style="
                padding: 0.55rem 0.8rem; font-size: 0.82rem; max-width: 180px;
              ">
                <option value="">📚 Todos los Himnos</option>
                ${allHymnals.map(h => `<option value="${h.id}">📖 ${h.name}</option>`).join('')}
              </select>
            </div>

            <div id="builder-active-slot-indicator" style="font-size: 0.78rem; color: var(--primary); font-weight: 600;">
              👉 Destino actual: Casilla #${slots[activeSlotIndex] ? slots[activeSlotIndex].number : 1}
            </div>
          </div>

          <!-- Catalog Results List -->
          <div id="builder-catalog-list" style="flex: 1; overflow-y: auto; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem;">
          </div>
        </div>

      </div>
    </div>
  `, null, false);

  // Ensure responsive grid layout for narrower screens
  const splitContainer = document.getElementById('builder-split-container');
  if (window.innerWidth < 768 && splitContainer) {
    splitContainer.style.gridTemplateColumns = '1fr';
    splitContainer.style.height = 'auto';
  }

  // Internal Helper: Check & auto-expand slots if active slot is near end
  function checkAndAutoExpandSlots() {
    if (activeSlotIndex >= slots.length - 2) {
      const currentLength = slots.length;
      for (let i = 1; i <= 5; i++) {
        slots.push({ number: currentLength + i, hymn: null });
      }
    }
  }

  // Render Left Panel (Slots Matrix)
  function renderSlots() {
    const container = document.getElementById('builder-slots-list');
    if (!container) return;

    // Update Stats Badge
    const assignedCount = slots.filter(s => s.hymn !== null).length;
    const statsBadge = document.getElementById('builder-stats-badge');
    if (statsBadge) {
      statsBadge.innerText = `${assignedCount} Asignados / ${slots.length} Casillas`;
    }

    // Update active slot indicator text
    const activeIndicator = document.getElementById('builder-active-slot-indicator');
    if (activeIndicator && slots[activeSlotIndex]) {
      activeIndicator.innerText = `👉 Destino actual: Casilla #${slots[activeSlotIndex].number}`;
    }

    container.innerHTML = slots.map((slot, index) => {
      const isActive = index === activeSlotIndex;
      const isAssigned = slot.hymn !== null;

      return `
        <div class="builder-slot-item ${isActive ? 'active-slot' : ''}" data-index="${index}" style="
          padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer;
          transition: var(--transition-fast); display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
          background: ${isActive ? 'var(--bg-dark)' : (isAssigned ? '#FFFFFF' : 'var(--bg-dark)')};
          border: 1px solid ${isActive ? 'var(--primary)' : (isAssigned ? 'var(--border-color)' : 'var(--border-color)')};
        ">
          <!-- Left: Slot Number & Details -->
          <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 0; flex: 1;">
            <span style="
              font-weight: 800; font-size: 0.85rem; padding: 0.2rem 0.45rem; border-radius: 4px;
              background: ${isActive ? 'var(--primary)' : 'var(--border-color)'}; color: ${isActive ? '#FFFFFF' : 'var(--text-main)'};
            ">
              #${slot.number}
            </span>

            <div style="min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${isAssigned ? `
                <div style="font-weight: 600; color: var(--text-main); font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis;">
                  ${slot.hymn.title_es}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis;">
                  ${slot.hymn.composer ? slot.hymn.composer : 'Compositor desconocido'} ${slot.hymn.first_line ? `| "${slot.hymn.first_line}"` : ''}
                </div>
              ` : `
                <div style="color: var(--text-muted); font-size: 0.82rem; font-style: italic;">
                  ${isActive ? '✍️ Listo para asignar...' : '[ Casilla Vacía ]'}
                </div>
              `}
            </div>
          </div>

          <!-- Right: Slot Controls -->
          <div style="display: flex; align-items: center; gap: 0.25rem;">
            ${isAssigned ? `
              <button class="slot-move-up-btn" data-index="${index}" title="Subir casilla" style="
                background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.1rem 0.3rem; font-size: 0.75rem;
              " ${index === 0 ? 'disabled' : ''}>▲</button>
              
              <button class="slot-move-down-btn" data-index="${index}" title="Bajar casilla" style="
                background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0.1rem 0.3rem; font-size: 0.75rem;
              " ${index === slots.length - 1 ? 'disabled' : ''}>▼</button>

              <button class="slot-clear-btn" data-index="${index}" title="Limpiar casilla" style="
                background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-danger);
                border-radius: 4px; padding: 0.15rem 0.4rem; font-size: 0.75rem; cursor: pointer; font-weight: 600; margin-left: 0.2rem;
              ">✕</button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach slot click events
    container.querySelectorAll('.builder-slot-item').forEach(el => {
      el.addEventListener('click', (e) => {
        // Prevent trigger when clicking move or clear buttons
        if (e.target.tagName === 'BUTTON') return;
        const idx = parseInt(el.getAttribute('data-index'), 10);
        activeSlotIndex = idx;
        renderSlots();
        renderCatalog();
      });
    });

    // Attach move up/down & clear button handlers
    container.querySelectorAll('.slot-clear-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        slots[idx].hymn = null;
        renderSlots();
        renderCatalog();
      });
    });

    container.querySelectorAll('.slot-move-up-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (idx > 0) {
          const temp = slots[idx].hymn;
          slots[idx].hymn = slots[idx - 1].hymn;
          slots[idx - 1].hymn = temp;
          activeSlotIndex = idx - 1;
          renderSlots();
          renderCatalog();
        }
      });
    });

    container.querySelectorAll('.slot-move-down-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (idx < slots.length - 1) {
          const temp = slots[idx].hymn;
          slots[idx].hymn = slots[idx + 1].hymn;
          slots[idx + 1].hymn = temp;
          activeSlotIndex = idx + 1;
          renderSlots();
          renderCatalog();
        }
      });
    });
  }

  // Filter and Render Right Panel (Catalog List)
  async function renderCatalog() {
    const container = document.getElementById('builder-catalog-list');
    if (!container) return;

    let displayList = [];

    if (selectedSourceHymnalId) {
      // Source hymnal filter active: Load or retrieve details of selected source hymnal
      if (!sourceHymnalDetailsMap.has(selectedSourceHymnalId)) {
        try {
          const details = await hymnalsService.getHymnalDetails(selectedSourceHymnalId);
          sourceHymnalDetailsMap.set(selectedSourceHymnalId, details);
        } catch (err) {
          console.error('Error fetching source hymnal:', err);
        }
      }

      const sourceDetails = sourceHymnalDetailsMap.get(selectedSourceHymnalId);
      if (sourceDetails && sourceDetails.hymnal_hymn) {
        displayList = sourceDetails.hymnal_hymn
          .sort((a, b) => a.number - b.number)
          .map(hh => ({
            ...hh.hymn,
            sourceNumber: hh.number,
            sourceHymnalName: sourceDetails.name
          }))
          .filter(item => item && item.id);
      }
    } else {
      displayList = allHymns.map(h => ({ ...h }));
    }

    // Apply Realtime Search query if present using normalizeText
    const normQuery = normalizeText(searchQuery);
    if (normQuery) {
      displayList = displayList.filter(h => {
        const normTitle = normalizeText(h.title_es);
        const normOrig = normalizeText(h.title_original);
        const normComp = normalizeText(h.composer);
        const normFirst = normalizeText(h.first_line);
        const normRefrain = normalizeText(h.refrain_first_line);
        const numStr = h.sourceNumber ? String(h.sourceNumber) : '';

        return normTitle.includes(normQuery) ||
               normOrig.includes(normQuery) ||
               normComp.includes(normQuery) ||
               normFirst.includes(normQuery) ||
               normRefrain.includes(normQuery) ||
               numStr === normQuery;
      });
    }

    if (displayList.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">
          🔍 No se encontraron himnos con el filtro/búsqueda actual.
        </div>
      `;
      return;
    }

    const currentTargetNumber = slots[activeSlotIndex] ? slots[activeSlotIndex].number : 1;

    container.innerHTML = displayList.map(hymn => {
      // Check if already assigned in slots matrix
      const assignedSlot = slots.find(s => s.hymn && s.hymn.id === hymn.id);

      return `
        <div style="
          background: var(--bg-dark); border: 1px solid var(--border-color);
          border-radius: var(--radius-sm); padding: 0.65rem 0.85rem;
          display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
        ">
          <div style="min-width: 0; flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <span style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">
                ${hymn.title_es}
              </span>
              ${hymn.sourceNumber ? `
                <span style="font-size: 0.72rem; padding: 0.15rem 0.4rem; border-radius: 10px; background: rgba(99, 102, 241, 0.2); color: var(--primary); font-weight: 600;">
                  #${hymn.sourceNumber} en ${hymn.sourceHymnalName}
                </span>
              ` : ''}
              ${assignedSlot ? `
                <span style="font-size: 0.72rem; padding: 0.15rem 0.4rem; border-radius: 10px; background: rgba(16, 185, 129, 0.2); color: var(--status-success); font-weight: 600;">
                  ✓ Asignado en #${assignedSlot.number}
                </span>
              ` : ''}
            </div>

            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">
              Compositor: ${hymn.composer || 'Desconocido'} ${hymn.first_line ? `| "${hymn.first_line}"` : ''}
            </div>
          </div>

          <button class="builder-assign-hymn-btn" data-hymn-id="${hymn.id}" style="
            background: var(--gradient-primary); border: none; color: white;
            padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.78rem;
            font-weight: 600; cursor: pointer; flex-shrink: 0; transition: transform 0.1s ease;
          ">
            ➕ Asignar a #${currentTargetNumber}
          </button>
        </div>
      `;
    }).join('');

    // Attach Assign button event handlers
    container.querySelectorAll('.builder-assign-hymn-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const hymnId = btn.getAttribute('data-hymn-id');
        const selectedHymn = allHymns.find(h => h.id === hymnId);

        if (selectedHymn && slots[activeSlotIndex]) {
          // Assign hymn to active slot
          slots[activeSlotIndex].hymn = selectedHymn;

          // Auto advance to next slot
          activeSlotIndex++;

          // Check if auto-expansion of slots is needed
          checkAndAutoExpandSlots();

          renderSlots();
          renderCatalog();

          // Scroll active slot into view
          setTimeout(() => {
            const activeElem = document.querySelector('.builder-slot-item.active-slot');
            if (activeElem) {
              activeElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }, 50);
        }
      });
    });
  }

  // Initial render calls
  renderSlots();
  renderCatalog();

  // Attach Header & Search Event Listeners
  setTimeout(() => {
    const searchInput = document.getElementById('builder-search-input');
    const sourceSelect = document.getElementById('builder-source-hymnal-select');
    const addSlotsBtn = document.getElementById('builder-add-slots-btn');
    const clearAllBtn = document.getElementById('builder-clear-all-btn');
    const saveBtn = document.getElementById('builder-save-btn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderCatalog();
      });
    }

    if (sourceSelect) {
      sourceSelect.addEventListener('change', async (e) => {
        selectedSourceHymnalId = e.target.value;
        showToast(selectedSourceHymnalId ? 'Cargando himnario de origen...' : 'Mostrando todos los himnos', 'info');
        await renderCatalog();
      });
    }

    if (addSlotsBtn) {
      addSlotsBtn.addEventListener('click', () => {
        const startNum = slots.length;
        for (let i = 1; i <= 5; i++) {
          slots.push({ number: startNum + i, hymn: null });
        }
        showToast('5 casillas añadidas.', 'info');
        renderSlots();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        showConfirmModal({
          title: '¿Vaciar todas las casillas?',
          message: '¿Estás seguro de que deseas desvincular todos los himnos de este borrador?',
          confirmText: '🗑️ Sí, Vaciar',
          danger: true,
          onConfirm: () => {
            slots.forEach(s => s.hymn = null);
            activeSlotIndex = 0;
            renderSlots();
            renderCatalog();
            showToast('Casillas vaciadas.', 'info');
          }
        });
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('builder-hymnal-name');
        const nameValue = nameInput ? nameInput.value.trim() : '';

        if (!nameValue) {
          showToast('Por favor escribe un nombre para el himnario.', 'warning');
          return;
        }

        const validAssignments = slots
          .filter(s => s.hymn !== null)
          .map(s => ({
            number: s.number,
            hymn_id: s.hymn.id
          }));

        if (validAssignments.length === 0) {
          showToast('Debes asignar al menos un himno antes de guardar.', 'warning');
          return;
        }

        try {
          showToast('Guardando himnario y numeración...', 'info');

          let targetHymnalId = hymnalId;
          if (!targetHymnalId) {
            // Create new hymnal
            const newHymnal = await hymnalsService.createHymnal(nameValue, 1);
            targetHymnalId = newHymnal.id;
          } else {
            // Update hymnal name if changed
            if (hymnalData && hymnalData.name !== nameValue) {
              await hymnalsService.updateHymnal(targetHymnalId, nameValue);
            }
          }

          // Batch save hymnal hymns
          await hymnalsService.batchAssignHymnsToHymnal(targetHymnalId, validAssignments);

          showToast(`¡Himnario "${nameValue}" guardado exitosamente con ${validAssignments.length} himnos!`, 'success');

          // Close modal
          document.getElementById('modal-close-btn')?.click();

          if (typeof onSaveSuccess === 'function') {
            await onSaveSuccess();
          }
        } catch (err) {
          showToast(`Error al guardar himnario: ${err.message}`, 'error');
        }
      });
    }
  }, 100);
}
