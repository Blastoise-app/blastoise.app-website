const HERO_INTRO_DURATION = 4;
const HERO_INTRO_DELAY = 0.4;

// Zoom geometry — must match scripts/generate-hero-frames.js, which
// documents the original frame-based version of this animation.
const HERO_TARGET_X = 0.3765;
const HERO_TARGET_Y = 0.408;
const HERO_FINAL_SCALE = 90;
const HERO_BG = "#2d0000";

// The hero intro plays once on load: the camera zooms into the shell,
// then the hero fades away to reveal the site content underneath.
let heroIntroDone = false;
let heroIntroTween = null;
let heroSource = null;
function finishHeroIntro() {
  if (heroIntroDone) return;
  heroIntroDone = true;

  if (heroIntroTween) {
    heroIntroTween.kill();
    heroIntroTween = null;
  }

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
        if (heroSource && heroSource.close) heroSource.close();
        heroSource = null;
      },
    });
  }

  document.body.classList.remove("hero-locked");
  if (lenis) lenis.start();
  if (playEntryReveal) playEntryReveal();
}

// Downscale the 10340x10800 source once into a bitmap sized for the
// device: full resolution is ~450MB decoded and exceeds many mobile GPUs'
// max texture size, which forces slow tiled rendering. Phones keep the
// zoom sharp well past the point where the art is flat color anyway.
function prepareHeroSource(heroImg) {
  const cap = window.matchMedia("(max-width: 640px)").matches ? 4096 : 8192;
  const IW = heroImg.naturalWidth;
  const IH = heroImg.naturalHeight;
  const ratio = cap / Math.max(IW, IH);
  if (ratio >= 1 || typeof createImageBitmap === "undefined") {
    return Promise.resolve(heroImg);
  }
  return createImageBitmap(heroImg, {
    resizeWidth: Math.round(IW * ratio),
    resizeHeight: Math.round(IH * ratio),
    resizeQuality: "high",
  }).catch(() => heroImg);
}

// Render the zoom directly from the source bitmap at a continuous scale
// every frame, instead of stepping through pre-rendered stills — this is
// what keeps the shell edges perfectly steady.
function initBlastoiseHero(source) {
  const heroImg = document.querySelector("#hero-blastoise");
  const heroSection = document.querySelector("#section-hero");
  if (!heroImg || !heroSection || heroIntroDone) return;

  const canvas = document.createElement("canvas");
  canvas.id = "hero-blastoise-canvas";
  heroImg.parentElement.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    canvas.remove();
    finishHeroIntro();
    return;
  }

  const IW = source.width || source.naturalWidth;
  const IH = source.height || source.naturalHeight;

  // Layout mirrors the img's object-fit: contain + object-position CSS
  // so the canvas takeover at progress 0 is pixel-identical.
  let frameW, frameH, displayedWidth, displayedHeight;
  let targetDisplayX, targetDisplayY, imageOffsetX, imageOffsetY;
  function layout() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    frameW = Math.round(heroSection.clientWidth * dpr);
    frameH = Math.round(heroSection.clientHeight * dpr);
    canvas.width = frameW;
    canvas.height = frameH;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const narrow = window.matchMedia("(max-width: 640px)").matches;
    const opX = narrow ? 0.5 : 0.55;
    const opY = narrow ? 0.5 : 0.45;

    const frameAspect = frameW / frameH;
    const imageAspect = IW / IH;
    if (frameAspect > imageAspect) {
      displayedHeight = frameH;
      displayedWidth = frameH * imageAspect;
    } else {
      displayedWidth = frameW;
      displayedHeight = frameW / imageAspect;
    }
    imageOffsetX = (frameW - displayedWidth) * opX;
    imageOffsetY = (frameH - displayedHeight) * opY;
    targetDisplayX = imageOffsetX + displayedWidth * HERO_TARGET_X;
    targetDisplayY = imageOffsetY + displayedHeight * HERO_TARGET_Y;
  }

  let lastEased = 0;
  function render(eased) {
    lastEased = eased;
    const scale = 1 + (HERO_FINAL_SCALE - 1) * eased;
    const tx = eased * (frameW / 2 - targetDisplayX);
    const ty = eased * (frameH / 2 - targetDisplayY);
    const imgLeft = targetDisplayX + scale * (imageOffsetX - targetDisplayX) + tx;
    const imgTop = targetDisplayY + scale * (imageOffsetY - targetDisplayY) + ty;
    const imgW = scale * displayedWidth;
    const imgH = scale * displayedHeight;

    ctx.fillStyle = HERO_BG;
    ctx.fillRect(0, 0, frameW, frameH);

    const visLeft = Math.max(0, imgLeft);
    const visTop = Math.max(0, imgTop);
    const visRight = Math.min(frameW, imgLeft + imgW);
    const visBottom = Math.min(frameH, imgTop + imgH);
    if (visRight <= visLeft || visBottom <= visTop) return;

    ctx.drawImage(
      source,
      ((visLeft - imgLeft) / imgW) * IW,
      ((visTop - imgTop) / imgH) * IH,
      ((visRight - visLeft) / imgW) * IW,
      ((visBottom - visTop) / imgH) * IH,
      visLeft,
      visTop,
      visRight - visLeft,
      visBottom - visTop
    );
  }

  layout();
  render(0);
  heroImg.style.display = "none";

  window.addEventListener(
    "resize",
    () => {
      if (heroIntroDone) return;
      layout();
      render(lastEased);
    },
    { passive: true }
  );

  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  if (heroTitleOverlay) {
    gsap.set(heroTitleOverlay, { opacity: 1 });
  }

  const intro = { p: 0 };
  heroIntroTween = gsap.to(intro, {
    p: 1,
    duration: HERO_INTRO_DURATION,
    delay: HERO_INTRO_DELAY,
    ease: "power1.inOut",
    onUpdate: () => {
      // Exponential scale growth reads as a constant zoom speed.
      const scale = Math.pow(HERO_FINAL_SCALE, intro.p);
      render((scale - 1) / (HERO_FINAL_SCALE - 1));
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

  // If the image stalls on a slow connection, don't leave the site stuck
  // behind the hero. Note: img.decode() rejects in Chromium for images
  // this large, so wait on load state instead.
  const safetyTimer = setTimeout(finishHeroIntro, 8000);
  const heroImg = document.querySelector("#hero-blastoise");
  const ready = new Promise((resolve, reject) => {
    if (!heroImg) return reject();
    if (heroImg.complete && heroImg.naturalWidth > 0) return resolve();
    if (heroImg.complete) return reject();
    heroImg.addEventListener("load", resolve, { once: true });
    heroImg.addEventListener("error", reject, { once: true });
  });
  ready
    .then(() => prepareHeroSource(heroImg))
    .then((source) => {
      clearTimeout(safetyTimer);
      if (heroIntroDone) {
        if (source && source.close) source.close();
        return;
      }
      heroSource = source;
      initBlastoiseHero(source);
    })
    .catch(() => {
      clearTimeout(safetyTimer);
      console.warn("Hero image failed to load; skipping intro animation.");
      finishHeroIntro();
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
