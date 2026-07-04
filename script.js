/* ================================================================
   WEDDING INVITATION — "ROSEATE DAWN"
   Александр & Екатерина · 15 августа 2027

   Архитектура файла (модульный подход, без глобального загрязнения):
   1.  Config & State
   2.  Utilities
   3.  Loader Module
   4.  Custom Cursor Module
   5.  Ambient Particles (Petals + Hearts) Module
   6.  Progress Bar Module
   7.  Navigation Module
   8.  Magnetic Buttons + Ripple Module
   9.  Hero Parallax + Text Reveal Module
   10. Scroll Reveal Module (IntersectionObserver)
   11. Timeline Progress Module
   12. Countdown Module
   13. Travel Map Draw Module
   14. Gallery + Lightbox Module
   15. Song Player Module
   16. Background Music Module
   17. Add To Calendar Module
   18. Copy Requisites Module
   19. FAQ Accordion Module
   20. RSVP Form Module
   21. Scroll Top Module
   22. Init
   ================================================================ */

(() => {
  'use strict';

  /* ==============================================================
     1. CONFIG & STATE
     ============================================================== */
  const CONFIG = {
    weddingDate: new Date('2027-08-15T16:00:00+06:00'),
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    isTouch: window.matchMedia('(hover: none), (pointer: coarse)').matches,
    petalCount: 14,
    heartCount: 8,
  };

  /* ==============================================================
     2. UTILITIES
     ============================================================== */
  const $ = (selector, ctx = document) => ctx.querySelector(selector);
  const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, t) => a + (b - a) * t;
  const randomBetween = (min, max) => Math.random() * (max - min) + min;

  /** Throttle via requestAnimationFrame — гарантирует не более 1 вызова за кадр (60fps) */
  function rafThrottle(fn) {
    let ticking = false;
    return (...args) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
    };
  }

  /** Форматирует число в строку с ведущим нулём */
  const pad = (num, len = 2) => String(Math.max(0, num)).padStart(len, '0');


  /* ==============================================================
     3. LOADER MODULE
     Заставка исчезает после отрисовки вензеля + минимальной паузы,
     чтобы анимация успела "подышать" перед погружением в контент.
     ============================================================== */
  const LoaderModule = {
    el: null,
    init() {
      this.el = $('#loader');
      if (!this.el) return;

      const minDuration = CONFIG.reducedMotion ? 300 : 2900;
      const hide = () => {
        this.el.classList.add('is-hidden');
        document.body.style.overflow = '';
        // Полностью убираем из DOM-потока после завершения transition
        setTimeout(() => { this.el.style.display = 'none'; }, 950);
      };

      document.body.style.overflow = 'hidden';

      if (document.readyState === 'complete') {
        setTimeout(hide, minDuration);
      } else {
        window.addEventListener('load', () => setTimeout(hide, minDuration), { once: true });
        // Защита от зависшей загрузки внешних ресурсов (шрифты, картинки)
        setTimeout(hide, 4500);
      }
    }
  };


  /* ==============================================================
     4. CUSTOM CURSOR MODULE
     Точка следует мгновенно, кольцо — с задержкой (эффект инерции).
     Расширяется на интерактивных элементах.
     ============================================================== */
  const CursorModule = {
    dot: null,
    ring: null,
    mouseX: 0, mouseY: 0,
    ringX: 0, ringY: 0,

    init() {
      if (CONFIG.isTouch) return;
      this.dot = $('#cursorDot');
      this.ring = $('#cursorRing');
      if (!this.dot || !this.ring) return;

      window.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
        this.dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
      });

      // Скрываем курсор, когда он покидает окно
      document.addEventListener('mouseleave', () => {
        this.dot.classList.add('is-hidden');
        this.ring.classList.add('is-hidden');
      });
      document.addEventListener('mouseenter', () => {
        this.dot.classList.remove('is-hidden');
        this.ring.classList.remove('is-hidden');
      });

      this._bindHoverTargets();
      this._animateRing();
    },

    _bindHoverTargets() {
      const hoverSelector = 'a, button, input, select, textarea, .gallery__item, [data-magnetic]';
      document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverSelector)) this.ring.classList.add('is-hover');
      });
      document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverSelector)) this.ring.classList.remove('is-hover');
      });
    },

    _animateRing() {
      const tick = () => {
        this.ringX = lerp(this.ringX, this.mouseX, 0.18);
        this.ringY = lerp(this.ringY, this.mouseY, 0.18);
        this.ring.style.transform = `translate(${this.ringX}px, ${this.ringY}px) translate(-50%,-50%)`;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  };


  /* ==============================================================
     5. AMBIENT PARTICLES MODULE
     Лепестки роз падают сверху по кривым траекториям (via CSS custom
     properties, рассчитанным в JS), полупрозрачные сердечки медленно
     всплывают снизу. Оба пула переиспользуют DOM-элементы для
     производительности вместо бесконечного создания новых узлов.
     ============================================================== */
  const ParticlesModule = {
    petalsLayer: null,
    heartsLayer: null,

    init() {
      if (CONFIG.reducedMotion) return;
      this.petalsLayer = $('#petalsLayer');
      this.heartsLayer = $('#heartsLayer');
      if (this.petalsLayer) this._spawnPetals();
      if (this.heartsLayer) this._spawnHearts();
    },

    _petalSVG(hue) {
      // Лепесток розы: асимметричная капля с мягким градиентом розовый→шампань
      return `<svg width="${hue.size}" height="${hue.size * 1.15}" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 1C15 1 19 6 19 12C19 18 15 22 10 22C5 22 1 18 1 12C1 6 5 1 10 1Z" fill="url(#petalGrad${hue.id})" opacity="0.9"/>
        <defs><linearGradient id="petalGrad${hue.id}" x1="1" y1="1" x2="19" y2="22">
          <stop stop-color="#E8C4C4"/><stop offset="1" stop-color="#D9A8A8"/>
        </linearGradient></defs>
      </svg>`;
    },

    _spawnPetals() {
      for (let i = 0; i < CONFIG.petalCount; i++) {
        const petal = document.createElement('div');
        petal.className = 'petal';
        const size = randomBetween(10, 22);
        petal.innerHTML = this._petalSVG({ id: i, size });

        const startLeft = randomBetween(-2, 102);
        const duration = randomBetween(14, 26);
        const delay = randomBetween(0, 20);
        const drift = randomBetween(-120, 120);
        const rotations = randomBetween(180, 720) * (Math.random() > 0.5 ? 1 : -1);

        petal.style.left = `${startLeft}vw`;
        petal.style.animation = `petalFall${i % 3} ${duration}s linear ${delay}s infinite`;
        petal.style.setProperty('--drift', `${drift}px`);
        petal.style.setProperty('--rot', `${rotations}deg`);

        this.petalsLayer.appendChild(petal);
      }

      // Три варианта кривой падения для органичного разнообразия траекторий
      this._injectKeyframes(`
        @keyframes petalFall0 {
          0% { transform: translate(0, -5vh) rotate(0deg); opacity: 0; }
          5% { opacity: 0.9; }
          50% { transform: translate(calc(var(--drift) * 0.6), 55vh) rotate(calc(var(--rot) * 0.5)); }
          95% { opacity: 0.85; }
          100% { transform: translate(var(--drift), 108vh) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes petalFall1 {
          0% { transform: translate(0, -5vh) rotate(0deg); opacity: 0; }
          5% { opacity: 0.8; }
          40% { transform: translate(calc(var(--drift) * -0.4), 42vh) rotate(calc(var(--rot) * 0.3)); }
          70% { transform: translate(calc(var(--drift) * 0.7), 74vh) rotate(calc(var(--rot) * 0.7)); }
          95% { opacity: 0.8; }
          100% { transform: translate(var(--drift), 108vh) rotate(var(--rot)); opacity: 0; }
        }
        @keyframes petalFall2 {
          0% { transform: translate(0, -5vh) rotate(0deg) scale(1); opacity: 0; }
          8% { opacity: 0.9; }
          60% { transform: translate(var(--drift), 65vh) rotate(calc(var(--rot) * 0.6)) scale(0.9); }
          95% { opacity: 0.75; }
          100% { transform: translate(calc(var(--drift) * 1.2), 108vh) rotate(var(--rot)) scale(0.8); opacity: 0; }
        }
      `);
    },

    _spawnHearts() {
      for (let i = 0; i < CONFIG.heartCount; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        const size = randomBetween(14, 30);
        heart.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 24 22" fill="none">
          <path d="M12 20C12 20 2 13.5 2 6.8C2 3.4 4.6 1 7.8 1C9.6 1 11.2 1.9 12 3.4C12.8 1.9 14.4 1 16.2 1C19.4 1 22 3.4 22 6.8C22 13.5 12 20 12 20Z" fill="#E8C4C4" opacity="0.55"/>
        </svg>`;

        const left = randomBetween(2, 96);
        const duration = randomBetween(16, 28);
        const delay = randomBetween(0, 24);
        const drift = randomBetween(-60, 60);

        heart.style.left = `${left}vw`;
        heart.style.animation = `heartFloat ${duration}s ease-in-out ${delay}s infinite`;
        heart.style.setProperty('--h-drift', `${drift}px`);

        this.heartsLayer.appendChild(heart);
      }

      this._injectKeyframes(`
        @keyframes heartFloat {
          0% { transform: translate(0, 0) scale(0.8); opacity: 0; }
          10% { opacity: 0.7; }
          50% { transform: translate(var(--h-drift), -55vh) scale(1.1); opacity: 0.5; }
          90% { opacity: 0.3; }
          100% { transform: translate(calc(var(--h-drift) * 1.4), -110vh) scale(0.9); opacity: 0; }
        }
      `);
    },

    _injectKeyframes(css) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }
  };


  /* ==============================================================
     6. PROGRESS BAR MODULE
     ============================================================== */
  const ProgressBarModule = {
    fill: null,
    init() {
      this.fill = $('#progressBarFill');
      if (!this.fill) return;
      window.addEventListener('scroll', rafThrottle(() => this._update()));
      this._update();
    },
    _update() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      this.fill.style.width = `${clamp(pct, 0, 100)}%`;
    }
  };


  /* ==============================================================
     7. NAVIGATION MODULE
     Меняет фон при скролле, подсвечивает активный пункт меню через
     IntersectionObserver, управляет мобильным бургер-меню.
     ============================================================== */
  const NavModule = {
    nav: null, burger: null, list: null, links: [],

    init() {
      this.nav = $('#mainNav');
      this.burger = $('#navBurger');
      this.list = $('#navList');
      this.links = $$('.nav__link', this.list);
      if (!this.nav) return;

      window.addEventListener('scroll', rafThrottle(() => {
        this.nav.classList.toggle('is-scrolled', window.scrollY > 40);
      }));

      if (this.burger) {
        this.burger.addEventListener('click', () => this._toggleMenu());
        this.links.forEach(link => link.addEventListener('click', () => this._closeMenu()));
      }

      this._smoothScrollLinks();
      this._observeSections();
    },

    _toggleMenu() {
      const isOpen = this.list.classList.toggle('is-open');
      this.burger.classList.toggle('is-open', isOpen);
      this.burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    },

    _closeMenu() {
      this.list.classList.remove('is-open');
      this.burger.classList.remove('is-open');
      this.burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    },

    _smoothScrollLinks() {
      $$('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
          const targetId = anchor.getAttribute('href');
          const target = targetId.length > 1 ? $(targetId) : null;
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    },

    _observeSections() {
      const sections = this.links
        .map(link => link.dataset.section)
        .filter(Boolean)
        .map(id => $(`#${id}`))
        .filter(Boolean);

      if (!sections.length || !('IntersectionObserver' in window)) return;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.links.forEach(l => l.classList.toggle('is-active', l.dataset.section === entry.target.id));
          }
        });
      }, { rootMargin: '-45% 0px -45% 0px' });

      sections.forEach(section => observer.observe(section));
    }
  };


  /* ==============================================================
     8. MAGNETIC BUTTONS + RIPPLE MODULE
     Кнопки с data-magnetic слегка "притягиваются" к курсору;
     все .btn получают ripple-эффект по клику.
     ============================================================== */
  const MagneticButtonsModule = {
    init() {
      if (!CONFIG.isTouch) {
        $$('[data-magnetic]').forEach(btn => this._bindMagnetic(btn));
      }
      $$('.btn').forEach(btn => btn.addEventListener('click', (e) => this._ripple(e, btn)));
    },

    _bindMagnetic(btn) {
      const strength = 0.35;
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) * strength;
        const y = (e.clientY - rect.top - rect.height / 2) * strength;
        btn.style.transform = `translate(${x}px, ${y}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    },

    _ripple(e, btn) {
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.4;
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = `${size}px`;
      span.style.left = `${e.clientX - rect.left - size / 2}px`;
      span.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    }
  };


  /* ==============================================================
     9. HERO PARALLAX + TEXT REVEAL MODULE
     Фоновое фото сдвигается медленнее скролла (параллакс), заголовок
     появляется по буквам, кнопка запускает кинематографичный переход.
     ============================================================== */
  const HeroModule = {
    image: null,

    init() {
      this.image = $('.hero__image');
      this._splitLetters();
      this._bindParallax();
      this._revealHeroText();
      this._bindOpenInvitation();
    },

    _splitLetters() {
      $$('[data-reveal-letters]').forEach(el => {
        const text = el.textContent;
        el.innerHTML = text.split('').map((char, i) =>
          `<span class="letter-span" style="transition-delay:${i * 0.035}s">${char === ' ' ? '&nbsp;' : char}</span>`
        ).join('');
      });
    },

    _bindParallax() {
      if (!this.image || CONFIG.reducedMotion) return;
      window.addEventListener('scroll', rafThrottle(() => {
        const scrollY = window.scrollY;
        const heroHeight = window.innerHeight;
        if (scrollY < heroHeight * 1.2) {
          const translateY = scrollY * 0.35;
          const scale = 1 + scrollY * 0.0002;
          this.image.style.transform = `translateY(${translateY}px) scale(${clamp(scale, 1, 1.15)})`;
        }
      }));
    },

    _revealHeroText() {
      // Небольшая задержка синхронизирует появление текста с исчезновением лоадера
      const delay = CONFIG.reducedMotion ? 100 : 3100;
      setTimeout(() => {
        $$('.reveal-word', $('.hero')).forEach((el, i) => {
          setTimeout(() => el.classList.add('is-revealed'), i * 200);
        });
        $$('.reveal-letters', $('.hero')).forEach(el => el.classList.add('is-revealed'));
      }, delay);
    },

    _bindOpenInvitation() {
      const btn = $('#openInvitation');
      if (!btn) return;
      btn.addEventListener('click', () => {
        // Красивый кинематографичный скролл к следующей секции
        const story = $('#story') || document.body;
        const heroSection = $('.hero');
        heroSection.style.transition = 'filter 0.8s ease';
        heroSection.style.filter = 'brightness(1.15)';
        setTimeout(() => {
          window.scrollTo({ top: heroSection.offsetHeight - 80, behavior: 'smooth' });
          setTimeout(() => { heroSection.style.filter = ''; }, 900);
        }, 150);
      });
    }
  };


  /* ==============================================================
     10. SCROLL REVEAL MODULE
     Единый IntersectionObserver для всех [data-reveal-block] —
     плавное появление секций и карточек при попадании во вьюпорт.
     ============================================================== */
  const ScrollRevealModule = {
    init() {
      const targets = $$('[data-reveal-block]');
      if (!targets.length) return;

      if (!('IntersectionObserver' in window) || CONFIG.reducedMotion) {
        targets.forEach(el => el.classList.add('is-revealed'));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

      targets.forEach(el => observer.observe(el));
    }
  };


  /* ==============================================================
     11. TIMELINE PROGRESS MODULE
     Золотая линия таймлайна заполняется пропорционально прогрессу
     прокрутки внутри секции истории любви.
     ============================================================== */
  const TimelineModule = {
    fill: null, section: null,

    init() {
      this.fill = $('#timelineFill');
      this.section = $('#story');
      if (!this.fill || !this.section) return;
      window.addEventListener('scroll', rafThrottle(() => this._update()));
      this._update();
    },

    _update() {
      const rect = this.section.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // Прогресс: 0 когда верх секции внизу экрана, 1 когда низ секции ушёл наверх
      const total = rect.height + viewportH * 0.5;
      const passed = clamp(viewportH * 0.5 - rect.top, 0, total);
      const pct = total > 0 ? (passed / total) * 100 : 0;
      this.fill.style.height = `${clamp(pct, 0, 100)}%`;
    }
  };


  /* ==============================================================
     12. COUNTDOWN MODULE
     Обновляется каждую секунду; при смене значения — лёгкая
     анимация "flip" через класс, снимаемый в следующем тике.
     ============================================================== */
  const CountdownModule = {
    els: {},
    prevValues: { days: null, hours: null, minutes: null, seconds: null },

    init() {
      this.els.days = $('#cdDays');
      this.els.hours = $('#cdHours');
      this.els.minutes = $('#cdMinutes');
      this.els.seconds = $('#cdSeconds');
      if (!this.els.days) return;

      this._tick();
      setInterval(() => this._tick(), 1000);
    },

    _tick() {
      const now = new Date();
      const diff = CONFIG.weddingDate - now;

      if (diff <= 0) {
        this.els.days.textContent = '000';
        this.els.hours.textContent = this.els.minutes.textContent = this.els.seconds.textContent = '00';
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      this._setValue('days', pad(days, 3));
      this._setValue('hours', pad(hours));
      this._setValue('minutes', pad(minutes));
      this._setValue('seconds', pad(seconds));
    },

    _setValue(key, value) {
      const el = this.els[key];
      if (el.textContent === value) return;
      el.textContent = value;
      if (!CONFIG.reducedMotion) {
        el.style.animation = 'none';
        // Форсируем reflow, чтобы перезапустить анимацию при каждом тике
        void el.offsetWidth;
        el.style.animation = 'countdownTick 0.4s ease';
      }
    }
  };

  // Keyframe для тика цифр countdown — небольшой bounce вверх
  (function injectCountdownKeyframe() {
    const style = document.createElement('style');
    style.textContent = `@keyframes countdownTick {
      0% { transform: translateY(0); opacity: 1; }
      40% { transform: translateY(-6px); opacity: 0.7; }
      100% { transform: translateY(0); opacity: 1; }
    }`;
    document.head.appendChild(style);
  })();


  /* ==============================================================
     13. TRAVEL MAP DRAW MODULE
     Пунктирная линия маршрута "рисуется" при появлении секции,
     точки-пины появляются последовательно вдоль пути.
     ============================================================== */
  const TravelMapModule = {
    init() {
      const section = $('.travel-map');
      const path = $('.travel-map__path');
      const pins = $$('.travel-map__pin');
      if (!section || !path) return;

      if (!('IntersectionObserver' in window)) {
        path.classList.add('is-drawn');
        pins.forEach(p => p.classList.add('is-visible'));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            path.classList.add('is-drawn');
            pins.forEach((pin, i) => {
              setTimeout(() => pin.classList.add('is-visible'), 400 + i * 260);
            });
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });

      observer.observe(section);
    }
  };


  /* ==============================================================
     14. GALLERY + LIGHTBOX MODULE
     ============================================================== */
  const GalleryModule = {
    lightbox: null, image: null,

    init() {
      this.lightbox = $('#lightbox');
      this.image = $('#lightboxImage');
      if (!this.lightbox) return;

      $$('.gallery__item').forEach(item => {
        item.addEventListener('click', () => this._open(item.dataset.full, item.querySelector('img')?.alt));
      });

      $('#lightboxClose')?.addEventListener('click', () => this._close());
      this.lightbox.addEventListener('click', (e) => {
        if (e.target === this.lightbox) this._close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.lightbox.classList.contains('is-open')) this._close();
      });
    },

    _open(src, alt) {
      this.image.src = src;
      this.image.alt = alt || 'Фотография из галереи';
      this.lightbox.classList.add('is-open');
      this.lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    },

    _close() {
      this.lightbox.classList.remove('is-open');
      this.lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  };


  /* ==============================================================
     15. SONG PLAYER MODULE
     Использует Web Audio API generative tone как деликатный
     музыкальный фрагмент — без внешней лицензированной аудиодорожки,
     чтобы не нарушать авторские права трека, упомянутого в тексте.
     ============================================================== */
  const SongPlayerModule = {
    playBtn: null, progressFill: null, timeLabel: null,
    audioCtx: null, isPlaying: false, startTime: 0, duration: 28, rafId: null,

    init() {
      this.playBtn = $('#songPlayBtn');
      this.progressFill = $('#songProgressFill');
      this.timeLabel = $('#songTime');
      if (!this.playBtn) return;
      this.playBtn.addEventListener('click', () => this._toggle());
    },

    _toggle() {
      this.isPlaying ? this._stop() : this._play();
    },

    _play() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      this.isPlaying = true;
      this.startTime = this.audioCtx.currentTime;
      this._togglePlayIcon(true);
      this._playGentleMelody();
      this._animateProgress();
    },

    _stop() {
      this.isPlaying = false;
      this._togglePlayIcon(false);
      if (this.rafId) cancelAnimationFrame(this.rafId);
    },

    _togglePlayIcon(playing) {
      $('.song__play-icon', this.playBtn).style.display = playing ? 'none' : 'block';
      $('.song__pause-icon', this.playBtn).style.display = playing ? 'block' : 'none';
    },

    /** Простая арпеджио-мелодия на теплых нотах, имитирующая романтичный фрагмент */
    _playGentleMelody() {
      const notes = [523.25, 659.25, 783.99, 659.25, 523.25, 440.00, 523.25, 659.25]; // C-E-G arpeggio in C major
      const noteDuration = this.duration / notes.length;

      notes.forEach((freq, i) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const noteStart = this.audioCtx.currentTime + i * noteDuration;
        gain.gain.setValueAtTime(0, noteStart);
        gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.15);
        gain.gain.linearRampToValueAtTime(0, noteStart + noteDuration * 0.95);
        osc.connect(gain).connect(this.audioCtx.destination);
        osc.start(noteStart);
        osc.stop(noteStart + noteDuration);
      });

      setTimeout(() => { if (this.isPlaying) this._stop(); }, this.duration * 1000);
    },

    _animateProgress() {
      const tick = () => {
        if (!this.isPlaying) return;
        const elapsed = this.audioCtx.currentTime - this.startTime;
        const pct = clamp((elapsed / this.duration) * 100, 0, 100);
        this.progressFill.style.width = `${pct}%`;
        this.timeLabel.textContent = `0:${pad(Math.floor(elapsed))}`;
        if (pct < 100) {
          this.rafId = requestAnimationFrame(tick);
        } else {
          this._stop();
          this.progressFill.style.width = '0%';
          this.timeLabel.textContent = '0:00';
        }
      };
      tick();
    }
  };


  /* ==============================================================
     16. BACKGROUND MUSIC MODULE
     Управляет фоновым аудиотегом; учитывает автоплей-политики
     браузеров (требуют жеста пользователя).
     ============================================================== */
  const BackgroundMusicModule = {
    audio: null, toggle: null,

    init() {
      this.audio = $('#bgMusic');
      this.toggle = $('#musicToggle');
      if (!this.audio || !this.toggle) return;
      this.audio.volume = 0.35;
      this.toggle.addEventListener('click', () => this._toggle());
    },

    _toggle() {
      if (this.audio.paused) {
        this.audio.play().then(() => {
          this.toggle.classList.add('is-playing');
          this.toggle.setAttribute('aria-pressed', 'true');
          this.toggle.setAttribute('aria-label', 'Остановить музыку');
        }).catch(() => {
          /* Автоплей заблокирован политикой браузера — тихо игнорируем */
        });
      } else {
        this.audio.pause();
        this.toggle.classList.remove('is-playing');
        this.toggle.setAttribute('aria-pressed', 'false');
        this.toggle.setAttribute('aria-label', 'Включить музыку');
      }
    }
  };


  /* ==============================================================
     17. ADD TO CALENDAR MODULE
     Генерирует и скачивает .ics файл для добавления события
     в любой календарь (Google, Apple, Outlook и т.д.)
     ============================================================== */
  const CalendarModule = {
    init() {
      const btn = $('#addToCalendar');
      if (!btn) return;
      btn.addEventListener('click', () => this._download());
    },

    _formatICSDate(date) {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    },

    _download() {
      const start = CONFIG.weddingDate;
      const end = new Date(start.getTime() + 8 * 60 * 60 * 1000); // 8 часов торжества

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Wedding Invitation//RU',
        'BEGIN:VEVENT',
        `UID:${Date.now()}@wedding-invitation`,
        `DTSTAMP:${this._formatICSDate(new Date())}`,
        `DTSTART:${this._formatICSDate(start)}`,
        `DTEND:${this._formatICSDate(end)}`,
        'SUMMARY:Свадьба Александра и Екатерины',
        'DESCRIPTION:С любовью приглашаем вас разделить самый счастливый день нашей жизни.',
        'LOCATION:Royal Palace\\, ул. Абдрахманова 120\\, Бишкек',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'svadba-aleksandr-ekaterina.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };


  /* ==============================================================
     18. COPY REQUISITES MODULE
     ============================================================== */
  const CopyRequisitesModule = {
    init() {
      const btn = $('#copyRequisites');
      if (!btn) return;
      btn.addEventListener('click', () => this._copy(btn));
    },

    async _copy(btn) {
      const text = '4471 XXXX XXXX XXXX — Александр С.';
      const label = $('span', btn);
      const originalText = label.textContent;

      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        /* Clipboard API недоступен (напр. небезопасный контекст) — просто визуально подтверждаем */
      }

      btn.classList.add('is-copied');
      label.textContent = 'Скопировано ✓';
      setTimeout(() => {
        btn.classList.remove('is-copied');
        label.textContent = originalText;
      }, 2200);
    }
  };


  /* ==============================================================
     19. FAQ ACCORDION MODULE
     ============================================================== */
  const FAQModule = {
    init() {
      $$('.faq__item').forEach(item => {
        const question = $('.faq__question', item);
        const answer = $('.faq__answer', item);
        question.addEventListener('click', () => this._toggle(item, question, answer));
      });
    },

    _toggle(item, question, answer) {
      const isOpen = item.classList.contains('is-open');

      // Закрываем остальные для более чистого UX (можно убрать для мульти-открытия)
      $$('.faq__item.is-open').forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('is-open');
          $('.faq__question', openItem).setAttribute('aria-expanded', 'false');
          $('.faq__answer', openItem).style.maxHeight = '';
        }
      });

      item.classList.toggle('is-open', !isOpen);
      question.setAttribute('aria-expanded', String(!isOpen));
      answer.style.maxHeight = !isOpen ? `${answer.scrollHeight}px` : '';
    }
  };


  /* ==============================================================
     20. RSVP FORM MODULE
     Валидация на клиенте + красивая анимация успешной отправки.
     Настоящей отправки на сервер нет (шаблон), поэтому имитируем
     сетевую задержку для ощущения "живого" processing.
     ============================================================== */
  const RSVPModule = {
    form: null, success: null,

    init() {
      this.form = $('#rsvpForm');
      this.success = $('#rsvpSuccess');
      if (!this.form) return;
      this.form.addEventListener('submit', (e) => this._handleSubmit(e));

      // Убираем состояние ошибки при вводе
      $$('input, select', this.form).forEach(field => {
        field.addEventListener('input', () => this._clearError(field));
        field.addEventListener('change', () => this._clearError(field));
      });
    },

    _handleSubmit(e) {
      e.preventDefault();
      const isValid = this._validate();
      if (!isValid) return;

      const submitBtn = $('.rsvp__submit', this.form);
      const label = $('.btn__label', submitBtn);
      const originalLabel = label.textContent;
      label.textContent = 'Отправляем...';
      submitBtn.style.pointerEvents = 'none';

      // Имитация сетевого запроса для ощущения отклика системы
      setTimeout(() => {
        label.textContent = originalLabel;
        submitBtn.style.pointerEvents = '';
        this._showSuccess();
      }, 900);
    },

    _validate() {
      let isValid = true;

      const name = $('#rsvpName');
      if (!name.value.trim()) {
        this._setError(name);
        isValid = false;
      }

      const phone = $('#rsvpPhone');
      const phonePattern = /^[+\d][\d\s\-()]{6,}$/;
      if (!phonePattern.test(phone.value.trim())) {
        this._setError(phone);
        isValid = false;
      }

      const guests = $('#rsvpGuests');
      if (!guests.value) {
        this._setError(guests);
        isValid = false;
      }

      return isValid;
    },

    _setError(field) {
      field.closest('.rsvp__field').classList.add('has-error');
    },

    _clearError(field) {
      field.closest('.rsvp__field').classList.remove('has-error');
    },

    _showSuccess() {
      this.form.classList.add('is-hidden');
      this.success.classList.add('is-visible');
      this.success.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Небольшой всплеск лепестков-конфетти в момент успеха — праздничный акцент
      if (!CONFIG.reducedMotion) this._celebrationBurst();
    },

    _celebrationBurst() {
      const colors = ['#E8C4C4', '#C9A876', '#E8D4A8'];
      for (let i = 0; i < 18; i++) {
        const confetti = document.createElement('div');
        const size = randomBetween(6, 12);
        confetti.style.cssText = `
          position: fixed;
          top: 40%;
          left: 50%;
          width: ${size}px;
          height: ${size}px;
          background: ${colors[i % colors.length]};
          border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
          pointer-events: none;
          z-index: 950;
          opacity: 1;
        `;
        document.body.appendChild(confetti);

        const angle = randomBetween(0, Math.PI * 2);
        const distance = randomBetween(120, 280);
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance - 80;

        confetti.animate([
          { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4) rotate(${randomBetween(180, 540)}deg)`, opacity: 0 }
        ], { duration: randomBetween(900, 1500), easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
          .onfinish = () => confetti.remove();
      }
    }
  };


  /* ==============================================================
     21. SCROLL TOP MODULE
     ============================================================== */
  const ScrollTopModule = {
    btn: null,
    init() {
      this.btn = $('#scrollTop');
      if (!this.btn) return;
      window.addEventListener('scroll', rafThrottle(() => {
        this.btn.classList.toggle('is-visible', window.scrollY > window.innerHeight);
      }));
      this.btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  };


  /* ==============================================================
     22. INIT
     Инициализируем все модули после того, как DOM готов.
     Порядок важен только косметически — модули независимы друг
     от друга и не имеют побочных связей.
     ============================================================== */
  function init() {
    LoaderModule.init();
    CursorModule.init();
    ParticlesModule.init();
    ProgressBarModule.init();
    NavModule.init();
    MagneticButtonsModule.init();
    HeroModule.init();
    ScrollRevealModule.init();
    TimelineModule.init();
    CountdownModule.init();
    TravelMapModule.init();
    GalleryModule.init();
    SongPlayerModule.init();
    BackgroundMusicModule.init();
    CalendarModule.init();
    CopyRequisitesModule.init();
    FAQModule.init();
    RSVPModule.init();
    ScrollTopModule.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();