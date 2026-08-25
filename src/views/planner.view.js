import { programsService } from '../services/programs.service.js';
import { contextsService } from '../services/contexts.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { hymnalsService } from '../services/hymnals.service.js';
import { authService } from '../services/auth.service.js';
import { createModal } from '../components/modal.js';

export async function renderPlannerView() {
  const programs = await programsService.getPrograms();
  const prefs = await authService.getUserPreferences();
  const preferredHymnalName = prefs.preferred_hymnal ? prefs.preferred_hymnal.name : 'Ninguno (Seleccionar)';

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            📅 Planificador de Programas
          </h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Diseña tus programas musicales por títulos. Los números de himnario se asignarán automáticamente al exportar.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="config-preferred-hymnal-btn" style="
            background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main);
            padding: 0.65rem 1rem; border-radius: var(--radius-md); font-weight: 500; cursor: pointer;
          ">
            📖 Himnario Preferido: <strong>${preferredHymnalName}</strong>
          </button>

          <button id="create-program-btn" style="
            background: var(--gradient-primary); border: none; color: white; padding: 0.65rem 1.2rem;
            border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          ">
            <span>➕</span> Crear Programa
          </button>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${programs.length === 0 ? `
          <div style="text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            No hay programas creados aún. ¡Crea uno para comenzar!
          </div>
        ` : programs.map(p => renderProgramCard(p, prefs.preferred_hymnal_id)).join('')}
      </div>
    </div>
  `;
}

function renderProgramCard(program, preferredHymnalId) {
  const formattedDate = new Date(program.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <div style="
      background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--text-main); font-weight: 600;">${program.name || 'Programa Musical'}</h3>
          <div style="font-size: 0.85rem; color: var(--primary); font-weight: 500;">📅 ${formattedDate} | Contexto: ${program.context ? program.context.name : 'General'}</div>
        </div>

        <button class="export-program-btn" data-id="${program.id}" style="
          background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--status-success);
          padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer; font-weight: 600;
        ">
          📲 Exportar / Copiar con Números
        </button>
      </div>

      <div>
        <h4 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Repertorio Seleccionado (${program.program_hymn ? program.program_hymn.length : 0} himnos)</h4>
        <ol style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
          ${program.program_hymn && program.program_hymn.length > 0 ? program.program_hymn.map(ph => {
            const hymn = ph.hymn;
            let numberText = '';
            if (hymn && preferredHymnalId && hymn.hymnal_hymn) {
              const mapping = hymn.hymnal_hymn.find(hh => hh.hymnal_id === preferredHymnalId);
              if (mapping) {
                numberText = `<span style="color: var(--status-warning); font-weight: 700;">#${mapping.number}</span> — `;
              }
            }
            return `
              <li style="color: var(--text-main); font-size: 0.95rem;">
                ${numberText}<strong>${hymn ? hymn.title_es : 'Himno'}</strong>
                ${hymn && hymn.composer ? `<span style="color: var(--text-muted); font-size: 0.85rem;"> (${hymn.composer})</span>` : ''}
              </li>
            `;
          }).join('') : `<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Sin himnos agregados a este programa.</p>`}
        </ol>
      </div>
    </div>
  `;
}

export function setupPlannerEvents() {
  const createBtn = document.getElementById('create-program-btn');
  const configPrefBtn = document.getElementById('config-preferred-hymnal-btn');

  if (configPrefBtn) {
    configPrefBtn.addEventListener('click', async () => {
      const hymnals = await hymnalsService.getHymnals();
      const currentPrefs = await authService.getUserPreferences();

      createModal('Seleccionar Himnario Preferido para Tu Iglesia', `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Himnario Principal</label>
            <select id="select-pref-hymnal" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
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
        window.location.reload();
      });
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const contexts = await contextsService.getContexts();
      const hymns = await hymnsService.getHymns();

      if (contexts.length === 0) {
        alert('Debes crear al menos un Contexto (ej. Culto Dominical) antes de planificar un programa.');
        window.location.hash = '#/contexts';
        return;
      }

      createModal('Crear Programa Musical (Armado por Nombre)', `
        <form id="program-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Programa</label>
            <input type="text" id="prog-name" placeholder="ej. Culto Dominical de Alabanza" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Fecha *</label>
            <input type="date" id="prog-date" required value="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Contexto *</label>
            <select id="prog-context" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
              ${contexts.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Himnos por Nombre</label>
            <div style="max-height: 180px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.5rem;">
              ${hymns.map(h => `
                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; cursor: pointer; color: var(--text-main); font-size: 0.9rem;">
                  <input type="checkbox" class="hymn-select-chk" value="${h.id}" />
                  <span>🎵 <strong>${h.title_es}</strong> ${h.composer ? `(${h.composer})` : ''}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </form>
      `, async () => {
        const name = document.getElementById('prog-name').value;
        const date = document.getElementById('prog-date').value;
        const contextId = document.getElementById('prog-context').value;
        const selectedHymnIds = Array.from(document.querySelectorAll('.hymn-select-chk:checked')).map(cb => cb.value);

        await programsService.createProgram(contextId, date, name, selectedHymnIds);
        window.location.reload();
      });
    });
  }

  document.querySelectorAll('.export-program-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const progId = e.currentTarget.getAttribute('data-id');
      const programs = await programsService.getPrograms();
      const prog = programs.find(p => p.id === progId);
      const prefs = await authService.getUserPreferences();

      if (!prog) return;

      let textOutput = `🎶 *${prog.name || 'Programa Musical'}*\n📅 Fecha: ${prog.date}\n🏛️ Contexto: ${prog.context ? prog.context.name : ''}\n\n`;

      if (prog.program_hymn) {
        prog.program_hymn.forEach((ph, idx) => {
          const hymn = ph.hymn;
          let numStr = '';
          if (hymn && prefs.preferred_hymnal_id && hymn.hymnal_hymn) {
            const mapping = hymn.hymnal_hymn.find(hh => hh.hymnal_id === prefs.preferred_hymnal_id);
            if (mapping) numStr = `#${mapping.number} `;
          }
          textOutput += `${idx + 1}. ${numStr}${hymn ? hymn.title_es : 'Himno'}\n`;
        });
      }

      navigator.clipboard.writeText(textOutput);
      alert('¡Programa copiado al portapapeles con sus números correspondientes para compartir por WhatsApp!');
    });
  });
}
