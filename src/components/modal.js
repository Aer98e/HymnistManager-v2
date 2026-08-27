import { icons } from '../utils/icons.js';

export function createModal(title, contentHtml, onSave = null) {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(28, 25, 23, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  `;

  backdrop.innerHTML = `
    <div style="
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 540px;
      box-shadow: var(--shadow-card);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalFadeIn 0.25s ease-out;
    ">
      <div style="
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <h3 style="margin: 0; font-family: var(--font-family); font-size: 1.15rem; font-weight: 600; color: var(--text-main);">${title}</h3>
        <button id="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 1.4rem; cursor: pointer; line-height: 1;">&times;</button>
      </div>

      <div style="padding: 1.5rem; overflow-y: auto; max-height: 70vh;">
        ${contentHtml}
      </div>

      <div style="
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        background: var(--bg-dark);
      ">
        <button id="modal-cancel-btn" class="btn btn-outline">Cancelar</button>
        ${onSave ? `<button id="modal-save-btn" class="btn btn-primary">Guardar</button>` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeBtn = backdrop.querySelector('#modal-close-btn');
  const cancelBtn = backdrop.querySelector('#modal-cancel-btn');
  const saveBtn = backdrop.querySelector('#modal-save-btn');

  const closeModal = () => backdrop.remove();

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);

  if (saveBtn && onSave) {
    saveBtn.addEventListener('click', async () => {
      try {
        saveBtn.disabled = true;
        saveBtn.innerText = 'Guardando...';
        await onSave();
        closeModal();
      } catch (err) {
        showToast(`Error: ${err.message || err}`, 'error');
        saveBtn.disabled = false;
        saveBtn.innerText = 'Guardar';
      }
    });
  }
  return backdrop;
}

export function showConfirmModal(titleOrOptions, message, onConfirm, options = {}) {
  let title, msg, confirmFn, opts;
  if (typeof titleOrOptions === 'object' && titleOrOptions !== null) {
    title = titleOrOptions.title || '¿Estás seguro?';
    msg = titleOrOptions.message || '';
    confirmFn = titleOrOptions.onConfirm;
    opts = titleOrOptions;
  } else {
    title = titleOrOptions || '¿Estás seguro?';
    msg = message || '';
    confirmFn = onConfirm;
    opts = options || {};
  }

  const confirmText = opts.confirmText || 'Confirmar';
  const cancelText = opts.cancelText || 'Cancelar';
  const isDanger = opts.isDanger || opts.danger || false;

  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(28, 25, 23, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 1rem;
  `;

  backdrop.innerHTML = `
    <div style="
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 440px;
      box-shadow: var(--shadow-card);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      animation: modalFadeIn 0.2s ease-out;
    ">
      <div style="
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid var(--border-color);
      ">
        <h3 style="margin: 0; font-family: var(--font-family); font-size: 1.15rem; font-weight: 600; color: var(--text-main);">${title}</h3>
      </div>

      <div style="padding: 1.5rem; color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
        ${msg}
      </div>

      <div style="
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border-color);
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        background: var(--bg-dark);
      ">
        <button id="confirm-cancel-btn" class="btn btn-outline">${cancelText}</button>
        <button id="confirm-ok-btn" class="${isDanger ? 'btn btn-danger' : 'btn btn-primary'}">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const cancelBtn = backdrop.querySelector('#confirm-cancel-btn');
  const okBtn = backdrop.querySelector('#confirm-ok-btn');

  const closeModal = () => backdrop.remove();

  cancelBtn.addEventListener('click', closeModal);

  okBtn.addEventListener('click', async () => {
    try {
      okBtn.disabled = true;
      okBtn.innerText = 'Procesando...';
      if (confirmFn) await confirmFn();
      closeModal();
    } catch (err) {
      showToast(`Error: ${err.message || err}`, 'error');
      okBtn.disabled = false;
      okBtn.innerText = confirmText;
    }
  });
}

/**
 * Toast Notifications matching Warm Light Executive Theme
 */
export function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed; top: 1.25rem; right: 1.25rem; z-index: 3000;
      display: flex; flex-direction: column; gap: 0.5rem; max-width: 380px; width: 100%;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const borderLeftColor = type === 'error' ? 'var(--status-danger)' : (type === 'warning' ? 'var(--status-warning)' : 'var(--primary)');
  const iconMarkup = type === 'error' ? icons.close(16) : (type === 'warning' ? icons.filter(16) : icons.check(16));
  const iconColor = type === 'error' ? 'var(--status-danger)' : (type === 'warning' ? 'var(--status-warning)' : 'var(--primary)');

  toast.style.cssText = `
    background: #FFFFFF; color: var(--text-main); padding: 0.85rem 1.1rem; border-radius: var(--radius-md);
    font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.7rem;
    box-shadow: 0 10px 25px rgba(28, 25, 23, 0.12), 0 4px 10px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--border-color); border-left: 4px solid ${borderLeftColor};
    pointer-events: auto; animation: toastSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  toast.innerHTML = `<span style="color: ${iconColor}; display: flex; align-items: center;">${iconMarkup}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
