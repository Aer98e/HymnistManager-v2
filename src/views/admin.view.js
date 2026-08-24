import { hymnalsService } from '../services/hymnals.service.js';
import { createModal } from '../components/modal.js';

export async function renderAdminView() {
  const pendingHymnals = await hymnalsService.getPendingHymnals();

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="margin-bottom: 2rem;">
        <h1 style="font-size: 1.8rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          🛡️ Panel de Administración
        </h1>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Revisión y aprobación de himnarios en estado pendiente de publicación
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

function renderPendingCard(hymnal) {
  return `
    <div style="
      background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;
    ">
      <div>
        <h3 style="font-size: 1.2rem; color: var(--text-main); font-weight: 600;">${hymnal.name}</h3>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
          Solicitado el: ${new Date(hymnal.created_at).toLocaleDateString()} | Himnos numerados: ${hymnal.hymnal_hymn ? hymnal.hymnal_hymn.length : 0}
        </div>
      </div>

      <div style="display: flex; gap: 0.75rem;">
        <button class="reject-hymnal-admin-btn" data-id="${hymnal.id}" data-name="${hymnal.name}" style="
          background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-danger);
          padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;
        ">
          ❌ Rechazar
        </button>

        <button class="approve-hymnal-admin-btn" data-id="${hymnal.id}" data-name="${hymnal.name}" style="
          background: var(--status-success); border: none; color: white;
          padding: 0.5rem 1rem; border-radius: var(--radius-md); font-weight: 600; cursor: pointer;
        ">
          ✅ Aprobar Publicación
        </button>
      </div>
    </div>
  `;
}

export function setupAdminEvents() {
  document.querySelectorAll('.approve-hymnal-admin-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      if (confirm(`¿Aprobar el himnario "${name}" para que sea público globalmente?`)) {
        await hymnalsService.approveHymnal(id);
        alert('Himnario aprobado con éxito.');
        window.location.reload();
      }
    });
  });

  document.querySelectorAll('.reject-hymnal-admin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');

      createModal(`Rechazar Himnario: ${name}`, `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Razón de Rechazo (Feedback al usuario) *</label>
            <textarea id="rejection-reason-input" required rows="3" placeholder="ej. Corregir los números del himno 14 y 15 que están duplicados." style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;"></textarea>
          </div>
        </form>
      `, async () => {
        const reason = document.getElementById('rejection-reason-input').value;
        await hymnalsService.rejectHymnal(id, reason);
        alert('Himnario rechazado con retroalimentación.');
        window.location.reload();
      });
    });
  });
}
