import { icons } from '../utils/icons.js';

export function renderDashboard(currentUser) {
  const userName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : 'Usuario';

  return `
    <div style="padding: 2.5rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <header class="card" style="margin-bottom: 2.5rem; border-left: 4px solid var(--primary);">
        <h1 style="font-size: 2.2rem; font-style: italic; color: var(--text-main); margin-bottom: 0.4rem;">
          Bienvenido, ${userName}
        </h1>
        <p class="subtitle" style="font-size: 0.95rem;">
          Plataforma de gestión sacra, repertorio litúrgico y planificación musical.
        </p>
      </header>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
        <a href="#/hymns" style="text-decoration: none; color: inherit;">
          <div class="card" style="height: 100%;" onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="color: var(--primary); margin-bottom: 1rem;">
              ${icons.hymns(32)}
            </div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text-main);">
              Biblioteca de Himnos
            </h3>
            <p class="subtitle">Explora el catálogo global y configura tonalidades y rangos de tu congregación.</p>
          </div>
        </a>

        <a href="#/hymnals" style="text-decoration: none; color: inherit;">
          <div class="card" style="height: 100%;" onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="color: var(--primary); margin-bottom: 1rem;">
              ${icons.hymnals(32)}
            </div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text-main);">
              Himnarios Numerados
            </h3>
            <p class="subtitle">Crea colecciones numeradas o envía tus himnarios a revisión pública.</p>
          </div>
        </a>

        <a href="#/contexts" style="text-decoration: none; color: inherit;">
          <div class="card" style="height: 100%;" onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="color: var(--primary); margin-bottom: 1rem;">
              ${icons.contexts(32)}
            </div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text-main);">
              Contextos & Aprendizaje
            </h3>
            <p class="subtitle">Monitorea automáticamente los himnos en periodo de práctica y enseñanza.</p>
          </div>
        </a>

        <a href="#/planner" style="text-decoration: none; color: inherit;">
          <div class="card" style="height: 100%;" onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="color: var(--primary); margin-bottom: 1rem;">
              ${icons.planner(32)}
            </div>
            <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; color: var(--text-main);">
              Planificador Litúrgico
            </h3>
            <p class="subtitle">Diseña el orden de servicio por fecha manteniendo equilibrio musical y temático.</p>
          </div>
        </a>
      </div>
    </div>
  `;
}
