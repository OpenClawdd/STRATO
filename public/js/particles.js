/* ══════════════════════════════════════════════════════════
   STRATO v13 — NEXUS
   Refined Particle System — subtle, ambient, Chromebook-friendly
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let mouse = { x: -9999, y: -9999 };
  let animFrameId = null;

  const CONFIG = {
    count: 50,
    maxSpeed: 0.25,
    minRadius: 0.4,
    maxRadius: 1.6,
    connectionDist: 100,
    mouseRepelDist: 120,
    mouseRepelForce: 0.05,
    lineAlpha: 0.04,
    glowAlpha: 0.08,
  };

  // Muted color palette — no full rainbow, just accent tones
  const COLORS = [
    { r: 0, g: 229, b: 255 },    // cyan
    { r: 168, g: 85, b: 247 },    // purple
    { r: 59, g: 130, b: 246 },    // blue
    { r: 139, g: 92, b: 246 },    // violet
    { r: 99, g: 102, b: 241 },    // indigo
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
      alpha: Math.random() * 0.25 + 0.05,
      alphaDir: (Math.random() - 0.5) * 0.002,
      color,
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
      p.vx *= 0.997;
      p.vy *= 0.997;

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges (smoother than bouncing)
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;

      // Subtle alpha pulse
      p.alpha += p.alphaDir;
      if (p.alpha > 0.3) { p.alpha = 0.3; p.alphaDir = -Math.abs(p.alphaDir); }
      if (p.alpha < 0.03) { p.alpha = 0.03; p.alphaDir = Math.abs(p.alphaDir); }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Connection lines — use particle color, not rainbow hue
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.connectionDist) {
          const opacity = (1 - dist / CONFIG.connectionDist) * CONFIG.lineAlpha;
          const c = particles[i].color;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Particles
    for (const p of particles) {
      const { r, g, b } = p.color;

      // Soft glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 3.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha * CONFIG.glowAlpha})`;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
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

  // Resize handler with debounce
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
    }, 150);
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

  // Reduced motion preference — fully disable animation
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) {
    // Draw once, then stop
    init();
    draw();
  } else {
    // Start normally
    init();
    loop();
  }

  // Listen for runtime changes to reduced-motion preference
  motionQuery.addEventListener('change', (e) => {
    if (e.matches) {
      // User enabled reduced-motion — stop animation
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      // Draw one static frame
      draw();
    } else {
      // User disabled reduced-motion — resume animation
      if (!animFrameId) {
        loop();
      }
    }
  });
})();
