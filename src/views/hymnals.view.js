import { hymnalsService } from '../services/hymnals.service.js';
import { hymnsService } from '../services/hymns.service.js';
import { createModal } from '../components/modal.js';

export async function renderHymnalsView() {
  const hymnals = await hymnalsService.getHymnals();

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h1 style="font-size: 1.8rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            📖 Gestión de Himnarios
          </h1>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            Crea o importa colecciones numeradas de himnos desde archivos CSV
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          <button id="import-csv-hymnal-btn" style="
            background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main);
            padding: 0.65rem 1rem; border-radius: var(--radius-md); font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          ">
            <span>📥</span> Importar desde CSV
          </button>

          <button id="create-hymnal-btn" style="
            background: var(--gradient-primary); border: none; color: white; padding: 0.65rem 1.2rem;
            border-radius: var(--radius-md); font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;
          ">
            <span>➕</span> Nuevo Himnario
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
        ${hymnals.map(h => renderHymnalCard(h)).join('')}
      </div>
    </div>
  `;
}

function renderHymnalCard(hymnal) {
  const statusColors = {
    public: { label: 'Público', bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--status-success)' },
    pending: { label: 'En Revisión', bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--status-warning)' },
    rejected: { label: 'Rechazado', bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--status-danger)' },
    private: { label: 'Privado', bg: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent)' }
  };

  const status = statusColors[hymnal.type] || statusColors.private;

  return `
    <div style="
      background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);
      padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; gap: 1rem;
    ">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem;">
          <h3 style="font-size: 1.1rem; color: var(--text-main); font-weight: 600;">${hymnal.name}</h3>
          <span style="font-size: 0.7rem; padding: 0.2rem 0.5rem; border-radius: 20px; font-weight: 600; background: ${status.bg}; color: ${status.color};">
            ${status.label}
          </span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.4rem;">
          Idioma: ${hymnal.language ? hymnal.language.name : 'Español'}
        </div>
        ${hymnal.rejection_reason ? `
          <div style="margin-top: 0.5rem; font-size: 0.8rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-danger); padding: 0.5rem; border-radius: var(--radius-sm);">
            <strong>Razón de rechazo:</strong> ${hymnal.rejection_reason}
          </div>
        ` : ''}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.75rem;">
        <button class="view-hymnal-details-btn" data-id="${hymnal.id}" style="
          background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: var(--text-main);
          padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer;
        ">
          👁️ Ver Himnos
        </button>

        ${hymnal.type === 'private' || hymnal.type === 'rejected' ? `
          <button class="submit-hymnal-btn" data-id="${hymnal.id}" style="
            background: var(--gradient-primary); border: none; color: white;
            padding: 0.4rem 0.8rem; border-radius: var(--radius-sm); font-size: 0.85rem; cursor: pointer; font-weight: 500;
          ">
            🚀 Enviar a Revisión
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

export function setupHymnalsEvents() {
  const createBtn = document.getElementById('create-hymnal-btn');
  const importCsvBtn = document.getElementById('import-csv-hymnal-btn');

  if (importCsvBtn) {
    importCsvBtn.addEventListener('click', async () => {
      const currentUser = await authService.getCurrentUser();
      const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

      createModal('Importar Himnario desde Archivo CSV', `
        <form style="display: flex; flex-direction: column; gap: 1rem;">
          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Nombre del Himnario *</label>
            <input type="text" id="csv-hymnal-name" required placeholder="ej. Himnario Celebremos su Gloria" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Archivo CSV *</label>
            <input type="file" id="csv-file-input" accept=".csv,text/csv" required style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>

          ${isAdmin ? `
            <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); padding: 0.8rem; border-radius: var(--radius-sm);">
              <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--status-success); font-size: 0.85rem; font-weight: 600; cursor: pointer;">
                <input type="checkbox" id="csv-is-public-chk" checked />
                <span>🛡️ Publicar directamente como Himnario Oficial / Público</span>
              </label>
            </div>
          ` : ''}

          <div style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); padding: 0.8rem; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--text-muted);">
            <strong style="color: var(--primary);">Estructura esperada del CSV:</strong><br/>
            <code>numero, titulo, compositor, titulo_original</code><br/>
            Ejemplo:<br/>
            <code>1, Santo Santo Santo, Reginald Heber, Holy Holy Holy</code><br/>
            <code>2, Sublime Gracia, John Newton, Amazing Grace</code>
          </div>

          <div>
            <button type="button" id="download-csv-template-btn" style="background: none; border: none; color: var(--accent); cursor: pointer; text-decoration: underline; font-size: 0.85rem;">
              📄 Descargar Plantilla CSV de Ejemplo
            </button>
          </div>
        </form>
      `, async () => {
        const name = document.getElementById('csv-hymnal-name').value;
        const fileInput = document.getElementById('csv-file-input');
        const isPublicChk = document.getElementById('csv-is-public-chk');
        const isPublic = isPublicChk ? isPublicChk.checked : false;

        if (!name || !fileInput.files || fileInput.files.length === 0) {
          alert('Por favor completa el nombre e ingresa un archivo CSV válido.');
          return;
        }

        const file = fileInput.files[0];
        const text = await file.text();

        try {
          const res = await hymnalsService.importHymnalFromCSV(name, text, 1, isPublic);
          alert(`¡Himnario "${res.hymnal.name}" creado con éxito como ${isPublic ? 'PÚBLICO' : 'PRIVADO'}! Se procesaron ${res.importedCount} himnos.`);
          window.location.reload();
        } catch (err) {
          alert(`Error al importar CSV: ${err.message}`);
        }
      });


      setTimeout(() => {
        const tmplBtn = document.getElementById('download-csv-template-btn');
        if (tmplBtn) {
          tmplBtn.addEventListener('click', () => {
            const templateText = "numero,titulo,compositor,titulo_original\n1,Santo Santo Santo,Reginald Heber,Holy Holy Holy\n2,Sublime Gracia,John Newton,Amazing Grace\n3,Castillo Fuerte,Martín Lutero,Ein feste Burg";
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
            <input type="text" id="hymnal-name" required placeholder="ej. Himnario de Majestad" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
          </div>
        </form>
      `, async () => {
        const name = document.getElementById('hymnal-name').value;
        await hymnalsService.createHymnal(name, 1);
        window.location.reload();
      });
    });
  }

  document.querySelectorAll('.submit-hymnal-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      if (confirm('¿Deseas enviar este himnario a revisión pública? El administrador verificará la numeración.')) {
        await hymnalsService.submitHymnalForReview(id);
        alert('Himnario enviado a revisión con éxito.');
        window.location.reload();
      }
    });
  });

  document.querySelectorAll('.view-hymnal-details-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const details = await hymnalsService.getHymnalDetails(id);
      const allHymns = await hymnsService.getHymns();

      createModal(`Himnario: ${details.name}`, `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4>Lista de Himnos Numerados</h4>
            <button id="add-hymn-to-hymnal-btn" style="background: var(--gradient-primary); border: none; color: white; padding: 0.3rem 0.7rem; border-radius: var(--radius-sm); font-size: 0.8rem; cursor: pointer;">+ Asignar Número</button>
          </div>
          <div style="max-height: 250px; overflow-y: auto;">
            ${details.hymnal_hymn && details.hymnal_hymn.length > 0 ? `
              <table style="width: 100%; text-align: left; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); font-size: 0.85rem;">
                    <th style="padding: 0.5rem;">#</th>
                    <th style="padding: 0.5rem;">Título</th>
                  </tr>
                </thead>
                <tbody>
                  ${details.hymnal_hymn.map(item => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                      <td style="padding: 0.5rem; font-weight: 600; color: var(--primary);">${item.number}</td>
                      <td style="padding: 0.5rem;">${item.hymn ? item.hymn.title_es : 'Desconocido'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `<p style="color: var(--text-muted); font-size: 0.85rem;">Aún no se han asignado himnos numerados a este himnario.</p>`}
          </div>
        </div>
      `);

      setTimeout(() => {
        const addHymnBtn = document.getElementById('add-hymn-to-hymnal-btn');
        if (addHymnBtn) {
          addHymnBtn.addEventListener('click', () => {
            createModal('Asignar Himno a Himnario', `
              <form style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Número en el Himnario *</label>
                  <input type="number" id="hymn-number-input" required min="1" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;" />
                </div>
                <div>
                  <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.3rem;">Seleccionar Himno *</label>
                  <select id="hymn-select-input" style="width: 100%; padding: 0.6rem; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: white;">
                    ${allHymns.map(h => `<option value="${h.id}">${h.title_es}</option>`).join('')}
                  </select>
                </div>
              </form>
            `, async () => {
              const num = document.getElementById('hymn-number-input').value;
              const hymnId = document.getElementById('hymn-select-input').value;
              await hymnalsService.addHymnToHymnal(id, hymnId, num);
              alert('Himno asignado correctamente.');
            });
          });
        }
      }, 100);
    });
  });
}
