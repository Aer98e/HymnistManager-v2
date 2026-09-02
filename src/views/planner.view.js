import { programsService } from '../services/programs.service.js';
import { contextsService } from '../services/contexts.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { hymnalsService } from '../services/hymnals.service.js';
import { authService } from '../services/auth.service.js';
import { createModal, showToast } from '../components/modal.js';
import { icons } from '../utils/icons.js';

export async function renderPlannerView() {
  const programs = await programsService.getPrograms();
  const prefs = await authService.getUserPreferences();
  const preferredHymnalName = prefs.preferred_hymnal ? prefs.preferred_hymnal.name : 'Ninguno (Seleccionar)';

  // Build usage stats map per context
  const usageStatsByContext = new Map();
  for (const p of programs) {
    if (p.context_id && !usageStatsByContext.has(p.context_id)) {
      try {
        const stats = await programsService.getContextRecentUsageStats(p.context_id);
        usageStatsByContext.set(p.context_id, stats);
      } catch (e) {
        console.error('Error fetching usage stats for context:', e);
      }
    }
  }

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
        ` : programs.map(p => renderProgramCard(p, prefs.preferred_hymnal_id, usageStatsByContext.get(p.context_id))).join('')}
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

function renderProgramCard(program, preferredHymnalId, contextUsageMap) {
  const formattedDate = new Date(program.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const hymnList = program.program_hymn || [];

  // Check recent repetition warnings
  const recentWarnings = [];
  if (contextUsageMap && hymnList.length > 0) {
    hymnList.forEach(ph => {
      const hId = ph.hymn?.id || ph.hymn_id;
      const stat = contextUsageMap.get(hId);
      if (stat && stat.usedRecently) {
        recentWarnings.push({
          title: ph.hymn?.title_es || 'Himno',
          daysAgo: stat.daysAgo,
          lastDate: stat.lastDate
        });
      }
    });
  }

  return `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3 style="font-size: 1.15rem; color: var(--text-main); font-weight: 600;">${program.name || 'Programa Musical'}</h3>
          <div style="font-size: 0.85rem; color: var(--primary); font-weight: 500; display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem;">
            ${icons.planner(14)}
            <span>${formattedDate} | Contexto: ${program.context ? program.context.name : 'General'}</span>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; align-items: center;">
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
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${hymnList.length > 0 ? hymnList.map((ph, idx) => {
            const hymn = ph.hymn;
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
              <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark); border: 1px solid var(--border-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-md);">
                <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.95rem;">
                  <span style="color: var(--text-muted); font-size: 0.85rem; font-weight: 600; width: 22px;">${idx + 1}.</span>
                  ${numberText}<strong>${hymn ? hymn.title_es : 'Himno'}</strong>
                  ${hymn && hymn.composer ? `<span style="color: var(--text-muted); font-size: 0.85rem;"> (${hymn.composer})</span>` : ''}
                  ${musicDetails}
                </div>

                <!-- Reorder buttons -->
                <div style="display: flex; gap: 0.25rem;">
                  <button class="reorder-hymn-up-btn" data-prog-id="${program.id}" data-index="${idx}" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.2rem 0.4rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
                    ▲
                  </button>
                  <button class="reorder-hymn-down-btn" data-prog-id="${program.id}" data-index="${idx}" ${idx === hymnList.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main); padding: 0.2rem 0.4rem; border-radius: 4px; cursor: pointer; font-size: 0.75rem;">
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
              ⚠️ Advertencia: Himnos cantados recientemente en este Contexto (menos de 28 días):
            </div>
            <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.82rem; color: var(--text-main); display: flex; flex-direction: column; gap: 0.2rem;">
              ${recentWarnings.map(w => `
                <li><strong>${w.title}</strong> — Cantado hace ${w.daysAgo} días (${w.lastDate})</li>
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

  // Reordenar himno arriba ▲
  document.querySelectorAll('.reorder-hymn-up-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const progId = e.currentTarget.getAttribute('data-prog-id');
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      if (isNaN(idx) || idx <= 0) return;

      const programs = await programsService.getPrograms();
      const prog = programs.find(p => p.id === progId);
      if (!prog || !prog.program_hymn) return;

      const hymnIds = prog.program_hymn.map(ph => ph.hymn_id);
      // Swap idx and idx - 1
      const temp = hymnIds[idx];
      hymnIds[idx] = hymnIds[idx - 1];
      hymnIds[idx - 1] = temp;

      await programsService.updateProgramHymnOrder(progId, hymnIds);
      showToast('Orden del repertorio actualizado.', 'success');
      await refreshPlannerView();
    });
  });

  // Reordenar himno abajo ▼
  document.querySelectorAll('.reorder-hymn-down-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const progId = e.currentTarget.getAttribute('data-prog-id');
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      
      const programs = await programsService.getPrograms();
      const prog = programs.find(p => p.id === progId);
      if (!prog || !prog.program_hymn || idx >= prog.program_hymn.length - 1) return;

      const hymnIds = prog.program_hymn.map(ph => ph.hymn_id);
      // Swap idx and idx + 1
      const temp = hymnIds[idx];
      hymnIds[idx] = hymnIds[idx + 1];
      hymnIds[idx + 1] = temp;

      await programsService.updateProgramHymnOrder(progId, hymnIds);
      showToast('Orden del repertorio actualizado.', 'success');
      await refreshPlannerView();
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

  if (configPrefBtn) {
    configPrefBtn.addEventListener('click', async () => {
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
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const contexts = await contextsService.getContexts();
      const hymns = await hymnsService.getHymns();

      if (contexts.length === 0) {
        showToast('Debes crear al menos un Contexto (ej. Culto Dominical) antes de planificar un programa.', 'warning');
        window.location.hash = '#/contexts';
        return;
      }

      let currentUsageMap = await programsService.getContextRecentUsageStats(contexts[0].id);

      const renderHymnCheckboxes = (usageMap) => {
        return hymns.map(h => {
          const stat = usageMap.get(h.id);
          const isRecent = stat && stat.usedRecently;
          const badgeText = isRecent ? `<span class="badge badge-gold" style="font-size: 0.72rem; margin-left: 0.4rem;">⚠️ Cantado hace ${stat.daysAgo} días</span>` : '';

          return `
            <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.35rem 0.5rem; cursor: pointer; color: var(--text-main); font-size: 0.88rem; border-bottom: 1px solid rgba(255,255,255,0.03);">
              <span style="display: flex; align-items: center; gap: 0.5rem; flex: 1;">
                <input type="checkbox" class="hymn-select-chk" value="${h.id}" />
                <span>🎵 <strong>${h.title_es}</strong> ${h.composer ? `(${h.composer})` : ''}</span>
              </span>
              ${badgeText}
            </label>
          `;
        }).join('');
      };

      createModal('Crear Programa Musical (Armado por Nombre)', `
        <form id="program-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Programa</label>
            <input type="text" id="prog-name" placeholder="ej. Culto Dominical de Alabanza" style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Fecha *</label>
            <input type="date" id="prog-date" required value="${new Date().toISOString().split('T')[0]}" style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Contexto *</label>
            <select id="prog-context" style="width: 100%;">
              ${contexts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Himnos por Nombre</label>
            <div id="prog-hymns-checkboxes-container" style="max-height: 200px; overflow-y: auto; background: var(--bg-dark); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.5rem;">
              ${renderHymnCheckboxes(currentUsageMap)}
            </div>
          </div>
        </form>
      `, async () => {
        const name = document.getElementById('prog-name').value;
        const date = document.getElementById('prog-date').value;
        const contextId = document.getElementById('prog-context').value;
        const selectedHymnIds = Array.from(document.querySelectorAll('.hymn-select-chk:checked')).map(cb => cb.value);

        await programsService.createProgram(contextId, date, name, selectedHymnIds);
        showToast('Programa musical creado exitosamente.', 'success');
        await refreshPlannerView();
      });

      setTimeout(() => {
        const ctxSelect = document.getElementById('prog-context');
        const listContainer = document.getElementById('prog-hymns-checkboxes-container');
        if (ctxSelect && listContainer) {
          ctxSelect.addEventListener('change', async (e) => {
            const ctxId = e.target.value;
            currentUsageMap = await programsService.getContextRecentUsageStats(ctxId);
            listContainer.innerHTML = renderHymnCheckboxes(currentUsageMap);
          });
        }
      }, 100);
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
