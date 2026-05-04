(function () {
  'use strict';

  function call(name, ...args) {
    if (typeof window[name] === 'function') window[name](...args);
  }

  function backToStrato() {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({ type: 'strato-game-back' }, window.location.origin);
        return;
      } catch {}
    }
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }

  function wireAction(selector, handler) {
    document.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.stratoWired === 'true') return;
      el.dataset.stratoWired = 'true';
      el.addEventListener('click', handler);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    wireAction('[data-action="start-game"]', () => call('startGame'));
    wireAction('[data-action="new-game"]', () => call('newGame'));
    wireAction('[data-action="reset-game"]', () => call('resetGame'));
    wireAction('[data-action="init-game"]', () => call('init'));
    wireAction('[data-action="check-solution"]', () => call('checkSolution'));
    wireAction('[data-action="back-strato"]', backToStrato);

    document.querySelectorAll('[data-action="set-diff"]').forEach((el) => {
      if (el.dataset.stratoWired === 'true') return;
      el.dataset.stratoWired = 'true';
      el.addEventListener('click', () => call('setDiff', Number(el.dataset.size), Number(el.dataset.mines)));
    });

    document.querySelectorAll('[data-player-input]').forEach((el) => {
      if (el.dataset.stratoWired === 'true') return;
      el.dataset.stratoWired = 'true';
      el.addEventListener('click', () => call('playerInput', Number(el.dataset.playerInput)));
    });

    document.querySelectorAll('[data-click-tower]').forEach((el) => {
      if (el.dataset.stratoWired === 'true') return;
      el.dataset.stratoWired = 'true';
      el.addEventListener('click', () => call('clickTower', Number(el.dataset.clickTower)));
    });

    document.querySelectorAll('[data-dir-x][data-dir-y]').forEach((el) => {
      if (el.dataset.stratoWired === 'true') return;
      el.dataset.stratoWired = 'true';
      const setDirection = (event) => {
        event.preventDefault();
        call('setDir', Number(el.dataset.dirX), Number(el.dataset.dirY));
      };
      el.addEventListener('click', setDirection);
      el.addEventListener('touchstart', setDirection, { passive: false });
    });
  });
}());
