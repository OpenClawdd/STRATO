(function () {
  'use strict';
  window.STRATO_OPEN_HOME_RUNTIME_ACTIVE = true;

  async function boot() {
    const { initOpenHome } = await import('/js/v5/main.js');
    await initOpenHome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
