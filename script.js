const HERO_FRAME_COUNT = 90;
const HERO_INTRO_DURATION = 4;
const HERO_INTRO_DELAY = 0.4;

function pickHeroProfile() {
  return window.innerWidth < window.innerHeight ? "mobile" : "desktop";
}

function preloadHeroFrames(profile) {
  const loads = [];
  const images = [];
  for (let i = 0; i < HERO_FRAME_COUNT; i++) {
    const img = new Image();
    const n = String(i).padStart(3, "0");
    img.src = `assets/images/hero-sequence/${profile}/frame-${n}.webp`;
    images.push(img);
    loads.push(
      new Promise((resolve) => {
        if (img.complete && img.naturalWidth > 0) return resolve(img);
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
      })
    );
  }
  return Promise.all(loads).then((results) => {
    const ok = results.every((r) => r !== null);
    return { ok, images };
  });
}

// The hero intro plays once on load: the frame sequence zooms into the shell,
// then the hero fades away to reveal the site content underneath.
let heroIntroDone = false;
function finishHeroIntro() {
  if (heroIntroDone) return;
  heroIntroDone = true;

  const heroSection = document.querySelector("#section-hero");
  const heroTitleOverlay = document.querySelector("#hero-title-overlay");

  if (heroTitleOverlay) {
    gsap.to(heroTitleOverlay, {
      opacity: 0,
      duration: 0.3,
      overwrite: true,
      onComplete: () => {
        heroTitleOverlay.style.visibility = "hidden";
      },
    });
  }

  if (heroSection) {
    gsap.to(heroSection, {
      opacity: 0,
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => {
        heroSection.style.visibility = "hidden";
      },
    });
  }

  document.body.classList.remove("hero-locked");
  if (lenis) lenis.start();
  if (playEntryReveal) playEntryReveal();
}

function initBlastoiseHero(frames) {
  const heroImg = document.querySelector("#hero-blastoise");
  const heroSection = document.querySelector("#section-hero");
  if (!heroImg || !heroSection || heroIntroDone) return;

  const wrapper = heroImg.parentElement;

  // Replace the img with a canvas, same layout box
  const canvas = document.createElement("canvas");
  canvas.id = "hero-blastoise-canvas";
  canvas.width = frames[0].naturalWidth;
  canvas.height = frames[0].naturalHeight;
  wrapper.appendChild(canvas);
  heroImg.style.display = "none";

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Crossfade between adjacent frames so the zoom reads as continuous
  // motion instead of stepping through the 90 discrete frames.
  let lastF = -1;
  function drawProgress(p) {
    const f = Math.max(0, Math.min(1, p)) * (HERO_FRAME_COUNT - 1);
    if (lastF !== -1 && Math.abs(f - lastF) < 0.001) return;
    lastF = f;
    const i = Math.floor(f);
    const frac = f - i;
    ctx.globalAlpha = 1;
    ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height);
    if (frac > 0 && i + 1 < HERO_FRAME_COUNT) {
      ctx.globalAlpha = frac;
      ctx.drawImage(frames[i + 1], 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }
  drawProgress(0);

  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  if (heroTitleOverlay) {
    gsap.set(heroTitleOverlay, { opacity: 1 });
  }

  const intro = { p: 0 };
  gsap.to(intro, {
    p: 1,
    duration: HERO_INTRO_DURATION,
    delay: HERO_INTRO_DELAY,
    ease: "sine.inOut",
    onUpdate: () => {
      drawProgress(intro.p);
      if (heroTitleOverlay) {
        const fadeStart = 0.72;
        heroTitleOverlay.style.opacity =
          intro.p <= fadeStart ? 1 : Math.max(0, 1 - (intro.p - fadeStart) / (1 - fadeStart));
      }
    },
    onComplete: finishHeroIntro,
  });
}

// Entry section: fades in once the hero intro finishes.
let playEntryReveal = null;
let entryRevealDone = false;
function initEntryReveal() {
  const introEl = document.querySelector("#entry-intro");
  const appsEl = document.querySelector("#entry-apps");

  if (!introEl || !appsEl) {
    return;
  }

  gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });

  playEntryReveal = () => {
    if (entryRevealDone) return;
    entryRevealDone = true;

    gsap.to(introEl, {
      opacity: 1,
      duration: 0.7,
      ease: "power2.out",
      overwrite: true,
      onComplete: () => {
        gsap.to(appsEl, {
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          overwrite: true,
        });
      },
    });
  };
}

let lenis = null;
function initSmoothScroll() {
  if (lenis || typeof Lenis === "undefined") return;
  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
}

function init() {
  window.scrollTo(0, 0);
  initSmoothScroll();

  // Lock scrolling while the intro plays; finishHeroIntro unlocks it.
  document.body.classList.add("hero-locked");
  if (lenis) lenis.stop();

  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  if (heroTitleOverlay) {
    gsap.set(heroTitleOverlay, { opacity: 1, x: 0, y: 0 });
  }

  initEntryReveal();

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    finishHeroIntro();
    return;
  }

  // If frames stall on a slow connection, don't leave the site stuck behind the hero.
  const safetyTimer = setTimeout(finishHeroIntro, 8000);
  preloadHeroFrames(pickHeroProfile()).then(({ ok, images }) => {
    clearTimeout(safetyTimer);
    if (heroIntroDone) return;
    if (!ok) {
      console.warn("Hero frame sequence failed to load; skipping intro animation.");
      finishHeroIntro();
      return;
    }
    initBlastoiseHero(images);
  });
}

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

let initialized = false;
function bootstrap() {
  if (initialized) return;
  initialized = true;
  init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}

// Handle back-navigation from /pasta/ via bfcache: the intro has already
// played, so make sure the hero stays hidden and the content is visible.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  window.scrollTo(0, 0);
  if (!heroIntroDone) return;
  const heroSection = document.querySelector("#section-hero");
  if (heroSection) {
    heroSection.style.opacity = "0";
    heroSection.style.visibility = "hidden";
  }
  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  if (heroTitleOverlay) {
    heroTitleOverlay.style.opacity = "0";
    heroTitleOverlay.style.visibility = "hidden";
  }
});
