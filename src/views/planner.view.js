import { programsService } from '../services/programs.service.js';
import { contextsService } from '../services/contexts.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { hymnalsService } from '../services/hymnals.service.js';
import { authService } from '../services/auth.service.js';
import { createModal, showToast } from '../components/modal.js';
import { icons } from '../utils/icons.js';
import { normalizeText, debounce } from '../utils/text.utils.js';

export async function renderPlannerView() {
  const programs = await programsService.getPrograms();
  const prefs = await authService.getUserPreferences();
  const preferredHymnalName = prefs.preferred_hymnal ? prefs.preferred_hymnal.name : 'Ninguno (Seleccionar)';

  return `
    <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 2rem; font-style: italic; color: var(--text-main); margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.6rem;">
            <span style="color: var(--primary); display: flex; align-items: center;">${icons.planner(28)}</span>
            <span>Planificador Litúrgico</span>
          </h1>
          <p class="subtitle">
            Diseña tus órdenes de servicio con sugerencias inteligentes y análisis de recurrencia.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <button id="planner-intelligence-btn" class="btn btn-outline">
            ${icons.music(16)}
            <span>Asistente Inteligente</span>
          </button>

          <button id="config-preferred-hymnal-btn" class="btn btn-secondary">
            ${icons.hymnals(16)}
            <span>Himnario: <strong>${preferredHymnalName}</strong></span>
          </button>

          <button id="create-program-btn" class="btn btn-primary">
            ${icons.plus(16)}
            <span>Crear Programa</span>
          </button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${programs.length === 0 ? `
          <div style="text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            No hay programas creados aún. ¡Crea uno o usa el Asistente Inteligente para comenzar!
          </div>
        ` : programs.map(p => renderProgramCard(p, prefs.preferred_hymnal_id, programs)).join('')}
      </div>
    </div>
  `;
}

export async function refreshPlannerView() {
  const container = document.getElementById('main-content') || document.querySelector('main');
  if (container) {
    container.innerHTML = await renderPlannerView();
    setupPlannerEvents();
  }
}

function getProgramRepetitionWarnings(targetProgram, allPrograms) {
  if (!targetProgram || !targetProgram.program_hymn || targetProgram.program_hymn.length === 0) {
    return [];
  }

  const targetDate = new Date(targetProgram.date);
  const targetContextId = targetProgram.context_id;
  const targetHymnList = targetProgram.program_hymn;

  const otherPrograms = (allPrograms || []).filter(p => p.context_id === targetContextId && p.id !== targetProgram.id);
  if (otherPrograms.length === 0) return [];

  const warnings = [];

  targetHymnList.forEach(ph => {
    const hymn = ph.hymn;
    const hymnId = ph.hymn?.id || ph.hymn_id;
    if (!hymnId) return;

    otherPrograms.forEach(otherProg => {
      if (!otherProg.program_hymn) return;
      const hasSameHymn = otherProg.program_hymn.some(oph => (oph.hymn?.id || oph.hymn_id) === hymnId);
      if (!hasSameHymn) return;

      const otherDate = new Date(otherProg.date);
      const diffMs = targetDate.getTime() - otherDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (Math.abs(diffDays) <= 28) {
        let msg = '';
        if (diffDays > 0) {
          msg = `Cantado hace ${diffDays} día(s) en "${otherProg.name || 'Programa'}" (${otherProg.date})`;
        } else if (diffDays < 0) {
          msg = `Programado ${Math.abs(diffDays)} día(s) después en "${otherProg.name || 'Programa'}" (${otherProg.date})`;
        } else {
          msg = `Misma fecha en "${otherProg.name || 'Programa'}" (${otherProg.date})`;
        }

        warnings.push({
          title: hymn?.title_es || 'Himno',
          msg
        });
      }
    });
  });

  return warnings;
}

