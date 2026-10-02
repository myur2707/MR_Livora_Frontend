(() => {
  let stored = null;
  try {
    stored = window.localStorage.getItem('se-theme');
  } catch (error) {
    if (
      !(error instanceof DOMException) ||
      !['SecurityError', 'QuotaExceededError'].includes(error.name)
    )
      throw error;
  }
  const dark =
    stored === 'dark' ||
    (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
