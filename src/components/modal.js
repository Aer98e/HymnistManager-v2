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
    backdrop.querySelector('#modal-submit-btn').addEventListener('click', async () => {
      await onSave(backdrop);
      closeModal();
    });
  }

  return backdrop;
}
