import { authService } from '../services/auth.service.js';
import { icons } from '../utils/icons.js';

export function renderNavbar(currentUser) {
  const userName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : 'Invitado';
  const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

  return `
    <header style="
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 1.75rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    ">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <a href="#/dashboard" style="text-decoration: none; display: flex; align-items: center; gap: 0.6rem;">
          <span style="color: var(--primary); display: flex; align-items: center;">
            ${icons.music(22)}
          </span>
          <span style="
            font-family: var(--font-heading);
            font-weight: 600;
            font-size: 1.2rem;
            color: var(--text-main);
          ">
            Hymn Manager
          </span>
        </a>
      </div>

      <div style="display: flex; align-items: center; gap: 1rem;">
        ${currentUser ? `
          <div style="
            display: flex;
            align-items: center;
            gap: 0.65rem;
            background: var(--bg-dark);
            padding: 0.35rem 0.75rem;
            border-radius: var(--radius-md);
            border: 1px solid var(--border-color);
          ">
            <div style="
              width: 30px;
              height: 30px;
              border-radius: 50%;
              background: var(--badge-bg);
              color: var(--primary);
              border: 1px solid rgba(30, 64, 175, 0.2);
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: var(--font-family);
              font-weight: 600;
              font-size: 0.85rem;
            ">
              ${userName.charAt(0).toUpperCase()}
            </div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 0.85rem; font-weight: 500; color: var(--text-main);">${userName}</span>
              ${isAdmin ? `<span style="font-size: 0.7rem; color: var(--primary); font-weight: 600;">Administrador</span>` : ''}
            </div>
          </div>
          <button id="logout-btn" class="btn btn-outline btn-sm">
            ${icons.logout(14)}
            <span>Cerrar Sesión</span>
          </button>
        ` : `
          <a href="#/login" class="btn btn-primary btn-sm">
            ${icons.user(15)}
            <span>Iniciar Sesión</span>
          </a>
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
