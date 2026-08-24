import { authService } from '../services/auth.service.js';

export function renderNavbar(currentUser) {
  const userName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : 'Invitado';
  const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

  return `
    <header style="
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      padding: 0.8rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      backdrop-filter: blur(10px);
    ">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <a href="#/dashboard" style="text-decoration: none; display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 1.5rem;">🎶</span>
          <span style="font-weight: 700; font-size: 1.2rem; background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Hymn Manager
          </span>
        </a>
      </div>

      <div style="display: flex; align-items: center; gap: 1rem;">
        ${currentUser ? `
          <div style="display: flex; align-items: center; gap: 0.75rem; background: rgba(255,255,255,0.05); padding: 0.4rem 0.8rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem;">
              ${userName.charAt(0).toUpperCase()}
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 0.85rem; font-weight: 500;">${userName}</span>
              ${isAdmin ? `<span style="font-size: 0.7rem; color: var(--status-warning);">Administrador</span>` : ''}
            </div>
          </div>
          <button id="logout-btn" style="
            background: transparent;
            border: 1px solid var(--border-color);
            color: var(--text-muted);
            padding: 0.4rem 0.8rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: var(--transition-fast);
          " onmouseover="this.style.color='#ef4444'; this.style.borderColor='#ef4444';" onmouseout="this.style.color='var(--text-muted)'; this.style.borderColor='var(--border-color)';">
            Cerrar Sesión
          </button>
        ` : `
          <a href="#/login" style="
            background: var(--gradient-primary);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: var(--radius-md);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.9rem;
          ">Iniciar Sesión</a>
        `}
      </div>
    </header>
  `;
}

export function setupNavbarEvents() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authService.signOut();
      window.location.hash = '#/login';
    });
  }
}
