function initBlastoiseHero() {
  const heroBlastoise = document.querySelector("#hero-blastoise");
  const heroSection = document.querySelector("#section-hero");

  if (!heroBlastoise || !heroSection) {
    return;
  }

  const heroWrapper = heroBlastoise.parentElement;
  gsap.killTweensOf(heroWrapper);

  // Calibrated shell-opening position on the image content (responsive-safe baseline)
  const TARGET_X = 0.3765;
  const TARGET_Y = 0.408;
  const FALLBACK_ORIGIN = `${TARGET_X * 100}% ${TARGET_Y * 100}%`;

  function parseObjectPositionAxis(value) {
    if (!value) return 0.5;
    if (value.endsWith("%")) {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num / 100 : 0.5;
    }
    if (value === "left" || value === "top") return 0;
    if (value === "right" || value === "bottom") return 1;
    return 0.5;
  }

  // Returns { transformOrigin, translation } for the zoom animation, or null if the
  // image hasn't loaded yet. Locates the calibrated target point on the displayed
  // image and produces the wrapper-relative origin + a viewport-centering translation.
  function computeZoomGeometry() {
    const container = heroWrapper.parentElement;
    const containerRect = container.getBoundingClientRect();
    const wrapperRect = heroWrapper.getBoundingClientRect();
    const nw = heroBlastoise.naturalWidth;
    const nh = heroBlastoise.naturalHeight;

    if (!nw || !nh || !wrapperRect.width || !wrapperRect.height) return null;

    // object-fit: contain — compute displayed image size inside the container
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = nw / nh;
    let displayedWidth, displayedHeight;
    if (containerAspect > imageAspect) {
      displayedHeight = containerRect.height;
      displayedWidth = displayedHeight * imageAspect;
    } else {
      displayedWidth = containerRect.width;
      displayedHeight = displayedWidth / imageAspect;
    }

    // object-position offset of the displayed image within the container
    const [posX, posY = "50%"] = (getComputedStyle(heroBlastoise).objectPosition || "50% 50%").split(" ");
    const objX = parseObjectPositionAxis(posX);
    const objY = parseObjectPositionAxis(posY);
    const imageOffsetX = (containerRect.width - displayedWidth) * objX;
    const imageOffsetY = (containerRect.height - displayedHeight) * objY;

    // Target point in wrapper-relative pixels (wrapper and container are coincident)
    const targetX = imageOffsetX + displayedWidth * TARGET_X;
    const targetY = imageOffsetY + displayedHeight * TARGET_Y;
    const percentX = (targetX / wrapperRect.width) * 100;
    const percentY = (targetY / wrapperRect.height) * 100;

    return {
      transformOrigin: `${percentX}% ${percentY}%`,
      translation: {
        x: window.innerWidth / 2 - (wrapperRect.left + targetX),
        y: window.innerHeight / 2 - (wrapperRect.top + targetY)
      }
    };
  }

  const initialGeometry = computeZoomGeometry();
  gsap.set(heroWrapper, {
    scale: 1,
    x: 0,
    y: 0,
    transformOrigin: initialGeometry ? initialGeometry.transformOrigin : FALLBACK_ORIGIN,
    force3D: true
  });

  // Set up scroll-zoom animation immediately
  setTimeout(() => {
    const isMobile = window.innerWidth <= 640;
    const finalScale = isMobile ? 180 : 90;

    const heroContainerEl = document.querySelector(".hero-blastoise-container");
    const geometry = computeZoomGeometry() || { transformOrigin: FALLBACK_ORIGIN, translation: { x: 0, y: 0 } };

    gsap.set(heroWrapper, {
      transformOrigin: geometry.transformOrigin,
      force3D: true,
      scale: 1,
      x: 0,
      y: 0
    });

    const heroTitleOverlay = document.querySelector("#hero-title-overlay");
    const setHeroHidden = (hidden) => {
      heroSection.style.opacity = hidden ? "0" : "1";
      heroSection.style.visibility = hidden ? "hidden" : "visible";
    };
    if (heroTitleOverlay) {
      gsap.set(heroTitleOverlay, { opacity: 1 });
    }
    let zoomAnimation;
    zoomAnimation = gsap.to(heroWrapper, {
      scale: finalScale,
      x: geometry.translation.x,
      y: geometry.translation.y,
      ease: "power2.in",
      force3D: true,
      scrollTrigger: {
        trigger: heroSection,
        start: "top top",
        end: () => `+=${window.innerHeight * (window.innerWidth <= 640 ? 1.1 : 1.2)}`,
        scrub: 0.1,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: function(self) {
          if (!heroTitleOverlay) return;
          const p = Math.max(0, Math.min(1, self.progress || 0));
          const fadeStart = 0.72;
          const titleOpacity = p <= fadeStart ? 1 : Math.max(0, 1 - (p - fadeStart) / (1 - fadeStart));
          heroTitleOverlay.style.opacity = titleOpacity;
        },
        onLeave: function() {
          setHeroHidden(true);
          if (playEntryReveal) playEntryReveal();
        },
        onEnterBack: function() {
          setHeroHidden(false);
          if (resetEntryReveal) resetEntryReveal();
        },
        // Recalculate origin, translation, and scale on resize for full responsiveness
        onRefresh: function() {
          const g = computeZoomGeometry();
          if (!g) return;
          gsap.set(heroWrapper, {
            transformOrigin: g.transformOrigin,
            force3D: true,
            scale: 1,
            x: 0,
            y: 0
          });
          if (zoomAnimation) {
            zoomAnimation.vars.x = g.translation.x;
            zoomAnimation.vars.y = g.translation.y;
            zoomAnimation.vars.scale = window.innerWidth <= 640 ? 180 : 90;
            zoomAnimation.invalidate();
          }
        },
      }
    });

    if (heroContainerEl) {
      heroContainerEl.style.zIndex = "20";
    }

    ScrollTrigger.refresh();
  }, 100);
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

  const heroBlastoise = document.querySelector("#hero-blastoise");
  if (!heroBlastoise) {
    return;
  }

  if (!heroBlastoise.complete || heroBlastoise.naturalWidth === 0) {
    heroBlastoise.addEventListener("load", init, { once: true });
    return;
  }

  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  if (heroTitleOverlay) {
    gsap.set(heroTitleOverlay, { opacity: 1, x: 0, y: 0 });
  }

  initBlastoiseHero();
  initEntryReveal();
  ScrollTrigger.refresh();
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
