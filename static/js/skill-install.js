// When a visitor copies the installer, confirm success or keep the command available to select.
document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const command = document.getElementById(button.dataset.copyTarget);
    const status = button.closest('.skill-install').querySelector('[role="status"]');
    try {
      await navigator.clipboard.writeText(command.textContent);
      status.textContent = button.dataset.copied;
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(command);
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = button.dataset.failed;
    }
  });
});
