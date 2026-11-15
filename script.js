(function() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  const totalFrames = typeof frameNames !== 'undefined' ? frameNames.length : 0;
  if (totalFrames === 0) return;

  const images = new Array(totalFrames);
  const loaded = new Array(totalFrames).fill(false);
  let loadedCount = 0;
  let lastRenderedIndex = -1;

  let currentProgress = 0;
  let targetProgress = 0;
  const ease = 0.1;

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    const targetIdx = Math.min(totalFrames - 1, Math.max(0, Math.round(currentProgress * (totalFrames - 1))));
    renderFrame(targetIdx);
  }

  function getBestImage(targetIndex) {
    if (loaded[targetIndex] && images[targetIndex]) {
      return images[targetIndex];
    }
    // Search outward for nearest loaded frame
    for (let offset = 1; offset < totalFrames; offset++) {
      const prev = targetIndex - offset;
      if (prev >= 0 && loaded[prev] && images[prev]) {
        return images[prev];
      }
      const next = targetIndex + offset;
      if (next < totalFrames && loaded[next] && images[next]) {
        return images[next];
      }
    }
    return null;
  }

  function renderFrame(index) {
    const img = getBestImage(index);
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (iw === 0 || ih === 0) return;

    // Seamless cover logic (object-fit: cover, object-position: center)
    // Ensures video animation completely covers viewport with zero black bars or visible edges
    const ratio = Math.max(cw / iw, ch / ih);
    const nw = iw * ratio;
    const nh = ih * ratio;
    const cx = (cw - nw) / 2;
    const cy = (ch - nh) / 2;

    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, iw, ih, cx, cy, nw, nh);
    lastRenderedIndex = index;
  }

  function getMaxScroll() {
    return Math.max(1, (document.documentElement.scrollHeight || document.body.scrollHeight) - window.innerHeight);
  }

  function getScrollTop() {
    return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  const navbarContainer = document.getElementById('navbar-container');
  const scrollProgressBar = document.getElementById('scroll-progress-bar');
  let lastScrollY = 0;

  function onScroll() {
    const maxScroll = getMaxScroll();
    const scrollTop = getScrollTop();
    targetProgress = Math.max(0, Math.min(1, scrollTop / maxScroll));

    // Update Glowing Red Top Scroll-Progress Bar
    if (scrollProgressBar) {
      scrollProgressBar.style.width = (targetProgress * 100).toFixed(1) + '%';
    }

    // Gentle Scroll Parallax Depth on floating decorative layers
    updateScrollParallax(scrollTop);

    // Smart Navbar: hide on scroll down, show on scroll up
    if (navbarContainer) {
      if (scrollTop > 80) {
        if (scrollTop > lastScrollY && scrollTop - lastScrollY > 4) {
          navbarContainer.classList.add('nav-hidden');
        } else if (lastScrollY - scrollTop > 4) {
          navbarContainer.classList.remove('nav-hidden');
        }
      } else {
        navbarContainer.classList.remove('nav-hidden');
      }
    }
    lastScrollY = scrollTop;

    updateActiveNavLink();
  }

  // Gentle Scroll Parallax on Ambient Glows and Selected Containers
  const glowTop = document.querySelector('.glow-top');
  const glowCenter = document.querySelector('.glow-center');
  const heroRightCard = document.querySelector('.satisfaction-card');

  function updateScrollParallax(scrollTop) {
    if (glowTop) {
      glowTop.style.transform = `translate3d(0, ${scrollTop * 0.12}px, 0)`;
    }
    if (glowCenter) {
      glowCenter.style.transform = `translate3d(0, ${scrollTop * -0.08}px, 0)`;
    }
    if (heroRightCard && scrollTop < 800) {
      heroRightCard.style.transform = `translate3d(0, ${scrollTop * -0.06}px, 0)`;
    }
  }

  // Active Nav Link Spy
  const sections = ['about', 'projects', 'services', 'testimonials', 'contact'];
  const navLinks = document.querySelectorAll('.nav-link');

  function updateActiveNavLink() {
    const scrollPos = getScrollTop() + 300;
    let current = 'about';

    for (let i = 0; i < sections.length; i++) {
      const el = document.getElementById(sections[i]);
      if (el && el.offsetTop <= scrollPos) {
        current = sections[i];
      }
    }

    navLinks.forEach(link => {
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  // Animation Loop
  function animate() {
    const diff = targetProgress - currentProgress;
    if (Math.abs(diff) > 0.0001) {
      currentProgress += diff * ease;
    } else {
      currentProgress = targetProgress;
    }

    const frameIndex = Math.min(totalFrames - 1, Math.max(0, Math.round(currentProgress * (totalFrames - 1))));

    if (frameIndex !== lastRenderedIndex) {
      renderFrame(frameIndex);
    }

    requestAnimationFrame(animate);
  }

  // Progressive Preloader
  function loadImage(i, callback) {
    if (images[i]) return;
    const img = new Image();
    img.src = frameNames[i];
    images[i] = img;
    img.onload = function() {
      loaded[i] = true;
      loadedCount++;
      if (callback) callback();
      const currentIdx = Math.round(currentProgress * (totalFrames - 1));
      if (currentIdx === i || lastRenderedIndex === -1) {
        renderFrame(i);
      }
    };
  }

  // Step 1: Preload frame 0 immediately
  loadImage(0, function() {
    renderFrame(0);
  });

  // Step 2: Preload keyframes evenly distributed across 0..236 (every 6th frame)
  const keyframeStep = 6;
  for (let i = keyframeStep; i < totalFrames; i += keyframeStep) {
    loadImage(i);
  }

  // Step 3: Preload intermediate frames in the background
  for (let i = 1; i < totalFrames; i++) {
    if (i % keyframeStep !== 0) {
      loadImage(i);
    }
  }

  // Event Listeners
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('scroll', onScroll, { passive: true });

  // Smooth anchor navigation
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        if (navbarContainer) navbarContainer.classList.remove('nav-hidden');
        targetEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Init
  const initialScrollTop = getScrollTop();
  const maxScroll = getMaxScroll();
  targetProgress = maxScroll > 0 ? Math.max(0, Math.min(1, initialScrollTop / maxScroll)) : 0;
  currentProgress = targetProgress;
  resizeCanvas();
  requestAnimationFrame(animate);

  /* ==========================================================================
     Ultra-Lightweight, High-FPS Cursor & Click Interaction Engine
     Engineered for 0% CPU at idle, zero GPU requirement, butter-smooth 120Hz
     ========================================================================== */
  const cursorRing = document.getElementById('cursor-ring');
  const fxCanvas = document.getElementById('cursor-canvas');
  const fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;

  if (cursorRing && fxCanvas && fxCtx) {
    function resizeFxCanvas() {
      // 1x resolution for maximum speed and zero memory waste
      fxCanvas.width = window.innerWidth;
      fxCanvas.height = window.innerHeight;
    }
    resizeFxCanvas();
    window.addEventListener('resize', resizeFxCanvas);

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isVisible = false;
    let prevMouseX = -100;
    let prevMouseY = -100;
    let isLoopRunning = false;

    const particles = [];
    const shockwaves = [];

    // Warm website-themed colors
    const emberColors = ['#ff5e36', '#ffaa40', '#ffffff'];
    const burstColors = ['#ffffff', '#ffbd59', '#ff5e36', '#ff3300'];

    function wakeLoop() {
      if (!isLoopRunning) {
        isLoopRunning = true;
        requestAnimationFrame(renderCursorFX);
      }
    }

    // Track mouse with low-overhead passive listener
    window.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        cursorRing.style.opacity = '1';
        ringX = mouseX;
        ringY = mouseY;
      }

      // Throttled light ember spawning: only 1 particle every 22px of travel
      const dist = Math.hypot(mouseX - prevMouseX, mouseY - prevMouseY);
      if (dist > 22 && particles.length < 10) {
        particles.push({
          x: mouseX,
          y: mouseY,
          prevX: mouseX,
          prevY: mouseY,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -Math.random() * 1.4 - 0.2, // upward heat float
          size: Math.random() * 2 + 1.2,
          color: emberColors[Math.floor(Math.random() * emberColors.length)],
          alpha: 0.9,
          decay: 0.045, // fast fade to keep memory light
          type: 'ember'
        });
        prevMouseX = mouseX;
        prevMouseY = mouseY;
      }

      wakeLoop();
    }, { passive: true });

    // Leave window
    document.addEventListener('mouseleave', function() {
      isVisible = false;
      cursorRing.style.opacity = '0';
    });

    // Hover Magnetism
    const interactiveSelectors = 'a, button, .btn, .nav-link, .project-card, .glass-card, .brand-item, .pill-tag';
    document.querySelectorAll(interactiveSelectors).forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorRing.classList.add('cursor-hover');
        wakeLoop();
      }, { passive: true });
      el.addEventListener('mouseleave', () => {
        cursorRing.classList.remove('cursor-hover');
        wakeLoop();
      }, { passive: true });
    });

    // Left Click Nova (Ultra-fast, zero-overhead)
    function triggerLeftClick(x, y) {
      cursorRing.classList.add('cursor-click-left');
      setTimeout(() => cursorRing.classList.remove('cursor-click-left'), 150);

      // Expanding Shockwave Ring
      shockwaves.push({
        x: x,
        y: y,
        radius: 6,
        maxRadius: 65,
        speed: 5.5,
        lineWidth: 2.5,
        color: 'rgba(255, 94, 54,',
        alpha: 1
      });

      // 14 snappy sparks
      for (let i = 0; i < 14; i++) {
        const angle = (Math.PI * 2 * i) / 14 + (Math.random() - 0.5) * 0.4;
        const speed = Math.random() * 7 + 3;
        particles.push({
          x: x,
          y: y,
          prevX: x,
          prevY: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 0.14,
          friction: 0.93,
          size: Math.random() * 2.5 + 1.2,
          color: burstColors[Math.floor(Math.random() * burstColors.length)],
          alpha: 1,
          decay: 0.035,
          type: 'spark'
        });
      }
      wakeLoop();
    }

    // Right Click Supernova (2 concentric rings + 20 sparks)
    function triggerRightClick(x, y) {
      cursorRing.classList.add('cursor-click-right');
      setTimeout(() => cursorRing.classList.remove('cursor-click-right'), 200);

      shockwaves.push({
        x: x,
        y: y,
        radius: 8,
        maxRadius: 90,
        speed: 6.5,
        lineWidth: 3,
        color: 'rgba(255, 170, 64,',
        alpha: 1
      });
      shockwaves.push({
        x: x,
        y: y,
        radius: 4,
        maxRadius: 70,
        speed: 4.5,
        lineWidth: 2,
        color: 'rgba(255, 255, 255,',
        alpha: 0.9
      });

      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        const speed = Math.random() * 9 + 4;
        particles.push({
          x: x,
          y: y,
          prevX: x,
          prevY: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 0.1,
          friction: 0.94,
          size: Math.random() * 3 + 1.5,
          color: burstColors[Math.floor(Math.random() * burstColors.length)],
          alpha: 1,
          decay: 0.03,
          type: 'spark'
        });
      }
      wakeLoop();
    }

    window.addEventListener('mousedown', function(e) {
      if (e.button === 0) {
        triggerLeftClick(e.clientX, e.clientY);
      } else if (e.button === 2) {
        triggerRightClick(e.clientX, e.clientY);
      }
    }, { passive: true });

    window.addEventListener('contextmenu', function(e) {
      triggerRightClick(e.clientX, e.clientY);
    }, { passive: true });

    // Ultra-Fast Render Loop (Zero CPU when idle)
    function renderCursorFX() {
      // Snappy 0.65 follow speed matches pointer velocity without lag
      const followSpeed = 0.65;
      ringX += (mouseX - ringX) * followSpeed;
      ringY += (mouseY - ringY) * followSpeed;

      // GPU hardware-accelerated transform
      cursorRing.style.transform = `translate3d(${Math.round(ringX)}px, ${Math.round(ringY)}px, 0) translate(-50%, -50%)`;

      // Clear overlay canvas
      fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      fxCtx.globalCompositeOperation = 'lighter';

      // 1. Render Shockwaves (Clean mathematical arcs, 0% blur overhead)
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        sw.alpha = Math.max(0, 1 - (sw.radius / sw.maxRadius));

        if (sw.alpha <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
          continue;
        }

        fxCtx.beginPath();
        fxCtx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        fxCtx.strokeStyle = sw.color + sw.alpha + ')';
        fxCtx.lineWidth = sw.lineWidth * sw.alpha;
        fxCtx.stroke();
      }

      // 2. Render Particles (Lightweight spark streaks & embers)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.prevX = p.x;
        p.prevY = p.y;
        p.x += p.vx;
        p.y += p.vy;

        if (p.friction) {
          p.vx *= p.friction;
          p.vy *= p.friction;
        }
        if (p.gravity) {
          p.vy += p.gravity;
        }

        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        fxCtx.globalAlpha = Math.max(0, p.alpha);

        if (p.type === 'spark') {
          fxCtx.strokeStyle = p.color;
          fxCtx.lineWidth = p.size;
          fxCtx.beginPath();
          fxCtx.moveTo(p.prevX, p.prevY);
          fxCtx.lineTo(p.x, p.y);
          fxCtx.stroke();
        } else {
          fxCtx.fillStyle = p.color;
          fxCtx.beginPath();
          fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          fxCtx.fill();
        }
      }

      // Idle Check: If no particles and ring has caught up to mouse, pause loop!
      const ringDist = Math.hypot(mouseX - ringX, mouseY - ringY);
      if (particles.length === 0 && shockwaves.length === 0 && ringDist < 0.5) {
        ringX = mouseX;
        ringY = mouseY;
        fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        isLoopRunning = false;
        return; // Pause loop to drop CPU usage to 0%
      }

      requestAnimationFrame(renderCursorFX);
    }
  }

  // ==========================================================================
  // Cinematic Scroll-Triggered Fade & Rise Reveal (IntersectionObserver)
  // ==========================================================================
  function initScrollReveals() {
    const revealTargets = document.querySelectorAll(
      '.about-grid, .brands-row, .projects-header, .project-card, .quote-container, .testimonials-header, .testimonial-card, .contact-container'
    );

    revealTargets.forEach((el, idx) => {
      el.classList.add('reveal-on-scroll');
      // Subtle natural stagger for grid items
      if (el.classList.contains('project-card') || el.classList.contains('testimonial-card')) {
        const staggerIdx = (idx % 3) + 1;
        el.classList.add('reveal-delay-' + staggerIdx);
      }
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
          } else {
            // Reset when element leaves viewport so animation re-triggers on every scroll
            entry.target.classList.remove('is-revealed');
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -20px 0px'
      });

      revealTargets.forEach(el => observer.observe(el));
    } else {
      // Fallback
      revealTargets.forEach(el => el.classList.add('is-revealed'));
    }
  }

  // ==========================================================================
  // High-End Smooth Anchor Scrolling
  // ==========================================================================
  function initSmoothAnchorScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');
        if (!targetId || targetId === '#') return;

        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          const targetPos = targetEl.getBoundingClientRect().top + window.pageYOffset - 40;
          window.scrollTo({
            top: Math.max(0, targetPos),
            behavior: 'smooth'
          });
        }
      });
    });
  }

  // ==========================================================================
  // Soft 3D Card Tilt with Cursor-Following Red Glow
  // ==========================================================================
  function init3DCardTilt() {
    // Apply to main interactive cards on desktop devices
    if (window.matchMedia('(pointer: coarse)').matches) return; // Skip touch/mobile for battery & smoothness

    const tiltCards = document.querySelectorAll(
      '.satisfaction-card, .project-card .mockup-frame, .testimonial-card, .contact-card-item, .contact-form-card'
    );

    tiltCards.forEach(card => {
      card.classList.add('tilt-card');

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Set cursor position percentage for radial gradient glow
        card.style.setProperty('--mouse-x', `${(x / rect.width) * 100}%`);
        card.style.setProperty('--mouse-y', `${(y / rect.height) * 100}%`);

        // Subtle 3D tilt angles (max ±5 degrees)
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -4.5;
        const rotateY = ((x - centerX) / centerX) * 4.5;

        card.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-4px)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initScrollReveals();
      initSmoothAnchorScroll();
      init3DCardTilt();
    });
  } else {
    initScrollReveals();
    initSmoothAnchorScroll();
    init3DCardTilt();
  }
})();
