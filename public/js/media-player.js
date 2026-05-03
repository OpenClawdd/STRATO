/* ══════════════════════════════════════════════════════════
   STRATO v21 — Media Player Module
   Floating mini-player with audio controls, lo-fi playlist,
   file upload, minimize/expand, progress bar, volume
   Works with existing HTML media player elements
   ══════════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── Built-in lo-fi beats playlist ──
  const LOFI_TRACKS = [
    { title: 'Lofi Chill Beat', artist: 'Chillhop', url: 'https://stream.zeno.fm/0r0xa792kwzuv' },
    { title: 'Study Beats', artist: 'Lofi Girl', url: 'https://stream.zeno.fm/4d6kbe0qen8uv' },
    { title: 'Chill Radio', artist: 'Lofi Records', url: 'https://stream.zeno.fm/hmm0y7y0a8quv' },
    { title: 'Dreamscape FM', artist: 'Sleepy Fish', url: 'https://stream.zeno.fm/yn65fsaurfhvv' },
  ];

  const state = {
    playing: false,
    minimized: false,
    currentTrack: 0,
    volume: parseFloat(localStorage.getItem('strato-media-volume') || '0.5'),
    playlist: [...LOFI_TRACKS],
    visible: false,
  };

  let audio = null;
  let playerEl = null;

  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  // ── Try to use the existing HTML audio element ──
  function initAudio() {
    const existingAudio = document.getElementById('media-audio');
    audio = existingAudio || new Audio();
    audio.volume = state.volume;
  }

  function togglePlay() {
    if (!audio) return;
    if (state.playing) {
      audio.pause();
      state.playing = false;
    } else {
      if (!audio.src && state.playlist.length > 0) {
        loadTrack(state.currentTrack);
      }
      audio.play().catch(() => {});
      state.playing = true;
    }
    updatePlayButton();
  }

  function updatePlayButton() {
    const playBtn = document.getElementById('btn-media-play') || document.getElementById('mp-play-btn');
    if (playBtn) {
      playBtn.textContent = state.playing ? '⏸' : '▶';
    }
  }

  function loadTrack(index) {
    if (!audio || !state.playlist[index]) return;
    state.currentTrack = index;
    const track = state.playlist[index];
    audio.src = track.url;
    audio.load();

    const titleEl = document.getElementById('media-title') || document.getElementById('mp-track-title');
    if (titleEl) titleEl.textContent = `${track.title} — ${track.artist}`;

    updatePlayButton();
  }

  function nextTrack() {
    state.currentTrack = (state.currentTrack + 1) % state.playlist.length;
    loadTrack(state.currentTrack);
    if (state.playing) audio.play().catch(() => {});
  }

  function prevTrack() {
    state.currentTrack = (state.currentTrack - 1 + state.playlist.length) % state.playlist.length;
    loadTrack(state.currentTrack);
    if (state.playing) audio.play().catch(() => {});
  }

  function updateProgress() {
    if (!audio || !audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    const seekEl = document.getElementById('media-seek');
    const timeEl = document.getElementById('media-time');
    if (seekEl) seekEl.value = pct;
    if (timeEl) timeEl.textContent = formatTime(audio.currentTime);
  }

  function addTrack(url, title, artist) {
    state.playlist.push({ title: title || 'Custom Track', artist: artist || 'User', url });
    loadTrack(state.playlist.length - 1);
    if (!state.playing) togglePlay();
    if (!state.visible) showPlayer();
  }

  function toggleMinimize() {
    state.minimized = !state.minimized;
    playerEl = document.getElementById('media-player');
    if (playerEl) playerEl.classList.toggle('minimized', state.minimized);
  }

  function hidePlayer() {
    if (audio) audio.pause();
    state.playing = false;
    state.visible = false;
    playerEl = document.getElementById('media-player');
    if (playerEl) playerEl.classList.add('hidden');
    updatePlayButton();
  }

  function showPlayer() {
    state.visible = true;
    state.minimized = false;
    playerEl = document.getElementById('media-player');
    if (playerEl) {
      playerEl.classList.remove('hidden');
      playerEl.classList.remove('minimized');
    }
  }

  function toggleVisibility() {
    if (state.visible) hidePlayer();
    else showPlayer();
  }

  // ── Setup event listeners for existing HTML media player controls ──
  function init() {
    initAudio();
    playerEl = document.getElementById('media-player');

    // Play/pause button
    const playBtn = document.getElementById('btn-media-play');
    if (playBtn) playBtn.addEventListener('click', togglePlay);

    // Prev/Next buttons
    const prevBtn = document.getElementById('btn-media-prev');
    const nextBtn = document.getElementById('btn-media-next');
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);

    // Minimize button
    const minimizeBtn = document.getElementById('btn-media-minimize');
    if (minimizeBtn) minimizeBtn.addEventListener('click', toggleMinimize);

    // Upload button
    const uploadBtn = document.getElementById('btn-media-upload');
    const fileInput = document.getElementById('media-file-input');
    if (uploadBtn && fileInput) {
      uploadBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        const name = file.name.replace(/\.[^/.]+$/, '');
        addTrack(url, name, 'Local File');
        e.target.value = '';
      });
    }

    // Seek slider
    const seekSlider = document.getElementById('media-seek');
    if (seekSlider) {
      seekSlider.addEventListener('input', () => {
        if (!audio || !audio.duration) return;
        audio.currentTime = (seekSlider.value / 100) * audio.duration;
      });
    }

    // Volume slider
    const volumeSlider = document.getElementById('media-volume');
    if (volumeSlider) {
      volumeSlider.value = Math.round(state.volume * 100);
      volumeSlider.addEventListener('input', () => {
        state.volume = volumeSlider.value / 100;
        if (audio) audio.volume = state.volume;
        localStorage.setItem('strato-media-volume', String(state.volume));
      });
    }

    // Topbar media button
    const topbarMediaBtn = document.getElementById('btn-media');
    if (topbarMediaBtn) {
      topbarMediaBtn.addEventListener('click', toggleVisibility);
    }

    // Audio events
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', nextTrack);
    audio.addEventListener('loadedmetadata', () => {
      const timeEl = document.getElementById('media-time');
      if (timeEl && audio.duration) timeEl.textContent = formatTime(audio.currentTime);
    });
    audio.addEventListener('play', () => { state.playing = true; updatePlayButton(); });
    audio.addEventListener('pause', () => { state.playing = false; updatePlayButton(); });

    // Start hidden
    if (playerEl) playerEl.classList.add('hidden');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.StratoMedia = {
    togglePlay,
    nextTrack,
    prevTrack,
    addTrack,
    showPlayer,
    hidePlayer,
    toggleVisibility,
    loadTrack,
    getState: () => ({ ...state }),
  };
})();