function renderProgramCard(program, preferredHymnalId, allPrograms) {
  const formattedDate = new Date(program.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hymnList = program.program_hymn || [];

  // Check recent repetition warnings relative to program.date excluding self
  const recentWarnings = getProgramRepetitionWarnings(program, allPrograms);

  return `
    <div class="card program-card-container" data-prog-id="${program.id}">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3 style="font-size: 1.15rem; color: var(--text-main); font-weight: 600;">${program.name || 'Programa Musical'}</h3>
          <div style="font-size: 0.85rem; color: var(--primary); font-weight: 500; display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem;">
            ${icons.planner(14)}
            <span>${formattedDate} | Contexto: ${program.context ? program.context.name : 'General'}</span>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          <button class="btn btn-gold btn-sm save-program-order-btn" data-id="${program.id}" style="display: none; align-items: center; gap: 0.3rem;">
            💾 <span>Guardar Orden</span>
          </button>

          <button class="btn btn-secondary btn-sm edit-program-btn" data-id="${program.id}" title="Editar programa">
            ✏️ <span>Editar</span>
          </button>

          <button class="btn btn-secondary btn-sm export-program-btn" data-id="${program.id}">
            ${icons.music(14)}
            <span>Generar Ficha / Exportar</span>
          </button>
          
          <button class="btn btn-danger btn-sm delete-program-btn" data-id="${program.id}" data-name="${program.name || 'Programa'}" title="Eliminar programa">
            ${icons.trash(14)}
          </button>
        </div>
      </div>

      <div style="margin-top: 1rem;">
        <h4 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Repertorio Seleccionado (${hymnList.length} himnos)</h4>
        <div class="hymn-rows-container" style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${hymnList.length > 0 ? hymnList.map((ph, idx) => {
            const hymn = ph.hymn;
            const hId = ph.hymn?.id || ph.hymn_id;
            let numberText = '';
            if (hymn && preferredHymnalId && hymn.hymnal_hymn) {
              const mapping = hymn.hymnal_hymn.find(hh => hh.hymnal_id === preferredHymnalId);
              if (mapping) {
                numberText = `<span class="badge badge-gold" style="margin-right: 0.35rem;">#${mapping.number}</span>`;
              }
            }

            // user_hymn attributes
            let musicDetails = '';
            if (hymn && hymn.user_hymn && hymn.user_hymn.length > 0) {
              const uh = hymn.user_hymn[0];
              const keyName = uh.key_note ? uh.key_note.name_es : '';
              const keyMode = uh.key_mode === 'minor' ? 'm' : '';
              const keyDisplay = keyName ? `${keyName}${keyMode}` : '';
              const energyDisplay = uh.energy ? `Energía: ${uh.energy}/5` : '';
              
              if (keyDisplay || energyDisplay) {
                musicDetails = `<span class="badge badge-gold" style="margin-left: 0.4rem;">Tono: ${keyDisplay} ${energyDisplay}</span>`;
              }
            }

            return `
              <div class="hymn-row-item" data-hymn-id="${hId}" style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.95rem;">
                  <span class="hymn-row-index" style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; width: 22px;">${idx + 1}.</span>
                  ${numberText}<strong>${hymn ? hymn.title_es : 'Himno'}</strong>
                  ${hymn && hymn.composer ? `<span style="color: var(--text-muted); font-size: 0.85rem;"> (${hymn.composer})</span>` : ''}
                  ${musicDetails}
                </div>

                <!-- Reorder buttons (Instant DOM swap) -->
                <div style="display: flex; gap: 0.25rem;">
                  <button class="reorder-hymn-up-btn" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.2rem 0.4rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                    ▲
                  </button>
                  <button class="reorder-hymn-down-btn" ${idx === hymnList.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.2rem 0.4rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                    ▼
                  </button>
                </div>
              </div>
            `;
          }).join('') : `<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Sin himnos agregados a este programa.</p>`}
        </div>

        <!-- Persistent Warning Box for Recent Repetitions -->
        ${recentWarnings.length > 0 ? `
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-md); padding: 0.75rem 1rem; margin-top: 1rem;">
            <div style="font-weight: 600; color: var(--status-warning); font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.35rem;">
              ⚠️ Advertencia: Himnos con repeticiones cercanas en este Contexto (dentro de 28 días):
            </div>
            <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-main); display: flex; flex-direction: column; gap: 0.2rem;">
              ${recentWarnings.map(w => `
                <li><strong>${w.title}</strong> — ${w.msg}</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function setupPlannerEvents() {
  const createBtn = document.getElementById('create-program-btn');
  const configPrefBtn = document.getElementById('config-preferred-hymnal-btn');
  const intelligenceBtn = document.getElementById('planner-intelligence-btn');

  // Asistente Inteligente (Himnos Olvidados y Himnos Nuevos Activos)
  if (intelligenceBtn) {
    intelligenceBtn.addEventListener('click', async () => {
      try {
        const contexts = await contextsService.getContexts();
        if (!contexts || contexts.length === 0) {
          showToast('Debes tener al menos un contexto registrado para usar el asistente inteligente.', 'warning');
          return;
        }

        let selectedContextId = contexts[0].id;
        openIntelligenceModal(contexts, selectedContextId);
      } catch (err) {
        showToast(`Error al abrir asistente inteligente: ${err.message}`, 'error');
      }
    });
  }

  // Configurar Himnario Preferido
  if (configPrefBtn) {
    configPrefBtn.addEventListener('click', async () => {
      try {
        const hymnals = await hymnalsService.getHymnals();
        const currentPrefs = await authService.getUserPreferences();

        createModal('Seleccionar Himnario Preferido para Tu Iglesia', `
          <form style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Himnario Principal</label>
              <select id="select-pref-hymnal" style="width: 100%;">
                <option value="">Ninguno seleccionado</option>
                ${hymnals.map(h => `
                  <option value="${h.id}" ${currentPrefs.preferred_hymnal_id === h.id ? 'selected' : ''}>${h.name} (${h.type === 'public' ? 'Oficial/Público' : 'Personal'})</option>
                `).join('')}
              </select>
              <p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.4rem;">
                Los números de este himnario se asociarán automáticamente a las canciones al exportar tus programas.
              </p>
            </div>
          </form>
        `, async () => {
          const selectedId = document.getElementById('select-pref-hymnal').value;
          await authService.updateUserPreferences({
            preferred_hymnal_id: selectedId || null
          });
          showToast('Himnario preferido actualizado.', 'success');
          await refreshPlannerView();
        });
      } catch (err) {
        showToast(`Error al abrir configuración de himnario: ${err.message}`, 'error');
      }
    });
  }

  // Helper para actualizar índices y botón de guardar en tarjeta de programa
  const updateCardHymnIndices = (cardContainer) => {
    if (!cardContainer) return;
    const rows = Array.from(cardContainer.querySelectorAll('.hymn-row-item'));
    rows.forEach((row, idx) => {
      const idxSpan = row.querySelector('.hymn-row-index');
      if (idxSpan) idxSpan.textContent = `${idx + 1}.`;

      const upBtn = row.querySelector('.reorder-hymn-up-btn');
      const downBtn = row.querySelector('.reorder-hymn-down-btn');
      if (upBtn) {
        upBtn.disabled = idx === 0;
        upBtn.style.opacity = idx === 0 ? '0.3' : '1';
        upBtn.style.cursor = idx === 0 ? 'not-allowed' : 'pointer';
      }
      if (downBtn) {
        downBtn.disabled = idx === rows.length - 1;
        downBtn.style.opacity = idx === rows.length - 1 ? '0.3' : '1';
        downBtn.style.cursor = idx === rows.length - 1 ? 'not-allowed' : 'pointer';
      }
    });

    const saveBtn = cardContainer.querySelector('.save-program-order-btn');
    if (saveBtn) {
      saveBtn.style.display = 'inline-flex';
    }
  };

  // Reordenar himno arriba ▲ (local e instantáneo en DOM)
  document.querySelectorAll('.reorder-hymn-up-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.currentTarget.closest('.hymn-row-item');
      if (!row) return;
      const prevRow = row.previousElementSibling;
      if (prevRow && prevRow.classList.contains('hymn-row-item')) {
        row.parentNode.insertBefore(row, prevRow);
        updateCardHymnIndices(row.closest('.program-card-container'));
      }
    });
  });

  // Reordenar himno abajo ▼ (local e instantáneo en DOM)
  document.querySelectorAll('.reorder-hymn-down-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const row = e.currentTarget.closest('.hymn-row-item');
      if (!row) return;
      const nextRow = row.nextElementSibling;
      if (nextRow && nextRow.classList.contains('hymn-row-item')) {
        row.parentNode.insertBefore(nextRow, row);
        updateCardHymnIndices(row.closest('.program-card-container'));
      }
    });
  });

  // Guardar orden de tarjeta en lote
  document.querySelectorAll('.save-program-order-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const progId = e.currentTarget.getAttribute('data-id');
      const card = e.currentTarget.closest('.program-card-container');
      if (!card) return;

      const rows = Array.from(card.querySelectorAll('.hymn-row-item'));
      const hymnIds = rows.map(r => r.getAttribute('data-hymn-id')).filter(Boolean);

      try {
        await programsService.updateProgramHymnOrder(progId, hymnIds);
        showToast('¡Orden del programa guardado con éxito!', 'success');
        await refreshPlannerView();
      } catch (err) {
        showToast(`Error al guardar orden: ${err.message}`, 'error');
      }
    });
  });

  // Editar Programa Modal
  document.querySelectorAll('.edit-program-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const progId = e.currentTarget.getAttribute('data-id');
      openProgramFormModal({ isEdit: true, progId });
    });
  });

  // Eliminar programa
  document.querySelectorAll('.delete-program-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const progId = e.currentTarget.getAttribute('data-id');
      const progName = e.currentTarget.getAttribute('data-name');

      createModal(`¿Eliminar Programa "${progName}"?`, `
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Esta acción eliminará la planificación musical de este programa de forma permanente.
        </p>
      `, async () => {
        await programsService.deleteProgram(progId);
        showToast(`Programa "${progName}" eliminado con éxito.`, 'success');
        await refreshPlannerView();
      });
    });
  });

  // Crear Programa Modal
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openProgramFormModal({ isEdit: false });
    });
  }

  document.querySelectorAll('.export-program-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const progId = e.currentTarget.getAttribute('data-id');
      const programs = await programsService.getPrograms();
      const prog = programs.find(p => p.id === progId);
      const prefs = await authService.getUserPreferences();
      const hymnals = await hymnalsService.getHymnals();

      if (!prog) return;

      createModal('📲 Exportar / Generar Ficha de Programa', `
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Himnario de Referencia</label>
            <select id="export-hymnal-select" style="width: 100%;">
              <option value="">Sin números de himnario (solo títulos y tono)</option>
              ${hymnals.map(h => `
                <option value="${h.id}" ${prefs.preferred_hymnal_id === h.id ? 'selected' : ''}>${h.name}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.6rem;">
            <label style="font-size: 0.85rem; color: var(--text-muted);">Formato de Salida</label>

            <button id="export-copy-text-btn" type="button" style="
              background: var(--gradient-primary); border: none; color: white; padding: 0.65rem 1rem;
              border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            ">
              📋 Copiar Texto para WhatsApp / Mensajería
            </button>

            <button id="export-download-csv-btn" type="button" style="
              background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--status-success);
              padding: 0.65rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
            ">
              📊 Descargar CSV para Excel (.csv)
            </button>
          </div>
        </div>
      `, null);

      setTimeout(() => {
        const copyBtn = document.getElementById('export-copy-text-btn');
        const csvBtn = document.getElementById('export-download-csv-btn');
        const selectEl = document.getElementById('export-hymnal-select');

        const getSelectedHymnalId = () => selectEl ? selectEl.value : '';

        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            const targetHymnalId = getSelectedHymnalId();
            let textOutput = `🎶 *${prog.name || 'Programa Musical'}*\n📅 Fecha: ${prog.date}\n🏛️ Contexto: ${prog.context ? prog.context.name : 'General'}\n\n`;

            if (prog.program_hymn) {
              prog.program_hymn.forEach((ph, idx) => {
                const hymn = ph.hymn;
                let numStr = '';
                if (hymn && targetHymnalId && hymn.hymnal_hymn) {
                  const mapping = hymn.hymnal_hymn.find(hh => hh.hymnal_id === targetHymnalId);
                  if (mapping) numStr = `#${mapping.number} `;
                }

                let keyStr = '';
                if (hymn && hymn.user_hymn && hymn.user_hymn.length > 0) {
                  const uh = hymn.user_hymn[0];
                  if (uh.key_note) {
                    keyStr = ` [${uh.key_note.name_es}${uh.key_mode === 'minor' ? 'm' : ''}]`;
                  }
                }

                textOutput += `${idx + 1}. ${numStr}${hymn ? hymn.title_es : 'Himno'}${keyStr}\n`;
              });
            }

            navigator.clipboard.writeText(textOutput);
            showToast('¡Programa copiado al portapapeles con éxito!', 'success');
          });
        }

        if (csvBtn) {
          csvBtn.addEventListener('click', () => {
            const targetHymnalId = getSelectedHymnalId();
            const targetHymnalObj = hymnals.find(h => h.id === targetHymnalId);
            const hymnalName = targetHymnalObj ? targetHymnalObj.name : 'N/A';

            const headers = ['Orden', 'Himnario', 'Numero', 'Titulo', 'Tonalidad', 'Modo', 'Energia'];
            const rows = [headers.join(',')];

            if (prog.program_hymn) {
              prog.program_hymn.forEach((ph, idx) => {
                const hymn = ph.hymn;
                let numStr = '';
                if (hymn && targetHymnalId && hymn.hymnal_hymn) {
                  const mapping = hymn.hymnal_hymn.find(hh => hh.hymnal_id === targetHymnalId);
                  if (mapping) numStr = mapping.number;
                }

                let keyName = '';
                let keyMode = '';
                let energy = '';

                if (hymn && hymn.user_hymn && hymn.user_hymn.length > 0) {
                  const uh = hymn.user_hymn[0];
                  keyName = uh.key_note ? uh.key_note.name_es : '';
                  keyMode = uh.key_mode === 'minor' ? 'Menor' : 'Mayor';
                  energy = uh.energy || '';
                }

                const esc = (str) => `"${String(str || '').replace(/"/g, '""')}"`;

                rows.push([
                  idx + 1,
                  esc(hymnalName),
                  esc(numStr),
                  esc(hymn ? hymn.title_es : ''),
                  esc(keyName),
                  esc(keyMode),
                  esc(energy)
                ].join(','));
              });
            }

            const csvContent = '\uFEFF' + rows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `programa_${prog.name ? prog.name.replace(/\s+/g, '_') : 'musical'}_${prog.date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast('Archivo CSV del programa generado con éxito.', 'success');
          });
        }
      }, 100);
    });
  });
}

// Function to render intelligence modal (Forgotten Hymns & Active New Hymns)
async function openIntelligenceModal(contexts, initialContextId) {
  let currentContextId = initialContextId;

  const renderModalContent = async (contextId) => {
    const forgotten = await programsService.getForgottenHymns(contextId, 10);
    const activeNew = await programsService.getActiveNewHymns(contextId);

    const forgottenHtml = forgotten.length > 0 ? forgotten.map(h => {
      const timeStr = h.days_elapsed > 3000 ? 'Nunca cantado' : `Cantado hace ${h.days_elapsed} días (${h.last_used_at})`;
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark); border: 1px solid var(--border-color); padding: 0.6rem 0.8rem; border-radius: var(--radius-md);">
          <div>
            <strong style="color: var(--text-main); font-size: 0.9rem;">${h.title_es}</strong>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${timeStr}</div>
          </div>
          <span class="badge badge-success">Recomendado</span>
        </div>
      `;
    }).join('') : '<p style="color: var(--text-muted); font-size: 0.85rem;">No hay sugerencias en este momento.</p>';

    const activeNewHtml = activeNew.length > 0 ? activeNew.map(an => {
      const h = an.hymn;
      return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark); border: 1px solid var(--border-color); padding: 0.6rem 0.8rem; border-radius: var(--radius-md);">
          <div>
            <strong style="color: var(--text-main); font-size: 0.9rem;">${h ? h.title_es : 'Himno'}</strong>
            <div style="font-size: 0.8rem; color: var(--primary);">Cantado ${an.usage_count} de ${an.new_hymn_threshold} veces para graduarse</div>
          </div>
          <span class="badge badge-gold">Himno Nuevo</span>
        </div>
      `;
    }).join('') : '<p style="color: var(--text-muted); font-size: 0.85rem;">No hay himnos nuevos activos asignados a este contexto.</p>';

    return `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <div>
          <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Contexto Seleccionado</label>
          <select id="intel-context-select" style="width: 100%;">
            ${contexts.map(c => `<option value="${c.id}" ${c.id === contextId ? 'selected' : ''}>${c.name}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <h4 style="font-size: 0.95rem; color: var(--text-main); font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              💡 Himnos Olvidados (Sin cantar hace más tiempo)
            </h4>
            <div style="display: flex; flex-direction: column; gap: 0.4rem; max-height: 180px; overflow-y: auto;">
              ${forgottenHtml}
            </div>
          </div>

          <div>
            <h4 style="font-size: 0.95rem; color: var(--text-main); font-weight: 600; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
              🌟 Himnos Nuevos Activos en el Contexto
            </h4>
            <div style="display: flex; flex-direction: column; gap: 0.4rem; max-height: 150px; overflow-y: auto;">
              ${activeNewHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  };

  createModal('💡 Asistente Inteligente de Planificación', await renderModalContent(currentContextId), null);

  setTimeout(() => {
    const sel = document.getElementById('intel-context-select');
    if (sel) {
      sel.addEventListener('change', async (e) => {
        currentContextId = e.target.value;
        const modalBody = document.querySelector('.modal-body') || document.getElementById('modal-container');
        if (modalBody) {
          modalBody.innerHTML = await renderModalContent(currentContextId);
        }
      });
    }
  }, 100);
}

async function openProgramFormModal({ isEdit = false, progId = null }) {
  const contexts = await contextsService.getContexts();
  const allHymns = await hymnsService.getHymns();
  const allPrograms = await programsService.getPrograms();

  if (contexts.length === 0) {
    showToast('Debes crear al menos un Contexto (ej. Culto Dominical) antes de planificar un programa.', 'warning');
    window.location.hash = '#/contexts';
    return;
  }

  let prog = null;
  if (isEdit && progId) {
    prog = allPrograms.find(p => p.id === progId);
  }

  const initialContextId = prog ? prog.context_id : contexts[0].id;
  const initialName = prog ? (prog.name || '') : '';
  const initialDate = prog ? prog.date : new Date().toISOString().split('T')[0];

  // Preservar exactamente el orden de los himnos existentes al editar
  let selectedHymns = [];
  if (isEdit && prog && prog.program_hymn) {
    selectedHymns = prog.program_hymn
      .map(ph => ph.hymn || allHymns.find(h => h.id === ph.hymn_id))
      .filter(Boolean);
  }

  const getModalHymnWarning = (hymnId, targetDateStr, targetContextId) => {
    if (!hymnId || !targetDateStr || !targetContextId) return null;
    const targetDate = new Date(targetDateStr);
    const otherProgs = (allPrograms || []).filter(p => p.context_id === targetContextId && (!isEdit || p.id !== progId));

    for (const otherProg of otherProgs) {
      if (!otherProg.program_hymn) continue;
      const hasHymn = otherProg.program_hymn.some(oph => (oph.hymn?.id || oph.hymn_id) === hymnId);
      if (!hasHymn) continue;

      const otherDate = new Date(otherProg.date);
      const diffMs = targetDate.getTime() - otherDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (Math.abs(diffDays) <= 28) {
        if (diffDays > 0) return `⚠️ Cantado hace ${diffDays} día(s) (${otherProg.date})`;
        if (diffDays < 0) return `⚠️ Programado ${Math.abs(diffDays)} día(s) después (${otherProg.date})`;
        return `⚠️ Misma fecha en otro programa (${otherProg.date})`;
      }
    }
    return null;
  };

  const title = isEdit ? '✏️ Editar Programa Musical' : '➕ Crear Programa Musical';

  const modalHtml = `
    <form id="modal-program-form" style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
        <div>
          <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Programa</label>
          <input type="text" id="modal-prog-name" value="${initialName}" placeholder="ej. Culto Dominical de Alabanza" style="width: 100%;" />
        </div>

        <div>
          <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Fecha *</label>
          <input type="date" id="modal-prog-date" required value="${initialDate}" style="width: 100%;" />
        </div>
      </div>

      <div>
        <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Contexto *</label>
        <select id="modal-prog-context" style="width: 100%;">
          ${contexts.map(c => `<option value="${c.id}" ${c.id === initialContextId ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>

      <!-- SECCIÓN: REPERTORIO SELECCIONADO Y REORDENABLE -->
      <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; background: var(--bg-dark);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <label style="font-size: 0.88rem; color: var(--primary); font-weight: 600;">
            🎵 Repertorio Seleccionado (Orden del Programa)
          </label>
          <span id="modal-selected-count" class="badge badge-gold" style="font-size: 0.75rem;">0 himnos</span>
        </div>

        <div id="modal-selected-hymns-container" style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.35rem;">
        </div>
      </div>

      <!-- SECCIÓN: BUSCADOR Y LISTA DE HIMNOS DE SELECCIÓN -->
      <div>
        <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Buscar y Agregar Himnos</label>
        <input type="text" id="modal-prog-hymn-search" placeholder="🔍 Buscar por título o compositor..." style="width: 100%; margin-bottom: 0.5rem; padding: 0.4rem 0.6rem; font-size: 0.85rem;" />
        <div id="modal-hymns-checkboxes-container" style="max-height: 160px; overflow-y: auto; background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.5rem;">
        </div>
      </div>
    </form>
  `;

  createModal(title, modalHtml, async () => {
    const name = document.getElementById('modal-prog-name').value;
    const date = document.getElementById('modal-prog-date').value;
    const contextId = document.getElementById('modal-prog-context').value;
    const hymnIds = selectedHymns.map(h => h.id);

    if (isEdit && progId) {
      await programsService.updateProgram(progId, { name, date, contextId, hymnIds });
      showToast('Programa musical actualizado exitosamente.', 'success');
    } else {
      await programsService.createProgram(contextId, date, name, hymnIds);
      showToast('Programa musical creado exitosamente.', 'success');
    }
    await refreshPlannerView();
  });

  setTimeout(() => {
    const selectedContainer = document.getElementById('modal-selected-hymns-container');
    const selectedCountBadge = document.getElementById('modal-selected-count');
    const checkboxesContainer = document.getElementById('modal-hymns-checkboxes-container');
    const searchInput = document.getElementById('modal-prog-hymn-search');
    const contextSelect = document.getElementById('modal-prog-context');
    const dateInput = document.getElementById('modal-prog-date');

    const updateSelectedRepertoireUI = () => {
      if (!selectedContainer) return;
      if (selectedCountBadge) selectedCountBadge.textContent = `${selectedHymns.length} himno(s)`;

      if (selectedHymns.length === 0) {
        selectedContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; margin: 0.4rem 0;">Ningún himno seleccionado aún. Usa la lista de abajo para agregar.</p>`;
        return;
      }

      selectedContainer.innerHTML = selectedHymns.map((h, idx) => `
        <div class="modal-rep-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); padding: 0.35rem 0.6rem; border-radius: var(--radius-sm);">
          <div style="display: flex; align-items: center; gap: 0.4rem; color: var(--text-main); font-size: 0.88rem; overflow: hidden; flex: 1;">
            <span style="color: var(--text-muted); font-weight: 600; min-width: 22px;">${idx + 1}.</span>
            <strong style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${h.title_es}</strong>
            ${h.composer ? `<span style="color: var(--text-muted); font-size: 0.78rem;">(${h.composer})</span>` : ''}
          </div>

          <div style="display: flex; gap: 0.25rem; align-items: center;">
            <button type="button" class="modal-rep-up-btn" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.72rem; cursor: pointer;">▲</button>
            <button type="button" class="modal-rep-down-btn" data-idx="${idx}" ${idx === selectedHymns.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.72rem; cursor: pointer;">▼</button>
            <button type="button" class="modal-rep-remove-btn" data-idx="${idx}" style="background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: var(--status-danger); padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.72rem; font-weight: bold; cursor: pointer;">✕</button>
          </div>
        </div>
      `).join('');

      selectedContainer.querySelectorAll('.modal-rep-up-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          if (idx > 0) {
            const temp = selectedHymns[idx];
            selectedHymns[idx] = selectedHymns[idx - 1];
            selectedHymns[idx - 1] = temp;
            updateSelectedRepertoireUI();
          }
        });
      });

      selectedContainer.querySelectorAll('.modal-rep-down-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          if (idx < selectedHymns.length - 1) {
            const temp = selectedHymns[idx];
            selectedHymns[idx] = selectedHymns[idx + 1];
            selectedHymns[idx + 1] = temp;
            updateSelectedRepertoireUI();
          }
        });
      });

      selectedContainer.querySelectorAll('.modal-rep-remove-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
          const removed = selectedHymns.splice(idx, 1)[0];
          if (removed && checkboxesContainer) {
            const chk = checkboxesContainer.querySelector(`.modal-hymn-chk[value="${removed.id}"]`);
            if (chk) chk.checked = false;
          }
          updateSelectedRepertoireUI();
        });
      });
    };

    const renderCheckboxesList = () => {
      if (!checkboxesContainer) return;
      const selectedSet = new Set(selectedHymns.map(h => h.id));
      const targetDate = dateInput ? dateInput.value : initialDate;
      const targetContext = contextSelect ? contextSelect.value : initialContextId;

      checkboxesContainer.innerHTML = allHymns.map(h => {
        const isChecked = selectedSet.has(h.id);
        const warningMsg = getModalHymnWarning(h.id, targetDate, targetContext);
        const badgeText = warningMsg ? `<span class="badge badge-gold" style="font-size: 0.72rem; margin-left: 0.4rem;">${warningMsg}</span>` : '';

        return `
          <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; cursor: pointer; color: var(--text-main); font-size: 0.88rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
            <span style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
              <input type="checkbox" class="modal-hymn-chk" value="${h.id}" ${isChecked ? 'checked' : ''} />
              <span>🎵 <strong>${h.title_es}</strong> ${h.composer ? `(${h.composer})` : ''}</span>
            </span>
            ${badgeText}
          </label>
        `;
      }).join('');

      checkboxesContainer.querySelectorAll('.modal-hymn-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
          const hymnId = e.target.value;
          if (e.target.checked) {
            const found = allHymns.find(h => h.id === hymnId);
            if (found && !selectedHymns.some(sh => sh.id === hymnId)) {
              selectedHymns.push(found);
            }
          } else {
            selectedHymns = selectedHymns.filter(sh => sh.id !== hymnId);
          }
          updateSelectedRepertoireUI();
        });
      });

      filterHymns();
    };

    const filterHymns = () => {
      if (!checkboxesContainer || !searchInput) return;
      const query = normalizeText(searchInput.value);
      const labels = checkboxesContainer.querySelectorAll('label');
      labels.forEach(label => {
        const text = normalizeText(label.textContent || '');
        if (!query || text.includes(query)) {
          label.style.display = 'flex';
        } else {
          label.style.display = 'none';
        }
      });
    };

    if (contextSelect) {
      contextSelect.addEventListener('change', () => {
        renderCheckboxesList();
      });
    }

    if (dateInput) {
      dateInput.addEventListener('change', () => {
        renderCheckboxesList();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', debounce(filterHymns, 200));
    }

    updateSelectedRepertoireUI();
    renderCheckboxesList();
  }, 100);
}
