import { hymnalsService } from '../services/hymnals.service.js';
import { createModal, showConfirmModal, showToast } from '../components/modal.js';
import { openSmartLinkerModal } from './hymnals.view.js';
import { icons } from '../utils/icons.js';

export async function renderAdminView() {
  const pendingHymnals = await hymnalsService.getPendingHymnals();

  return `
    <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 2rem; font-style: italic; color: var(--text-main); margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.6rem;">
          <span style="color: var(--primary); display: flex; align-items: center;">${icons.admin(28)}</span>
          <span>Panel de Administración</span>
        </h1>
        <p class="subtitle">
          Revisión minuciosa, verificación de coincidencia y aprobación de colecciones públicas.
        </p>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        ${pendingHymnals.length === 0 ? `
          <div style="text-align: center; color: var(--text-muted); padding: 3rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            ✨ No hay himnarios pendientes de revisión en este momento.
          </div>
        ` : pendingHymnals.map(h => renderPendingCard(h)).join('')}
      </div>
    </div>
  `;
}

export async function refreshAdminView() {
  const container = document.getElementById('main-content') || document.querySelector('main');
  if (container) {
    container.innerHTML = await renderAdminView();
    setupAdminEvents();
  }
}

function renderPendingCard(hymnal) {
  const hymnCount = hymnal.hymnal_hymn ? hymnal.hymnal_hymn.length : 0;

  return `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h3 style="font-size: 1.15rem; color: var(--text-main); font-weight: 600;">${hymnal.name}</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
            Solicitado el: ${new Date(hymnal.created_at).toLocaleDateString()} | Idioma: ${hymnal.language ? hymnal.language.name : 'Español'} | Himnos contenidos: ${hymnCount}
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-outline btn-sm inspect-hymnal-admin-btn" data-id="${hymnal.id}" data-name="${hymnal.name}">
            ${icons.hymns(14)}
            <span>Inspeccionar Detalles</span>
          </button>

          <button class="btn btn-secondary btn-sm smart-linker-admin-btn" data-id="${hymnal.id}">
            ${icons.contexts(14)}
            <span>Enlace Inteligente</span>
          </button>

          <button class="btn btn-danger btn-sm reject-hymnal-admin-btn" data-id="${hymnal.id}" data-name="${hymnal.name}">
            ${icons.close(14)}
            <span>Rechazar</span>
          </button>

          <button class="btn btn-primary btn-sm approve-hymnal-admin-btn" data-id="${hymnal.id}" data-name="${hymnal.name}" data-count="${hymnCount}">
            ${icons.check(14)}
            <span>Aprobar Publicación</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function setupAdminEvents() {
  // Smart Linker for Admin
  document.querySelectorAll('.smart-linker-admin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      openSmartLinkerModal(id);
    });
  });

  // Inspect hymnal contents handler with FULL hymn details (Composer, First line, Refrain, Original Title)
  document.querySelectorAll('.inspect-hymnal-admin-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');

      try {
        const details = await hymnalsService.getHymnalDetails(id);
        const items = details.hymnal_hymn || [];

        const itemsHtml = items.length === 0 ? `
          <div style="color: var(--text-muted); text-align: center; padding: 1.5rem;">Este himnario no contiene himnos asociados aún.</div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
            ${items.sort((a, b) => a.number - b.number).map(item => {
              const h = item.hymn || {};
              return `
                <div style="padding: 0.85rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 0.3rem;">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                      <strong style="color: var(--primary); font-size: 1.05rem;">#${item.number}</strong> 
                      <span style="font-weight: 600; color: white; font-size: 1rem; margin-left: 0.3rem;">${h.title_es || 'Sin título'}</span>
                      ${h.title_original ? `<span style="font-size: 0.82rem; color: var(--text-muted); font-style: italic; margin-left: 0.4rem;">(${h.title_original})</span>` : ''}
                    </div>
                    <span style="font-size: 0.75rem; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 600; background: ${h.type === 'public' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(139, 92, 246, 0.15)'}; color: ${h.type === 'public' ? 'var(--status-success)' : 'var(--accent)'};">
                      ${h.type === 'public' ? 'Público' : 'Privado'}
                    </span>
                  </div>

                  <div style="font-size: 0.82rem; color: var(--text-muted);">
                    👤 Autor / Compositor: <strong style="color: var(--text-main);">${h.composer || 'Desconocido'}</strong>
                  </div>

                  ${h.first_line ? `
                    <div style="font-size: 0.82rem; color: var(--accent-cyan); font-style: italic;">
                      🎶 1ª Estrofa: "${h.first_line}"
                    </div>
                  ` : ''}

                  ${h.refrain_first_line ? `
                    <div style="font-size: 0.82rem; color: var(--status-warning); font-style: italic;">
                      ✨ Coro: "${h.refrain_first_line}"
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        `;

        createModal(`Revisión Detallada: ${name}`, itemsHtml);
      } catch (err) {
        showToast(`Error al obtener detalles: ${err.message}`, 'error');
      }
    });
  });

  // Approve hymnal handler
  document.querySelectorAll('.approve-hymnal-admin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      const count = e.currentTarget.getAttribute('data-count');

      showConfirmModal({
        title: '¿Aprobar Himnario?',
        message: `¿Estás seguro de que deseas aprobar y publicar "${name}"?\n Sus ${count} himnos asociados pasarán a ser PÚBLICOS GLOBALMENTE y no se podrá deshacer esta acción.`,
        confirmText: '✅ Aprobar y Publicar',
        onConfirm: async () => {
          await hymnalsService.approveHymnal(id);
          showToast(`Himnario "${name}" publicado globalmente.`, 'success');
          await refreshAdminView();
        }
      });
    });
  });

  // Reject hymnal handler
  document.querySelectorAll('.reject-hymnal-admin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');

      createModal(`Rechazar Himnario: ${name}`, `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Razón de Rechazo (Feedback al usuario) *</label>
            <textarea id="rejection-reason-input" required rows="3" placeholder="ej. Corregir los números del himno 14 y 15 que están duplicados." style="width: 100%;"></textarea>
          </div>
        </form>
      `, async () => {
        const reason = document.getElementById('rejection-reason-input').value;
        if (!reason) throw new Error('Debes proporcionar una razón de rechazo');
        await hymnalsService.rejectHymnal(id, reason);
        showToast('Himnario rechazado con retroalimentación.', 'info');
        await refreshAdminView();
      });
    });
  });
}
