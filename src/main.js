import './assets/styles/main.css';
import { authService } from './services/auth.service.js';
import { renderNavbar, setupNavbarEvents } from './components/navbar.js';
import { renderSidebar } from './components/sidebar.js';
import { renderAuthView, setupAuthEvents } from './views/auth.view.js';
import { renderDashboard } from './views/dashboard.view.js';
import { renderHymnsView, setupHymnsEvents } from './views/hymns.view.js';
import { renderHymnalsView, setupHymnalsEvents } from './views/hymnals.view.js';
import { renderContextsView, setupContextsEvents } from './views/contexts.view.js';
import { renderPlannerView, setupPlannerEvents } from './views/planner.view.js';
import { renderAdminView, setupAdminEvents } from './views/admin.view.js';

class AppRouter {
  constructor() {
    this.root = document.getElementById('app');
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  getHash() {
    return window.location.hash.slice(1) || '/dashboard';
  }

  async handleRoute() {
    const path = this.getHash();
    const currentUser = await authService.getCurrentUser();

    // Unauthenticated user redirection
    if (!currentUser && path !== '/login' && path !== '/signup') {
      window.location.hash = '#/login';
      return;
    }

    // Auth Views
    if (path === '/login' || path === '/signup') {
      const isSignUp = path === '/signup';
      this.root.innerHTML = renderAuthView(isSignUp);
      setupAuthEvents(isSignUp);
      return;
    }

    // App Layout shell
    let contentHtml = '';
    let eventSetup = null;

    switch (path) {
      case '/dashboard':
        contentHtml = renderDashboard(currentUser);
        break;
      case '/hymns':
        contentHtml = await renderHymnsView();
        eventSetup = setupHymnsEvents;
        break;
      case '/hymnals':
        contentHtml = await renderHymnalsView();
        eventSetup = setupHymnalsEvents;
        break;
      case '/contexts':
        contentHtml = await renderContextsView();
        eventSetup = setupContextsEvents;
        break;
      case '/planner':
        contentHtml = await renderPlannerView();
        eventSetup = setupPlannerEvents;
        break;
      case '/admin':
        contentHtml = await renderAdminView();
        eventSetup = setupAdminEvents;
        break;
      default:
        contentHtml = renderDashboard(currentUser);
    }

    this.root.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column;">
        ${renderNavbar(currentUser)}
        <div style="display: flex; flex: 1;">
          ${renderSidebar(path, currentUser)}
          <main id="main-content" style="flex: 1; background: var(--bg-dark); min-width: 0;">
            ${contentHtml}
          </main>
        </div>
      </div>
    `;

    setupNavbarEvents();
    if (eventSetup) {
      await eventSetup();
    }
  }
}

new AppRouter();
