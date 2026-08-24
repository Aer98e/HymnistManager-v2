import { contextsService } from '../services/contexts.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { authService } from '../services/auth.service.js';
import { createModal } from '../components/modal.js';

export async function renderContextsView() {
  const contexts = await contextsService.getContexts();
  const prefs = await authService.getUserPreferences();

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            🎯 Contextos & Himnos Nuevos
          </h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Organiza tus tipos de reunión (Culto Dominical, Jóvenes) y supervisa el aprendizaje de himnos nuevos
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem;">
          <button id="config-threshold-btn" style="
            background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main);
            padding: 0.65rem 1rem; border-radius: var(--radius-md); font-weight: 500; cursor: pointer;
          ">
            ⚙️ Umbral: ${prefs.new_hymn_threshold} usos
          </button>
          <button id="create-context-btn" style="
            background: var(--gradient-primary); border: none; color: white; padding: 0.65rem 1.2rem;
            border-radius: var(--radius-md); font-weight: 600; cursor: pointer;
          ">
            ➕ Nuevo Contexto
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;">
        ${contexts.map(ctx => renderContextCard(ctx, prefs.new_hymn_threshold)).join('')}
      </div>
    </div>
  `;
}

function renderContextCard(ctx, threshold) {
  return `
    <div style="
      background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1.25rem;
    ">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.2rem; color: var(--text-main); font-weight: 600;">${ctx.name}</h3>
          <button class="delete-context-btn" data-id="${ctx.id}" style="background: none; border: none; color: var(--status-danger); cursor: pointer;">🗑️</button>
        </div>

        <div style="
          background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2);
          padding: 0.8rem; border-radius: var(--radius-sm); margin-bottom: 1rem;
        ">
          <div style="font-size: 0.8rem; color: var(--accent); font-weight: 600; text-transform: uppercase;">Categoría Automática</div>
          <div style="font-size: 0.9rem; color: var(--text-main); font-weight: 500;">${ctx.new_hymns_category ? ctx.new_hymns_category.name : 'Categoría Nuevos'}</div>
        </div>

        <div>
          <h4 style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.5rem;">✨ Himnos en Aprendizaje (Menos de ${threshold} usos)</h4>
          <div id="new-hymns-container-${ctx.id}" style="font-size: 0.85rem; color: var(--text-muted);">
            Cargando himnos nuevos dinámicos...
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; justify-content: flex-end;">
        <button class="add-new-hymn-to-ctx-btn" data-ctx-id="${ctx.id}" data-cat-id="${ctx.new_hymns_category_id}" style="
          background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main);
          padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer;
        ">
          ➕ Marcar Himno como Nuevo
        </button>
      </div>
    </div>
  `;
}

export async function setupContextsEvents() {
  const createBtn = document.getElementById('create-context-btn');
  const thresholdBtn = document.getElementById('config-threshold-btn');
  const contexts = await contextsService.getContexts();

  // Load active new hymns dynamically for each context
  contexts.forEach(async (ctx) => {
    const el = document.getElementById(`new-hymns-container-${ctx.id}`);
    if (el) {
      const activeHymns = await contextsService.getActiveNewHymns(ctx.id);
      if (activeHymns.length === 0) {
        el.innerHTML = `<span style="font-style: italic;">No hay himnos nuevos en periodo de aprendizaje en este contexto.</span>`;
      } else {
        el.innerHTML = `
          <ul style="list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
            ${activeHymns.map(item => `
              <li style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm);">
                <span>🎵 ${item.hymn ? item.hymn.title_es : 'Himno'}</span>
                <span style="font-weight: 600; color: var(--status-warning);">${item.usage_count} / ${item.new_hymn_threshold} usos</span>
              </li>
            `).join('')}
          </ul>
        `;
      }
    }
  });

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      createModal('Crear Nuevo Contexto', `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Contexto *</label>
            <input type="text" id="context-name-input" required placeholder="ej. Culto Dominical" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
        </form>
      `, async () => {
        const name = document.getElementById('context-name-input').value;
        await contextsService.createContext(name);
        window.location.reload();
      });
    });
  }

  if (thresholdBtn) {
    thresholdBtn.addEventListener('click', async () => {
      const currentPrefs = await authService.getUserPreferences();
      createModal('Configurar Umbral de Himnos Nuevos', `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Umbral de Usos (Veces cantado para dejar de ser nuevo)</label>
            <input type="number" id="threshold-val" min="1" max="20" value="${currentPrefs.new_hymn_threshold}" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
        </form>
      `, async () => {
        const val = document.getElementById('threshold-val').value;
        await authService.updateUserPreferences(parseInt(val, 10));
        window.location.reload();
      });
    });
  }

  document.querySelectorAll('.delete-context-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('¿Eliminar este contexto y todos sus programas asociados?')) {
        await contextsService.deleteContext(id);
        window.location.reload();
      }
    });
  });

  document.querySelectorAll('.add-new-hymn-to-ctx-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const catId = e.currentTarget.getAttribute('data-cat-id');
      const allHymns = await hymnsService.getHymns();

      createModal('Marcar Himno como Nuevo en este Contexto', `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Himno</label>
            <select id="select-hymn-to-new" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
              ${allHymns.map(h => `<option value="${h.id}">${h.title_es}</option>`).join('')}
            </select>
          </div>
        </form>
      `, async () => {
        const hymnId = document.getElementById('select-hymn-to-new').value;
        await contextsService.addHymnToNewHymnsCategory(catId, hymnId);
        window.location.reload();
      });
    });
  });
}
