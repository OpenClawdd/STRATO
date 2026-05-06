(function () {
  'use strict';
  window.STRATO_OPEN_HOME_RUNTIME_ACTIVE = true;

  async function boot() {
<<<<<<< ours
    const { initOpenHome } = await import('/js/v4/main.js');
=======
    const { initOpenHome } = await import('/js/v5/main.js');
>>>>>>> theirs
    await initOpenHome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}());
