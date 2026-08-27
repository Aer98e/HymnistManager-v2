import { hymnalsService } from '../services/hymnals.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { authService } from '../services/auth.service.js';
import { createModal, showConfirmModal, showToast } from '../components/modal.js';
import { openCustomHymnalBuilderModal } from '../components/custom_hymnal_builder.modal.js';
import { icons } from '../utils/icons.js';

export async function renderHymnalsView() {
  const hymnals = await hymnalsService.getHymnals();
  const currentUser = await authService.getCurrentUser();

  return `
    <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 2rem; font-style: italic; color: var(--text-main); margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.6rem;">
            <span style="color: var(--primary); display: flex; align-items: center;">${icons.hymnals(28)}</span>
            <span>Gestión de Himnarios</span>
          </h1>
          <p class="subtitle">
            Crea, organiza o importa colecciones numeradas de himnos con estructura sacra.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="fast-custom-builder-btn" class="btn btn-outline">
            ${icons.music(16)}
            <span>Constructor Rápido</span>
          </button>

          <button id="import-csv-hymnal-btn" class="btn btn-secondary">
            ${icons.hymnals(16)}
            <span>Importar CSV</span>
          </button>

          <button id="create-hymnal-btn" class="btn btn-primary">
            ${icons.plus(16)}
            <span>Nuevo Himnario</span>
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
        ${hymnals.map(h => renderHymnalCard(h, currentUser)).join('')}
      </div>
    </div>
  `;
}

export async function refreshHymnalsView() {
  const container = document.getElementById('main-content') || document.querySelector('main');
  if (container) {
    container.innerHTML = await renderHymnalsView();
    setupHymnalsEvents();
  }
}

