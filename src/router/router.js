export class HashRouter {
  constructor(routes, rootElementId = 'app') {
    this.routes = routes;
    this.rootElement = document.getElementById(rootElementId);
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  getCurrentRoute() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
  }

  navigate(path) {
    window.location.hash = path;
  }

  async handleRoute() {
    const path = this.getCurrentRoute();
    const routeHandler = this.routes[path] || this.routes['/404'] || this.routes['/'];
    if (routeHandler && this.rootElement) {
      this.rootElement.innerHTML = await routeHandler();
    }
  }
}
