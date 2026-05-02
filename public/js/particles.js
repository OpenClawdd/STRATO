/* ══════════════════════════════════════════════════════════
   STRATO v12 — CHROMATIC STORM v2
   Rainbow Particle System with Mouse Repulsion
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let animFrameId = null;

  const CONFIG = {
    count: 80,
    maxSpeed: 0.4,
    minRadius: 0.5,
    maxRadius: 2.2,
    connectionDist: 120,
    mouseRepelDist: 150,
    mouseRepelForce: 0.08,
    lineAlpha: 0.07,
    glowAlpha: 0.15,
  };

  const COLORS = [
    { r: 0, g: 229, b: 255 },    // cyan
    { r: 168, g: 85, b: 247 },    // purple
    { r: 244, g: 114, b: 182 },   // pink
    { r: 34, g: 197, b: 94 },     // green
    { r: 251, g: 146, b: 60 },    // orange
    { r: 239, g: 68, b: 68 },     // red
    { r: 250, g: 204, b: 21 },    // yellow
  ];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticle() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * CONFIG.maxSpeed,
      vy: (Math.random() - 0.5) * CONFIG.maxSpeed,
      radius: Math.random() * (CONFIG.maxRadius - CONFIG.minRadius) + CONFIG.minRadius,
      alpha: Math.random() * 0.35 + 0.1,
      alphaDir: (Math.random() - 0.5) * 0.004,
      color,
      hue: Math.random() * 360,
      hueSpeed: Math.random() * 0.3 + 0.1,
    };
  }

  function init() {
    resize();
    particles = [];
    for (let i = 0; i < CONFIG.count; i++) {
      particles.push(createParticle());
    }
  }

  function update() {
    for (const p of particles) {
      // Mouse repulsion
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONFIG.mouseRepelDist && dist > 0) {
        const force = (CONFIG.mouseRepelDist - dist) / CONFIG.mouseRepelDist * CONFIG.mouseRepelForce;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Clamp speed
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > CONFIG.maxSpeed * 2) {
        p.vx = (p.vx / speed) * CONFIG.maxSpeed * 2;
        p.vy = (p.vy / speed) * CONFIG.maxSpeed * 2;
      }

      // Friction
      p.vx *= 0.998;
      p.vy *= 0.998;

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Bounce
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      p.x = Math.max(0, Math.min(canvas.width, p.x));
      p.y = Math.max(0, Math.min(canvas.height, p.y));

      // Alpha pulse
      p.alpha += p.alphaDir;
      if (p.alpha > 0.45) { p.alpha = 0.45; p.alphaDir = -Math.abs(p.alphaDir); }
      if (p.alpha < 0.05) { p.alpha = 0.05; p.alphaDir = Math.abs(p.alphaDir); }

      // Rainbow hue shift
      p.hue = (p.hue + p.hueSpeed) % 360;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.connectionDist) {
          const opacity = (1 - dist / CONFIG.connectionDist) * CONFIG.lineAlpha;
          const hue = (particles[i].hue + particles[j].hue) / 2;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${opacity})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // Particles
    for (const p of particles) {
      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 65%, ${p.alpha * CONFIG.glowAlpha})`;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 80%, 75%, ${p.alpha})`;
      ctx.fill();
    }
  }

  function loop() {
    update();
    draw();
    animFrameId = requestAnimationFrame(loop);
  }

  // Mouse tracking
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  document.addEventListener('mouseleave', () => {
    mouse.x = -9999;
    mouse.y = -9999;
  });

  // Resize handler
  window.addEventListener('resize', () => {
    resize();
  });

  // Visibility optimization — pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      animFrameId = null;
    } else {
      if (!animFrameId) loop();
    }
  });

  // Reduced motion preference
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) {
    CONFIG.count = 20;
    CONFIG.connectionDist = 60;
  }

  // Start
  init();
  loop();
})();
