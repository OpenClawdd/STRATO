import { setGames } from './core/state.js';
import { state } from './core/state.js';
import { createHomeController } from './ui/home.js';
import { bindSettings } from './ui/settings.js';

function setActiveView(viewName) {
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  document.getElementById(`view-${viewName}`)?.classList.add('active');
  document.querySelectorAll('.nav-btn').forEach((button) => button.classList.toggle('active', button.dataset.view === viewName));
}

function bindNavigation(home) {
  document.querySelectorAll('[data-home-nav]').forEach((button) => {
    button.addEventListener('click', () => setActiveView(button.dataset.homeNav));
  });

  const search = document.getElementById('home-search');
  search?.addEventListener('input', (event) => {
    state.searchIndex = 0;
    home.search(event.target.value);
  });
  search?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      home.moveSearch(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      home.moveSearch(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      home.launchSelected();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.target.value = '';
      state.searchIndex = 0;
      home.search('');
    }
  });

  document.getElementById('surprise-me')?.addEventListener('click', () => home.surprise());
  document.getElementById('home-favorites-action')?.addEventListener('click', () => document.getElementById('home-favorites-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  document.getElementById('home-recent-action')?.addEventListener('click', () => document.getElementById('home-recent-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.getElementById('game-sheet-overlay')?.remove();
      document.getElementById('launch-failure-overlay')?.remove();
    }
  });
}

function bindLaunchBay() {
  const iframe = document.getElementById('proxy-iframe');
  const body = document.querySelector('.browser-body');
  const sync = () => body?.classList.toggle('has-launch', Boolean(iframe?.src && iframe.src !== window.location.href));
  iframe?.addEventListener('load', sync);
  sync();
}

export async function initOpenHome() {
  const response = await fetch('/assets/games.json', { cache: 'no-store' });
  setGames(await response.json());
  const home = createHomeController();
  bindSettings({ onUpdate: () => home.render() });
  bindNavigation(home);
  bindLaunchBay();
  home.render();
  window.STRATO_V4_HOME = home;
}
