import { authService } from '../services/auth.service.js';
import { icons } from '../utils/icons.js';

export function renderAuthView(isSignUp = false) {
  return `
    <div style="
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: radial-gradient(circle at top right, rgba(214, 175, 55, 0.08), transparent 50%),
                  radial-gradient(circle at bottom left, rgba(139, 30, 47, 0.12), transparent 50%);
    ">
      <div class="card" style="
        padding: 2.75rem 2.5rem;
        width: 100%;
        max-width: 430px;
        box-shadow: var(--shadow-card);
        border: 1px solid var(--border-color);
      ">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="color: var(--primary); display: flex; justify-content: center; margin-bottom: 0.75rem;">
            ${icons.music(40)}
          </div>
          <h2 style="font-family: var(--font-heading); font-style: italic; font-size: 1.85rem; color: var(--text-main);">
            ${isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p class="subtitle" style="margin-top: 0.35rem;">
            Hymn List Manager
          </p>
        </div>

        <form id="auth-form" style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${isSignUp ? `
            <div>
              <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem;">Nombre Completo</label>
              <input type="text" id="auth-name" required placeholder="Tu Nombre o Iglesia" style="width: 100%; padding: 0.75rem;" />
            </div>
          ` : ''}

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem;">Correo Electrónico</label>
            <input type="email" id="auth-email" required placeholder="correo@ejemplo.com" style="width: 100%; padding: 0.75rem;" />
          </div>

          <div>
            <label style="display: block; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.4rem;">Contraseña</label>
            <input type="password" id="auth-password" required placeholder="••••••••" style="width: 100%; padding: 0.75rem;" />
          </div>

          <div id="auth-error" style="color: var(--status-danger); font-size: 0.85rem; display: none; text-align: center;"></div>

          <button type="submit" id="auth-submit-btn" style="
            background: var(--gradient-primary);
            border: none;
            color: white;
            padding: 0.85rem;
            border-radius: var(--radius-md);
            font-weight: 600;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: var(--shadow-glow);
            transition: var(--transition-fast);
            margin-top: 0.5rem;
          ">
            ${isSignUp ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div style="text-align: center; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
          <a href="${isSignUp ? '#/login' : '#/signup'}" style="color: var(--primary); text-decoration: none; font-size: 0.9rem;">
            ${isSignUp ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate gratis'}
          </a>
        </div>
      </div>
    </div>
  `;
}

export function setupAuthEvents(isSignUp = false) {
  const form = document.getElementById('auth-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('auth-error');
    const submitBtn = document.getElementById('auth-submit-btn');
    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    submitBtn.innerText = 'Cargando...';

    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    try {
      if (isSignUp) {
        const name = document.getElementById('auth-name').value;
        await authService.signUp(email, password, name);
        alert('Cuenta creada exitosamente. Inicia sesión.');
        window.location.hash = '#/login';
      } else {
        await authService.signIn(email, password);
        window.location.hash = '#/dashboard';
      }
    } catch (err) {
      errorEl.innerText = err.message || 'Ocurrió un error al autenticar';
      errorEl.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = isSignUp ? 'Registrarse' : 'Entrar';
    }
  });
}
