import { contextsService } from '../services/contexts.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { authService } from '../services/auth.service.js';
import { createModal, showConfirmModal, showToast } from '../components/modal.js';
import { icons } from '../utils/icons.js';

export async function renderContextsView() {
  const contexts = await contextsService.getContexts();
  const prefs = await authService.getUserPreferences();

  return `
    <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 2rem; font-style: italic; color: var(--text-main); margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.6rem;">
            <span style="color: var(--primary); display: flex; align-items: center;">${icons.contexts(28)}</span>
            <span>Contextos & Himnos Nuevos</span>
          </h1>
          <p class="subtitle">
            Organiza los tipos de reunión litúrgica y supervisa el proceso de aprendizaje congregacional.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="config-threshold-btn" class="btn btn-secondary">
            ${icons.filter(16)}
            <span>Umbral: ${prefs.new_hymn_threshold} usos</span>
          </button>
          <button id="create-context-btn" class="btn btn-primary">
            ${icons.plus(16)}
            <span>Nuevo Contexto</span>
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem;">
        ${contexts.map(ctx => renderContextCard(ctx, prefs.new_hymn_threshold)).join('')}
      </div>
    </div>
  `;
}

export async function refreshContextsView() {
  const container = document.getElementById('main-content') || document.querySelector('main');
  if (container) {
    container.innerHTML = await renderContextsView();
    setupContextsEvents();
  }
}

function renderContextCard(ctx, threshold) {
  return `
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 1.25rem;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <h3 style="font-size: 1.1rem; color: var(--text-main); font-weight: 600;">${ctx.name}</h3>
          <button class="btn btn-danger btn-sm delete-context-btn" data-id="${ctx.id}" data-name="${ctx.name}" title="Eliminar Contexto">
            ${icons.trash(14)}
          </button>
        </div>

        <div style="
          background: var(--badge-bg); border: 1px solid rgba(30, 64, 175, 0.15);
          padding: 0.75rem 0.85rem; border-radius: var(--radius-sm); margin-bottom: 1rem;
        ">
          <div style="font-size: 0.75rem; color: var(--primary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Categoría Automática</div>
          <div style="font-size: 0.9rem; color: var(--text-main); font-weight: 500;">${ctx.new_hymns_category ? ctx.new_hymns_category.name : 'Categoría Nuevos'}</div>
        </div>

        <div>
          <h4 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; font-weight: 500;">Himnos en Aprendizaje (Menos de ${threshold} usos)</h4>
          <div id="new-hymns-container-${ctx.id}" style="font-size: 0.85rem; color: var(--text-muted);">
            Cargando himnos nuevos...
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; justify-content: flex-end;">
        <button class="btn btn-outline btn-sm add-new-hymn-to-ctx-btn" data-ctx-id="${ctx.id}" data-cat-id="${ctx.new_hymns_category_id}">
          ${icons.plus(14)}
          <span>Marcar Himno como Nuevo</span>
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
              <li style="display: flex; justify-content: space-between; background: var(--bg-dark); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <span style="display: flex; align-items: center; gap: 0.35rem;">
                  <span style="color: var(--primary);">${icons.music(14)}</span>
                  <span>${item.hymn ? item.hymn.title_es : 'Himno'}</span>
                </span>
                <span class="badge badge-gold">${item.usage_count} / ${item.new_hymn_threshold} usos</span>
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
        if (!name) throw new Error('Ingresa un nombre para el contexto');
        await contextsService.createContext(name);
        showToast(`Contexto "${name}" creado exitosamente.`, 'success');
        await refreshContextsView();
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
        showToast('Umbral de himnos nuevos actualizado.', 'success');
        await refreshContextsView();
      });
    });
  }

  document.querySelectorAll('.delete-context-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');

      showConfirmModal({
        title: '¿Eliminar Contexto?',
        message: `¿Deseas eliminar el contexto "${name}" y todos sus programas asociados?`,
        confirmText: '🗑️ Sí, Eliminar',
        danger: true,
        onConfirm: async () => {
          await contextsService.deleteContext(id);
          showToast(`Contexto "${name}" eliminado.`, 'success');
          await refreshContextsView();
        }
      });
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
        showToast('Himno agregado a la lista de himnos nuevos del contexto.', 'success');
        await refreshContextsView();
      });
    });
  });
}
