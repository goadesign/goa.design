// When a visitor copies an installer command, confirm success or select the command to copy manually.
(() => {
  let lastMessage = '';

  function announce(status, text) {
    let message = text || '';
    if (message && message === lastMessage) message += '\u00A0';
    lastMessage = message;
    status.textContent = message;
  }

  async function copyInstall(button, target) {
    if (!button || !target) return;
    const container = button.closest('.skill-install');
    const status = container ? container.querySelector('[role="status"]') : null;
    try {
      await navigator.clipboard.writeText(target.textContent);
      if (status) announce(status, button.dataset.copied);
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      if (status) announce(status, button.dataset.failed);
    }
  }

  if ('CommandEvent' in window) {
    document.addEventListener('command', (event) => {
      if (event.command === '--copy') copyInstall(event.source, event.target);
    }, true);
  } else {
    document.addEventListener('click', (event) => {
      if (event.defaultPrevented || !(event.target instanceof Element)) return;
      const button = event.target.closest('button[command="--copy"], [data-copy-target]');
      if (!button) return;
      const id = button.getAttribute('commandfor') || button.dataset.copyTarget;
      const target = id ? document.getElementById(id) : null;
      if (target) copyInstall(button, target);
    });
  }
})();
