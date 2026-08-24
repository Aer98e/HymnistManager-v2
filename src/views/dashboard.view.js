export function renderDashboard(currentUser) {
  const userName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : 'Usuario';

  return `
    <div style="padding: 2rem; max-width: 1200px; margin: 0 auto; width: 100%;">
      <header style="margin-bottom: 2.5rem; background: var(--bg-surface); padding: 2rem; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-card);">
        <h1 style="font-size: 2rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
          ¡Bienvenido, ${userName}! 👋
        </h1>
        <p style="color: var(--text-muted); margin-top: 0.5rem; font-size: 1rem;">
          Panel inteligente de gestión de himnos y planificación musical.
        </p>
      </header>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
        <a href="#/hymns" style="text-decoration: none; color: inherit;">
          <div style="
            background: var(--bg-surface); padding: 1.75rem; border-radius: var(--radius-md);
            border: 1px solid var(--border-color); box-shadow: var(--shadow-card); transition: var(--transition-normal);
          " onmouseover="this.style.borderColor='var(--primary)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎵</div>
            <h3 style="color: var(--text-main); font-size: 1.2rem; margin-bottom: 0.4rem;">Biblioteca de Himnos</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Explora el catálogo global y configura tonalidades y rangos de tu iglesia.</p>
          </div>
        </a>

        <a href="#/hymnals" style="text-decoration: none; color: inherit;">
          <div style="
            background: var(--bg-surface); padding: 1.75rem; border-radius: var(--radius-md);
            border: 1px solid var(--border-color); box-shadow: var(--shadow-card); transition: var(--transition-normal);
          " onmouseover="this.style.borderColor='var(--accent)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📖</div>
            <h3 style="color: var(--text-main); font-size: 1.2rem; margin-bottom: 0.4rem;">Himnarios Numerados</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Crea colecciones numeradas o envía tus himnarios a revisión pública.</p>
          </div>
        </a>

        <a href="#/contexts" style="text-decoration: none; color: inherit;">
          <div style="
            background: var(--bg-surface); padding: 1.75rem; border-radius: var(--radius-md);
            border: 1px solid var(--border-color); box-shadow: var(--shadow-card); transition: var(--transition-normal);
          " onmouseover="this.style.borderColor='var(--accent-cyan)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎯</div>
            <h3 style="color: var(--text-main); font-size: 1.2rem; margin-bottom: 0.4rem;">Contextos & Himnos Nuevos</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Monitorea automáticamente los himnos en periodo de aprendizaje.</p>
          </div>
        </a>

        <a href="#/planner" style="text-decoration: none; color: inherit;">
          <div style="
            background: var(--bg-surface); padding: 1.75rem; border-radius: var(--radius-md);
            border: 1px solid var(--border-color); box-shadow: var(--shadow-card); transition: var(--transition-normal);
          " onmouseover="this.style.borderColor='var(--status-success)';" onmouseout="this.style.borderColor='var(--border-color)';">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">📅</div>
            <h3 style="color: var(--text-main); font-size: 1.2rem; margin-bottom: 0.4rem;">Planificador de Programas</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem;">Diseña la orden de servicio por fecha manteniendo equilibrio musical.</p>
          </div>
        </a>
      </div>
    </div>
  `;
}