function renderHymnalCard(hymnal, currentUser) {
  const statusBadges = {
    public: { label: 'Público', class: 'badge badge-success' },
    pending: { label: 'En Revisión', class: 'badge badge-gold' },
    rejected: { label: 'Rechazado', class: 'badge badge-danger' },
    private: { label: 'Privado', class: 'badge badge-outline' }
  };

  const status = statusBadges[hymnal.type] || statusBadges.private;
  const isOwner = currentUser && (hymnal.created_by === currentUser.id || currentUser.app_metadata?.role === 'admin');

  return `
    <div class="card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; position: relative;">
      <div>
        <h3 style="font-size: 1.05rem; color: var(--text-main); font-weight: 600; padding-right: 2.2rem; margin-bottom: 0.35rem;">${hymnal.name}</h3>
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
          <span class="${status.class}">${status.label}</span>
        </div>

        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem;">
          Idioma: ${hymnal.language ? hymnal.language.name : 'Español'}
        </div>
        ${hymnal.rejection_reason ? `
          <div style="margin-top: 0.5rem; font-size: 0.8rem; background: #FEE2E2; border: 1px solid #FCA5A5; color: #DC2626; padding: 0.5rem; border-radius: var(--radius-sm);">
            <strong>Razón de rechazo:</strong> ${hymnal.rejection_reason}
          </div>
        ` : ''}

        <!-- Options Button & Floating Menu (Positioned relative to card top-right) -->
        <div style="position: absolute; top: 1.1rem; right: 1.1rem; z-index: 10;">
          <button class="hymnal-options-btn btn btn-outline btn-sm" data-id="${hymnal.id}" data-name="${hymnal.name}" title="Opciones de Himnario" style="padding: 0.2rem 0.5rem;">
            ⋮
          </button>

          <!-- Floating Dropdown Menu -->
          <div id="hymnal-bubbles-${hymnal.id}" class="hymnal-bubbles-container" style="
            display: none; position: absolute; right: 0; top: calc(100% + 0.3rem); min-width: 200px;
            background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
            box-shadow: var(--shadow-card); z-index: 200; padding: 0.4rem;
            flex-direction: column; gap: 0.25rem;
          ">
            <button class="open-builder-for-hymnal-btn" data-id="${hymnal.id}" title="Editor Consecutivo" style="
              width: 100%; text-align: left; background: transparent; border: none; color: var(--primary);
              padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600;
            " onmouseover="this.style.background='var(--badge-bg)'" onmouseout="this.style.background='transparent'">
              ${icons.music(14)} Editor Consecutivo
            </button>

            <button class="duplicate-hymnal-btn" data-id="${hymnal.id}" data-name="${hymnal.name}" title="Duplicar como copia privada" style="
              width: 100%; text-align: left; background: transparent; border: none; color: var(--text-main);
              padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;
            " onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
              ${icons.hymnals(14)} Duplicar Himnario
            </button>

            <button class="smart-linker-btn" data-id="${hymnal.id}" title="Asistente de Enlace Inteligente" style="
              width: 100%; text-align: left; background: transparent; border: none; color: var(--text-main);
              padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;
            " onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'">
              ${icons.contexts(14)} Enlace Inteligente
            </button>

            ${hymnal.type === 'private' || hymnal.type === 'rejected' ? `
              <button class="submit-hymnal-btn" data-id="${hymnal.id}" style="
                width: 100%; text-align: left; background: transparent; border: none; color: var(--primary);
                padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; font-weight: 600;
              " onmouseover="this.style.background='var(--badge-bg)'" onmouseout="this.style.background='transparent'">
                ${icons.check(14)} Enviar a Revisión
              </button>
            ` : ''}

            ${isOwner ? `
              <div style="height: 1px; background: var(--border-color); margin: 0.2rem 0;"></div>
              <button class="hymnal-edit-bubble-btn" data-id="${hymnal.id}" data-name="${hymnal.name}" title="Editar Nombre" style="
                width: 100%; text-align: left; background: transparent; border: none; color: var(--status-success);
                padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;
              " onmouseover="this.style.background='rgba(21, 128, 61, 0.08)'" onmouseout="this.style.background='transparent'">
                ${icons.edit(14)} Editar Nombre
              </button>

              <button class="hymnal-delete-bubble-btn" data-id="${hymnal.id}" data-name="${hymnal.name}" title="Eliminar Himnario" style="
                width: 100%; text-align: left; background: transparent; border: none; color: var(--status-danger);
                padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;
              " onmouseover="this.style.background='rgba(220, 38, 38, 0.08)'" onmouseout="this.style.background='transparent'">
                ${icons.trash(14)} Eliminar Himnario
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; margin-top: 0.5rem;">
        <button class="btn btn-outline btn-sm view-hymnal-details-btn" data-id="${hymnal.id}" style="width: 100%;">
          ${icons.hymns(14)}
          <span>Ver Himnos</span>
        </button>
      </div>
    </div>
  `;
}

export function setupHymnalsEvents() {
  const createBtn = document.getElementById('create-hymnal-btn');
  const importCsvBtn = document.getElementById('import-csv-hymnal-btn');
  const fastBuilderBtn = document.getElementById('fast-custom-builder-btn');

  if (fastBuilderBtn) {
    fastBuilderBtn.addEventListener('click', () => {
      openCustomHymnalBuilderModal(null, async () => {
        await refreshHymnalsView();
      });
    });
  }

  document.querySelectorAll('.open-builder-for-hymnal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      document.querySelectorAll('.hymnal-bubbles-container').forEach(b => b.style.display = 'none');
      openCustomHymnalBuilderModal(id, async () => {
        await refreshHymnalsView();
      });
    });
  });

  // Hide floating action bubbles when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.hymnal-bubbles-container').forEach(b => b.style.display = 'none');
  });

  // Toggle action bubbles menu
  document.querySelectorAll('.hymnal-options-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const bubbles = document.getElementById(`hymnal-bubbles-${id}`);

      document.querySelectorAll('.hymnal-bubbles-container').forEach(b => {
        if (b !== bubbles) b.style.display = 'none';
      });

      if (bubbles) {
        bubbles.style.display = (bubbles.style.display === 'flex') ? 'none' : 'flex';
      }
    });
  });

  // Edit bubble click handler
  document.querySelectorAll('.hymnal-edit-bubble-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      document.querySelectorAll('.hymnal-bubbles-container').forEach(b => b.style.display = 'none');

      createModal('Editar Nombre del Himnario', `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nuevo Nombre *</label>
            <input type="text" id="edit-hymnal-name-input" value="${name}" required style="width: 100%;" />
          </div>
        </form>
      `, async () => {
        const newName = document.getElementById('edit-hymnal-name-input').value;
        if (newName && newName !== name) {
          await hymnalsService.updateHymnal(id, newName);
          showToast('Nombre del himnario actualizado.', 'success');
          await refreshHymnalsView();
        }
      });
    });
  });

  // Delete bubble click handler
  document.querySelectorAll('.hymnal-delete-bubble-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');
      document.querySelectorAll('.hymnal-bubbles-container').forEach(b => b.style.display = 'none');

      showConfirmModal({
        title: '¿Eliminar Himnario?',
        message: `¿Estás seguro de que deseas eliminar el himnario "${name}"? Esta acción desvinculará sus números de himnos asociados.`,
        confirmText: '🗑️ Sí, Eliminar',
        danger: true,
        onConfirm: async () => {
          await hymnalsService.deleteHymnal(id);
          showToast(`Himnario "${name}" eliminado con éxito.`, 'success');
          await refreshHymnalsView();
        }
      });
    });
  });

  // Duplicate hymnal click handler
  document.querySelectorAll('.duplicate-hymnal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const name = e.currentTarget.getAttribute('data-name');

      showConfirmModal({
        title: '¿Duplicar Himnario?',
        message: `¿Deseas duplicar "${name}"? Se creará una copia privada en tu cuenta con copias privadas de todos sus himnos para que puedas editarlos libremente.`,
        confirmText: '📋 Sí, Duplicar',
        onConfirm: async () => {
          showToast('Duplicando himnario e himnos...', 'info');
          try {
            await hymnalsService.duplicateHymnal(id);
            showToast('Himnario duplicado con éxito como copia privada.', 'success');
            await refreshHymnalsView();
          } catch (err) {
            showToast(`Error al duplicar: ${err.message}`, 'error');
          }
        }
      });
    });
  });

  // Smart Linker Assistant button event listener
  document.querySelectorAll('.smart-linker-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const hymnalId = e.currentTarget.getAttribute('data-id');
      openSmartLinkerModal(hymnalId);
    });
  });

  if (importCsvBtn) {
    importCsvBtn.addEventListener('click', async () => {
      const currentUser = await authService.getCurrentUser();
      const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

      createModal('Importar Himnario desde Archivo CSV', `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Himnario *</label>
            <input type="text" id="csv-hymnal-name" required placeholder="ej. Himnario Celebremos su Gloria" style="width: 100%;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem;">Seleccionar Archivo CSV *</label>
            <input type="file" id="csv-file-input" accept=".csv,text/csv" required style="display: none;" />
            <label for="csv-file-input" id="csv-file-label" style="
              display: flex; align-items: center; justify-content: center; gap: 0.75rem;
              padding: 1rem 1.25rem; background: rgba(0, 0, 0, 0.2); border: 2px dashed var(--border-color);
              border-radius: var(--radius-md); color: var(--text-main); font-size: 0.9rem; cursor: pointer;
              transition: var(--transition-fast); text-align: center;
            " onmouseover="this.style.borderColor='var(--primary)'; this.style.background='rgba(99, 102, 241, 0.05)';" onmouseout="this.style.borderColor='var(--border-color)'; this.style.background='rgba(0, 0, 0, 0.2)';">
              <span style="font-size: 1.4rem;">📁</span>
              <span id="csv-file-name-text" style="color: var(--text-muted);">Haz clic aquí para seleccionar tu archivo CSV</span>
            </label>
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); padding: 0.75rem; border-radius: var(--radius-sm);">
            <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-main); font-size: 0.82rem; cursor: pointer;">
              <input type="checkbox" id="csv-reuse-hymns-chk" checked />
              <span>🔗 Reutilizar y vincular himnos existentes por título (Evita duplicados)</span>
            </label>
          </div>

          ${isAdmin ? `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.8rem; border-radius: var(--radius-sm);">
              <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--status-success); font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="csv-is-public-chk" checked />
                <span>🛡️ Publicar directamente como Himnario Oficial / Público</span>
              </label>
            </div>
          ` : ''}

          <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 0.9rem; border-radius: var(--radius-md); font-size: 0.82rem; color: var(--text-muted); line-height: 1.5;">
            <strong style="color: var(--primary);">Estructura esperada del CSV:</strong><br/>
            <code>numero, titulo, primera_linea, coro, compositor, titulo_original</code><br/>
            <span style="color: var(--text-muted); font-size: 0.75rem;">(Las columnas <code>primera_linea</code>, <code>coro</code>, <code>compositor</code> y <code>titulo_original</code> son opcionales)</span><br/><br/>
            <strong>Ejemplo:</strong><br/>
            <code>1, Santo Santo Santo, Santo Santo Santo Señor Omnipotente, Santo Santo Santo Tu gloria llena el cielo, Reginald Heber, Holy Holy Holy</code><br/>
            <code>2, Sublime Gracia, Sublime gracia del Señor que a un pecador salvó, En la cruz en la cruz do primero vi la luz, John Newton, Amazing Grace</code>
          </div>

          <div>
            <button type="button" id="download-csv-template-btn" style="background: none; border: none; color: var(--accent); cursor: pointer; text-decoration: underline; font-size: 0.85rem; font-weight: 500;">
              📄 Descargar Plantilla CSV de Ejemplo
            </button>
          </div>
        </form>
      `, async () => {
        const name = document.getElementById('csv-hymnal-name').value;
        const fileInput = document.getElementById('csv-file-input');
        const isPublicChk = document.getElementById('csv-is-public-chk');
        const isPublic = isPublicChk ? isPublicChk.checked : false;
        const reuseChk = document.getElementById('csv-reuse-hymns-chk');
        const reuseExisting = reuseChk ? reuseChk.checked : true;

        if (!name || !fileInput.files || fileInput.files.length === 0) {
          showToast('Por favor completa el nombre e ingresa un archivo CSV válido.', 'warning');
          return;
        }

        const file = fileInput.files[0];
        const text = await file.text();

        try {
          const res = await hymnalsService.importHymnalFromCSV(name, text, 1, isPublic, reuseExisting);
          showToast(`¡Himnario "${res.hymnal.name}" creado con ${res.importedCount} himnos!`, 'success');
          await refreshHymnalsView();
        } catch (err) {
          showToast(`Error al importar CSV: ${err.message}`, 'error');
        }
      });

      setTimeout(() => {
        const fileInput = document.getElementById('csv-file-input');
        const fileNameText = document.getElementById('csv-file-name-text');
        if (fileInput && fileNameText) {
          fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
              fileNameText.innerText = `📄 Archivo seleccionado: ${e.target.files[0].name}`;
              fileNameText.style.color = 'var(--status-success)';
              fileNameText.style.fontWeight = '600';
            }
          });
        }

        const tmplBtn = document.getElementById('download-csv-template-btn');
        if (tmplBtn) {
          tmplBtn.addEventListener('click', () => {
            const templateText = "numero,titulo,primera_linea,coro,compositor,titulo_original\n1,Santo Santo Santo,Santo Santo Santo Señor Omnipotente,Santo Santo Santo Tu gloria llena el cielo,Reginald Heber,Holy Holy Holy\n2,Sublime Gracia,Sublime gracia del Señor que a un pecador salvó,En la cruz en la cruz do primero vi la luz,John Newton,Amazing Grace\n3,Castillo Fuerte,Castillo fuerte es nuestro Dios defensa y buen escudo,,Martín Lutero,Ein feste Burg";
            const blob = new Blob([templateText], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla_himnario.csv';
            a.click();
          });
        }
      }, 100);
    });
  }

  if (createBtn) {
    createBtn.addEventListener('click', () => {
      createModal('Crear Nuevo Himnario Manual', `
        <form id="create-hymnal-form" style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Himnario *</label>
            <input type="text" id="hymnal-name" required placeholder="ej. Himnario de Majestad" style="width: 100%;" />
          </div>
        </form>
      `, async () => {
        const name = document.getElementById('hymnal-name').value;
        await hymnalsService.createHymnal(name, 1);
        showToast('Himnario creado correctamente.', 'success');
        await refreshHymnalsView();
      });
    });
  }

  document.querySelectorAll('.submit-hymnal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      showConfirmModal({
        title: '¿Enviar Himnario a Revisión?',
        message: '¿Deseas enviar este himnario a revisión pública? El administrador verificará la numeración y coincidencia.',
        confirmText: '🚀 Enviar a Revisión',
        danger: false,
        onConfirm: async () => {
          await hymnalsService.submitHymnalForReview(id);
          showToast('Himnario enviado a revisión con éxito.', 'success');
          await refreshHymnalsView();
        }
      });
    });
  });

  document.querySelectorAll('.view-hymnal-details-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      await openHymnalDetailsModal(id);
    });
  });
}

async function openHymnalDetailsModal(id) {
  const details = await hymnalsService.getHymnalDetails(id);
  const allHymns = await hymnsService.getHymns();

  createModal(`Himnario: ${details.name}`, `
    <div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
        <h4>Lista de Himnos Numerados (${details.hymnal_hymn ? details.hymnal_hymn.length : 0})</h4>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="open-builder-from-details" data-id="${id}" style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.4); color: #c084fc; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.82rem; cursor: pointer; font-weight: 600;">
            ⚡ Editor Consecutivo
          </button>
          <button class="open-smart-linker-from-details" data-id="${id}" style="background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.4); color: var(--primary); padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.82rem; cursor: pointer; font-weight: 500;">
            🔗 Enlace Inteligente
          </button>
          <button id="add-hymn-to-hymnal-btn" style="background: var(--gradient-primary); border: none; color: white; padding: 0.35rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.82rem; cursor: pointer; font-weight: 500;">
            ➕ Asignar Himno
          </button>
        </div>
      </div>

      <div class="table-responsive" style="max-height: 50vh; overflow-y: auto;">
        ${details.hymnal_hymn && details.hymnal_hymn.length > 0 ? `
          <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; text-align: left;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted);">
                <th style="padding: 0.5rem;">#</th>
                <th style="padding: 0.5rem;">Título</th>
                <th style="padding: 0.5rem;">Compositor</th>
              </tr>
            </thead>
            <tbody>
              ${details.hymnal_hymn.sort((a,b) => a.number - b.number).map(item => `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <td style="padding: 0.5rem; font-weight: 600; color: var(--primary);">${item.number}</td>
                  <td style="padding: 0.5rem; font-weight: 500;">${item.hymn ? item.hymn.title_es : 'Desconocido'}</td>
                  <td style="padding: 0.5rem; color: var(--text-muted);">${item.hymn && item.hymn.composer ? item.hymn.composer : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `<p style="color: var(--text-muted); font-size: 0.85rem;">Aún no se han asignado himnos numerados a este himnario.</p>`}
      </div>
    </div>
  `);

  setTimeout(() => {
    const builderFromDetailsBtn = document.querySelector('.open-builder-from-details');
    if (builderFromDetailsBtn) {
      builderFromDetailsBtn.addEventListener('click', () => {
        document.getElementById('modal-close-btn')?.click();
        openCustomHymnalBuilderModal(id, async () => {
          await refreshHymnalsView();
          setTimeout(() => openHymnalDetailsModal(id), 200);
        });
      });
    }

    const linkerBtn = document.querySelector('.open-smart-linker-from-details');
    if (linkerBtn) {
      linkerBtn.addEventListener('click', () => {
        document.getElementById('modal-close-btn')?.click();
        openSmartLinkerModal(id);
      });
    }

    const addHymnBtn = document.getElementById('add-hymn-to-hymnal-btn');
    if (addHymnBtn) {
      addHymnBtn.addEventListener('click', () => {
        createModal('Asignar Himno a Himnario', `
          <form style="display: flex; flex-direction: column; gap: 1rem;">
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Número en el Himnario *</label>
              <input type="number" id="hymn-number-input" required min="1" style="width: 100%;" />
            </div>
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Himno *</label>
              <select id="hymn-select-input" style="width: 100%;">
                ${allHymns.map(h => `<option value="${h.id}">${h.title_es}</option>`).join('')}
              </select>
            </div>
          </form>
        `, async () => {
          const num = document.getElementById('hymn-number-input').value;
          const hymnId = document.getElementById('hymn-select-input').value;
          await hymnalsService.addHymnToHymnal(id, hymnId, num);
          showToast('Himno asignado correctamente.', 'success');
          // Re-open details modal dynamically & refresh view background!
          document.getElementById('modal-close-btn')?.click();
          await refreshHymnalsView();
          setTimeout(() => openHymnalDetailsModal(id), 200);
        });
      });
    }
  }, 100);
}

export async function openSmartLinkerModal(hymnalId) {
  showToast('Analizando coincidencias...', 'info');
  const { hymnal, suggestions } = await hymnalsService.getHymnalLinkSuggestions(hymnalId);

  // Filter out songs that are already public OR have 0 candidates!
  const queue = suggestions.filter(s => !s.isAlreadyPublic && s.candidates && s.candidates.length > 0);
  const initialTotal = queue.length;

  if (queue.length === 0) {
    createModal(`Asistente de Enlace: ${hymnal.name}`, `
      <div style="text-align: center; padding: 2rem 1rem;">
        <div style="color: var(--status-success); display: flex; justify-content: center; margin-bottom: 0.75rem;">
          ${icons.check(36)}
        </div>
        <h3 style="color: var(--text-main); margin-bottom: 0.5rem; font-weight: 600;">¡Sin coincidencias pendientes!</h3>
        <p class="subtitle" style="max-width: 400px; margin: 0 auto 1.5rem auto;">
          Todos los himnos de "${hymnal.name}" ya están vinculados o son piezas independientes únicas.
        </p>
      </div>
    `);
    return;
  }

  let currentIndex = 0;

  function renderCarouselCard() {
    const item = queue[currentIndex];
    const processedCount = initialTotal - queue.length;
    const currentCaseNum = Math.min(processedCount + currentIndex + 1, initialTotal);
    const progressPercent = Math.round((processedCount / initialTotal) * 100);

    const container = document.getElementById('smart-linker-carousel-container');
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Header & Progress -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge badge-gold">
            Caso ${currentCaseNum} de ${initialTotal}
          </span>
          <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500;">
            Progreso: ${progressPercent}% (${processedCount}/${initialTotal})
          </span>
        </div>

        <!-- Progress Bar -->
        <div style="width: 100%; height: 6px; background: #E8E2D9; border-radius: 3px; overflow: hidden;">
          <div style="width: ${progressPercent}%; height: 100%; background: var(--primary); transition: width 0.3s ease;"></div>
        </div>

        <!-- Main Card with Navigation Arrows -->
        <div class="card" style="display: flex; flex-direction: column; gap: 1rem;">
          <!-- Navigation Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            <div>
              <span style="font-size: 1.15rem; font-weight: 700; color: var(--primary);">#${item.number}</span>
              <span style="font-size: 1.05rem; font-weight: 600; color: var(--text-main); margin-left: 0.4rem;">${item.localHymn.title_es}</span>
              ${item.localHymn.composer ? `<span style="color: var(--text-muted); font-size: 0.85rem;"> — ${item.localHymn.composer}</span>` : ''}
            </div>

            <!-- Gallery Controls -->
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <button id="carousel-skip-btn" class="btn btn-outline btn-sm" title="Ignorar esta sugerencia por ahora">
                ${icons.close(14)}
                <span>Ignorar</span>
              </button>

              <button id="carousel-prev-btn" class="btn btn-outline btn-sm" ${currentIndex === 0 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                &lt;
              </button>

              <button id="carousel-next-btn" class="btn btn-outline btn-sm" ${currentIndex === queue.length - 1 ? 'disabled style="opacity: 0.4; cursor: not-allowed;"' : ''}>
                &gt;
              </button>
            </div>
          </div>

          ${item.localHymn.first_line ? `
            <div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; background: var(--bg-dark); padding: 0.55rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              1ª Estrofa: "${item.localHymn.first_line}"
            </div>
          ` : ''}

          <!-- Suggestions section -->
          <div>
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.6rem; letter-spacing: 0.05em;">
              Coincidencias Sugeridas en Catálogo Público Global:
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              ${item.candidates.map(candidate => {
                const cHymn = candidate.publicHymn || candidate.hymn || {};
                const linkedHymnalsText = cHymn.hymnal_hymn && cHymn.hymnal_hymn.length > 0
                  ? cHymn.hymnal_hymn.map(hh => `${hh.hymnal ? hh.hymnal.name : 'Himnario'} (<strong>#${hh.number}</strong>)`).join(', ')
                  : null;

                return `
                  <div class="candidate-card-item" style="
                    background: var(--bg-dark); border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm); padding: 0.75rem 0.85rem;
                    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;
                  ">
                    <div style="flex: 1; min-width: 200px;">
                      <div style="font-weight: 600; color: var(--text-main); font-size: 0.95rem;">
                        ${cHymn.title_es || 'Sin Título'}
                      </div>
                      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem;">
                        Compositor: ${cHymn.composer || 'Desconocido'} ${cHymn.first_line ? `| "${cHymn.first_line}"` : ''}
                      </div>
                      ${linkedHymnalsText ? `
                        <div style="font-size: 0.78rem; color: var(--primary); margin-top: 0.25rem; display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap;">
                          ${icons.hymnals(13)}
                          <span>Vinculado en: ${linkedHymnalsText}</span>
                        </div>
                      ` : ''}
                    </div>

                    <div class="candidate-actions-row" style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                      <span class="${candidate.score >= 80 ? 'badge badge-success' : 'badge badge-gold'}">
                        ${candidate.score}% Coincidencia
                      </span>

                      <button class="btn btn-primary btn-sm link-candidate-btn" data-local-id="${item.localHymn.id}" data-public-id="${cHymn.id}">
                        ${icons.contexts(14)}
                        <span>Vincular</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach Prev/Next & Skip events
    const prevBtn = document.getElementById('carousel-prev-btn');
    const nextBtn = document.getElementById('carousel-next-btn');
    const skipBtn = document.getElementById('carousel-skip-btn');

    if (skipBtn) {
      skipBtn.addEventListener('click', async () => {
        showToast('Caso omitido por ahora.', 'info');
        queue.splice(currentIndex, 1);
        if (queue.length === 0) {
          document.getElementById('modal-close-btn')?.click();
          showToast('🎉 ¡Se han revisado todos los casos!', 'success');
          await refreshHymnalsView();
        } else {
          if (currentIndex >= queue.length) currentIndex = queue.length - 1;
          renderCarouselCard();
        }
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
          currentIndex--;
          renderCarouselCard();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (currentIndex < queue.length - 1) {
          currentIndex++;
          renderCarouselCard();
        }
      });
    }

    // Attach Link Candidate events
    document.querySelectorAll('.link-candidate-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const localId = e.currentTarget.getAttribute('data-local-id');
        const publicId = e.currentTarget.getAttribute('data-public-id');

        try {
          await hymnalsService.linkHymnToPublic(hymnalId, localId, publicId);
          showToast('¡Himno vinculado exitosamente al catálogo público!', 'success');

          // Remove item from queue and re-render
          queue.splice(currentIndex, 1);

          if (queue.length === 0) {
            document.getElementById('modal-close-btn')?.click();
            showToast('🎉 ¡Todos los himnos han sido procesados!', 'success');
            await refreshHymnalsView();
          } else {
            if (currentIndex >= queue.length) currentIndex = queue.length - 1;
            renderCarouselCard();
          }
        } catch (err) {
          showToast(`Error al vincular: ${err.message}`, 'error');
        }
      });
    });
  }

  createModal(`🔗 Asistente de Enlace Inteligente: ${hymnal.name}`, `
    <div id="smart-linker-carousel-container"></div>
  `);

  setTimeout(() => renderCarouselCard(), 50);
}
