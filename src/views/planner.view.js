import { programsService } from '../services/programs.service.js';
import { contextsService } from '../services/contexts.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { createModal } from '../components/modal.js';

export async function renderPlannerView() {
  const programs = await programsService.getPrograms();
  const contexts = await contextsService.getContexts();

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            📅 Planificador de Programas
          </h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Planifica el repertorio para fechas específicas y evita repeticiones excesivas
          </p>
        </div>
        <button id="create-program-btn" style="
          background: var(--gradient-primary); border: none; color: white; padding: 0.65rem 1.2rem;
          border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
        ">
          <span>➕</span> Crear Programa
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${programs.length === 0 ? `
          <div style="text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            No hay programas creados aún. ¡Crea uno para comenzar!
          </div>
        ` : programs.map(p => renderProgramCard(p)).join('')}
      </div>
    </div>
  `;
}

function renderProgramCard(program) {
  const formattedDate = new Date(program.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `
    <div style="
      background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
        <div>
          <h3 style="font-size: 1.2rem; color: var(--text-main); font-weight: 600;">${program.name || 'Programa Musical'}</h3>
          <div style="font-size: 0.85rem; color: var(--primary); font-weight: 500;">📅 ${formattedDate} | Contexto: ${program.context ? program.context.name : 'General'}</div>
        </div>
      </div>

      <div>
        <h4 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">Repertorio Seleccionado (${program.program_hymn ? program.program_hymn.length : 0} himnos)</h4>
        <ol style="padding-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
          ${program.program_hymn && program.program_hymn.length > 0 ? program.program_hymn.map(ph => `
            <li style="color: var(--text-main); font-size: 0.95rem;">
              <strong>${ph.hymn ? ph.hymn.title_es : 'Himno'}</strong>
              ${ph.hymn && ph.hymn.composer ? `<span style="color: var(--text-muted); font-size: 0.85rem;"> — ${ph.hymn.composer}</span>` : ''}
            </li>
          `).join('') : `<p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Sin himnos agregados a este programa.</p>`}
        </ol>
      </div>
    </div>
  `;
}

export function setupPlannerEvents() {
  const createBtn = document.getElementById('create-program-btn');

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const contexts = await contextsService.getContexts();
      const hymns = await hymnsService.getHymns();

      if (contexts.length === 0) {
        alert('Debes crear al menos un Contexto (ej. Culto Dominical) antes de planificar un programa.');
        window.location.hash = '#/contexts';
        return;
      }

      createModal('Crear Programa Musical', `
        <form id="program-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Programa</label>
            <input type="text" id="prog-name" placeholder="ej. Culto de Alabanza" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
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
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Himnos para el Programa</label>
            <div style="max-height: 180px; overflow-y: auto; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.5rem;">
              ${hymns.map(h => `
                <label style="display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; cursor: pointer; color: var(--text-main); font-size: 0.9rem;">
                  <input type="checkbox" class="hymn-select-chk" value="${h.id}" />
                  <span>${h.title_es}</span>
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
}
