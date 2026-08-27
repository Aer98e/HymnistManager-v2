import { authService } from '../services/auth.service.js';
import { icons } from '../utils/icons.js';

export function renderNavbar(currentUser) {
  const userName = currentUser ? (currentUser.user_metadata?.full_name || currentUser.email) : 'Invitado';
  const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

  return `
    <header class="app-navbar">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <button id="mobile-menu-btn" class="mobile-menu-toggle" aria-label="Abrir menú de navegación">
          ${icons.menu(22)}
        </button>

        <a href="#/dashboard" style="text-decoration: none; display: flex; align-items: center; gap: 0.6rem;">
          <span style="color: var(--primary); display: flex; align-items: center;">
            ${icons.music(22)}
          </span>
          <span class="brand-title">
            Hymn Manager
          </span>
        </a>
      </div>

      <div style="display: flex; align-items: center; gap: 0.75rem;">
        ${currentUser ? `
          <div class="user-badge-container">
            <div class="user-avatar">
              ${userName.charAt(0).toUpperCase()}
            </div>
            <div class="user-details">
              <span class="user-name-text">${userName}</span>
              ${isAdmin ? `<span style="font-size: 0.7rem; color: var(--primary); font-weight: 600;">Administrador</span>` : ''}
            </div>
          </div>
          <button id="logout-btn" class="btn btn-outline btn-sm">
            ${icons.logout(14)}
            <span class="btn-label">Cerrar Sesión</span>
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

  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      const sidebar = document.getElementById('app-sidebar');
      const overlay = document.getElementById('sidebar-overlay');
      if (sidebar) sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('open');
    });
  }
}
