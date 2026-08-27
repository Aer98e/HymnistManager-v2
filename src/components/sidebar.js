import { icons } from '../utils/icons.js';

export function renderSidebar(currentPath = '/dashboard', currentUser = null) {
  const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', iconKey: 'dashboard' },
    { path: '/hymns', label: 'Himnos', iconKey: 'hymns' },
    { path: '/hymnals', label: 'Himnarios', iconKey: 'hymnals' },
    { path: '/contexts', label: 'Contextos', iconKey: 'contexts' },
    { path: '/planner', label: 'Planificador', iconKey: 'planner' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Administración', iconKey: 'admin' });
  }

  return `
    <div id="sidebar-overlay" class="sidebar-overlay"></div>
    <aside id="app-sidebar" class="sidebar">
      <div style="
        font-family: var(--font-family);
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding-left: 0.75rem;
        margin-bottom: 0.6rem;
      ">
        Navegación
      </div>
      ${navItems.map(item => {
        const isActive = currentPath === item.path;
        const renderIcon = icons[item.iconKey] || icons.music;
        return `
          <a href="#${item.path}" class="nav-item-link ${isActive ? 'active' : ''}">
            <span style="display: flex; align-items: center; color: ${isActive ? 'var(--primary)' : 'var(--text-muted)'};">
              ${renderIcon(17)}
            </span>
            <span>${item.label}</span>
          </a>
        `;
      }).join('')}
    </aside>
  `;
}

export function setupSidebarEvents() {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  const closeMobileSidebar = () => {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
  };

  if (overlay) {
    overlay.addEventListener('click', closeMobileSidebar);
  }

  if (sidebar) {
    sidebar.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMobileSidebar);
    });
  }
}
