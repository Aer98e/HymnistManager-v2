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
    <aside style="
      width: 240px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-color);
      padding: 1.5rem 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex-shrink: 0;
    ">
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
          <a href="#${item.path}" style="
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.65rem 0.85rem;
            border-radius: var(--radius-md);
            text-decoration: none;
            color: ${isActive ? 'var(--primary)' : 'var(--text-muted)'};
            background: ${isActive ? 'var(--badge-bg)' : 'transparent'};
            border: 1px solid ${isActive ? 'rgba(30, 64, 175, 0.2)' : 'transparent'};
            font-weight: ${isActive ? '600' : '400'};
            font-size: 0.875rem;
            transition: var(--transition-fast);
          ">
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
