export function renderSidebar(currentPath = '/dashboard', currentUser = null) {
  const isAdmin = currentUser && currentUser.app_metadata?.role === 'admin';

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/hymns', label: 'Himnos', icon: '🎵' },
    { path: '/hymnals', label: 'Himnarios', icon: '📖' },
    { path: '/contexts', label: 'Contextos', icon: '🎯' },
    { path: '/planner', label: 'Planificador', icon: '📅' },
  ];

  if (isAdmin) {
    navItems.push({ path: '/admin', label: 'Administración', icon: '🛡️' });
  }

  return `
    <aside style="
      width: 240px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-color);
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex-shrink: 0;
    ">
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; padding-left: 0.75rem; margin-bottom: 0.5rem;">
        Navegación
      </div>
      ${navItems.map(item => {
        const isActive = currentPath === item.path;
        return `
          <a href="#${item.path}" style="
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem 1rem;
            border-radius: var(--radius-md);
            text-decoration: none;
            color: ${isActive ? 'white' : 'var(--text-muted)'};
            background: ${isActive ? 'var(--gradient-primary)' : 'transparent'};
            font-weight: ${isActive ? '600' : '400'};
            transition: var(--transition-fast);
          ">
            <span style="font-size: 1.1rem;">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `;
      }).join('')}
    </aside>
  `;
}
