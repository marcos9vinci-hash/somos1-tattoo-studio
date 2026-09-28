// Simple lightweight toast system without external dependencies
export const toast = {
  success: (msg: string) => showToast(msg, 'success'),
  error: (msg: string) => showToast(msg, 'error'),
  info: (msg: string) => showToast(msg, 'info')
};

function showToast(message: string, type: 'success' | 'error' | 'info') {
  if (typeof document === 'undefined') return;

  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '24px';
    container.style.right = '24px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toastEl = document.createElement('div');
  toastEl.style.padding = '12px 18px';
  toastEl.style.borderRadius = '12px';
  toastEl.style.fontSize = '13px';
  toastEl.style.fontWeight = '700';
  toastEl.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  toastEl.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
  toastEl.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
  toastEl.style.transform = 'translateY(10px) scale(0.95)';
  toastEl.style.opacity = '0';
  toastEl.style.pointerEvents = 'auto';
  toastEl.style.maxWidth = '360px';
  toastEl.style.display = 'flex';
  toastEl.style.alignItems = 'center';
  toastEl.style.gap = '8px';

  if (type === 'success') {
    toastEl.style.backgroundColor = '#10b981';
    toastEl.style.color = '#ffffff';
    toastEl.innerHTML = `<span>✓</span> <span>${message}</span>`;
  } else if (type === 'error') {
    toastEl.style.backgroundColor = '#ef4444';
    toastEl.style.color = '#ffffff';
    toastEl.innerHTML = `<span>✕</span> <span>${message}</span>`;
  } else {
    toastEl.style.backgroundColor = '#18181b';
    toastEl.style.color = '#ffffff';
    toastEl.style.border = '1px solid #3f3f46';
    toastEl.innerHTML = `<span>ℹ</span> <span>${message}</span>`;
  }

  container.appendChild(toastEl);

  requestAnimationFrame(() => {
    toastEl.style.transform = 'translateY(0) scale(1)';
    toastEl.style.opacity = '1';
  });

  setTimeout(() => {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateY(10px) scale(0.95)';
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 300);
  }, 3500);
}
