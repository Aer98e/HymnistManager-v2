export function createModal(title, contentHtml, onSave = null) {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.8);
    backdrop-filter: blur(8px);
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
        <h3 style="margin: 0; font-size: 1.2rem; color: var(--text-main);">${title}</h3>
        <button id="modal-close-btn" style="background: none; border: none; color: var(--text-muted); font-size: 1.5rem; cursor: pointer;">&times;</button>
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
        background: rgba(0,0,0,0.1);
      ">
        <button id="modal-cancel-btn" style="
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          cursor: pointer;
        ">Cancelar</button>
        ${onSave ? `
          <button id="modal-submit-btn" style="
            background: var(--gradient-primary);
            border: none;
            color: white;
            padding: 0.5rem 1.25rem;
            border-radius: var(--radius-md);
            font-weight: 500;
            cursor: pointer;
          ">Guardar</button>
        ` : ''}
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();

  backdrop.querySelector('#modal-close-btn').addEventListener('click', closeModal);
  backdrop.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);

  if (onSave) {
    const submitBtn = backdrop.querySelector('#modal-submit-btn');
    const cancelBtn = backdrop.querySelector('#modal-cancel-btn');

    submitBtn.addEventListener('click', async () => {
      const originalText = submitBtn.innerText;
      submitBtn.disabled = true;
      cancelBtn.disabled = true;
      submitBtn.innerText = 'Guardando...';
      submitBtn.style.opacity = '0.7';
      submitBtn.style.cursor = 'not-allowed';

      try {
        await onSave(backdrop);
        closeModal();
      } catch (err) {
        submitBtn.disabled = false;
        cancelBtn.disabled = false;
        submitBtn.innerText = originalText;
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        showToast(`Error: ${err.message || err}`, 'error');
      }
    });
  }

  return backdrop;
}

/**
 * Elegant Confirmation Dialog replacing native confirm()
 */
export function showConfirmModal({ title = '¿Estás seguro?', message, confirmText = 'Confirmar', danger = false, onConfirm }) {
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    z-index: 2000; padding: 1rem;
  `;

  const btnBg = danger ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'var(--gradient-primary)';
  const icon = danger ? '⚠️' : '❓';

  backdrop.innerHTML = `
    <div style="
      background: var(--bg-surface); border: 1px solid var(--border-color);
      border-radius: var(--radius-lg); width: 100%; max-width: 440px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5); overflow: hidden;
      animation: modalFadeIn 0.2s ease-out; text-align: center; padding: 1.75rem 1.5rem;
    ">
      <div style="font-size: 2.5rem; margin-bottom: 0.75rem; line-height: 1;">${icon}</div>
      <h3 style="margin: 0 0 0.5rem 0; font-size: 1.25rem; color: var(--text-main); font-weight: 600;">${title}</h3>
      <p style="margin: 0 0 1.5rem 0; font-size: 0.9rem; color: var(--text-muted); line-height: 1.5;">${message}</p>
      
      <div style="display: flex; justify-content: center; gap: 0.75rem;">
        <button id="confirm-cancel-btn" style="
          background: rgba(255,255,255,0.05); border: 1px solid var(--border-color);
          color: var(--text-main); padding: 0.6rem 1.25rem; border-radius: var(--radius-md);
          font-weight: 500; cursor: pointer; font-size: 0.9rem;
        ">Cancelar</button>
        <button id="confirm-action-btn" style="
          background: ${btnBg}; border: none; color: white;
          padding: 0.6rem 1.25rem; border-radius: var(--radius-md);
          font-weight: 600; cursor: pointer; font-size: 0.9rem;
          box-shadow: ${danger ? '0 4px 14px rgba(239, 68, 68, 0.4)' : '0 4px 14px rgba(99, 102, 241, 0.4)'};
        ">${confirmText}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.querySelector('#confirm-cancel-btn').addEventListener('click', close);

  backdrop.querySelector('#confirm-action-btn').addEventListener('click', async () => {
    const actionBtn = backdrop.querySelector('#confirm-action-btn');
    const cancelBtn = backdrop.querySelector('#confirm-cancel-btn');
    actionBtn.disabled = true;
    cancelBtn.disabled = true;
    actionBtn.innerText = 'Procesando...';
    actionBtn.style.opacity = '0.7';

    try {
      await onConfirm();
      close();
    } catch (err) {
      actionBtn.disabled = false;
      cancelBtn.disabled = false;
      actionBtn.innerText = confirmText;
      actionBtn.style.opacity = '1';
      showToast(`Error: ${err.message || err}`, 'error');
    }
  });
}

/**
 * Toast Notifications replacing native alert()
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
  const bg = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : (type === 'warning' ? 'rgba(245, 158, 11, 0.9)' : 'rgba(16, 185, 129, 0.9)');
  const icon = type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : '✅');

  toast.style.cssText = `
    background: ${bg}; color: white; padding: 0.85rem 1.1rem; border-radius: var(--radius-md);
    font-size: 0.9rem; font-weight: 500; display: flex; align-items: center; gap: 0.6rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.3); backdrop-filter: blur(10px);
    pointer-events: auto; animation: toastSlideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
