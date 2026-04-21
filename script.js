const HERO_FRAME_COUNT = 90;

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

function initBlastoiseHero(frames) {
  const heroImg = document.querySelector("#hero-blastoise");
  const heroSection = document.querySelector("#section-hero");
  if (!heroImg || !heroSection) return;

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

  let currentFrame = -1;
  function drawFrame(idx) {
    const i = Math.max(0, Math.min(HERO_FRAME_COUNT - 1, idx));
    if (i === currentFrame) return;
    currentFrame = i;
    ctx.drawImage(frames[i], 0, 0, canvas.width, canvas.height);
  }
  drawFrame(0);

  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  const setHeroHidden = (hidden) => {
    heroSection.style.opacity = hidden ? "0" : "1";
    heroSection.style.visibility = hidden ? "hidden" : "visible";
  };
  if (heroTitleOverlay) {
    gsap.set(heroTitleOverlay, { opacity: 1 });
  }

  ScrollTrigger.create({
    trigger: heroSection,
    start: "top top",
    end: () => `+=${window.innerHeight * (window.innerWidth <= 640 ? 1.1 : 1.2)}`,
    scrub: 0.1,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: function (self) {
      const p = Math.max(0, Math.min(1, self.progress || 0));
      drawFrame(Math.round(p * (HERO_FRAME_COUNT - 1)));
      if (heroTitleOverlay) {
        const fadeStart = 0.72;
        const titleOpacity = p <= fadeStart ? 1 : Math.max(0, 1 - (p - fadeStart) / (1 - fadeStart));
        heroTitleOverlay.style.opacity = titleOpacity;
      }
    },
    onLeave: function () {
      setHeroHidden(true);
      if (playEntryReveal) playEntryReveal();
    },
    onEnterBack: function () {
      setHeroHidden(false);
      if (resetEntryReveal) resetEntryReveal();
    },
  });

  ScrollTrigger.refresh();
}

// Entry section: fade in on hero onLeave, no scroll locking.
let playEntryReveal = null;
let entryRevealDone = false;
let resetEntryReveal = null;
function initEntryReveal() {
  const introEl = document.querySelector("#entry-intro");
  const appsByBlastoiseEl = document.querySelector("#entry-apps-by-blastoise");
  const introDividerEl = document.querySelector("#entry-intro-divider");
  const appsEl = document.querySelector("#entry-apps");
  const entrySection = document.querySelector("#section-entry");

  if (!introEl || !appsByBlastoiseEl || !introDividerEl || !appsEl || !entrySection) {
    return;
  }

  gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });

  resetEntryReveal = () => {
    entryRevealDone = false;
    gsap.killTweensOf([introEl, appsEl]);
    gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });
  };

  playEntryReveal = () => {
    if (entryRevealDone) return;
    entryRevealDone = true;

    gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });

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
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function init() {
  gsap.registerPlugin(ScrollTrigger);
  window.scrollTo(0, 0);
  initSmoothScroll();

  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  if (heroTitleOverlay) {
    gsap.set(heroTitleOverlay, { opacity: 1, x: 0, y: 0 });
  }

  initEntryReveal();

  preloadHeroFrames(pickHeroProfile()).then(({ ok, images }) => {
    if (!ok) {
      console.warn("Hero frame sequence failed to load; hero image will stay static.");
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

// Handle back-navigation from /ditto/ via bfcache: reset scroll and refresh
// ScrollTrigger so the hero pin/visibility state doesn't stay stuck.
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  window.scrollTo(0, 0);
  entryRevealDone = false;
  const heroSection = document.querySelector("#section-hero");
  if (heroSection) {
    heroSection.style.opacity = "1";
    heroSection.style.visibility = "visible";
  }
  if (resetEntryReveal) resetEntryReveal();
  if (window.ScrollTrigger) ScrollTrigger.refresh(true);
});
