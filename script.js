// Blastoise hero - STEP 1: Just make it visible and keep it visible
function initBlastoiseHero() {
  const heroBlastoise = document.querySelector("#hero-blastoise");
  const entryPortal = document.querySelector("#entry-portal");
  const heroSection = document.querySelector("#section-hero");
  const heroRuler = document.querySelector("#hero-ruler");
  const heroHideMarker = document.querySelector("#hero-hide-marker");
  const heroDebugStatus = document.querySelector("#hero-debug-status");
  const hideThreshold = 1;
  const ensureBottomTitleVisible = () => {
    const heroTitleOverlayEl = document.querySelector("#hero-title-overlay");
    if (!heroTitleOverlayEl) {
      return;
    }
    heroTitleOverlayEl.style.opacity = "1";
    heroTitleOverlayEl.style.setProperty("visibility", "visible", "important");
    heroTitleOverlayEl.style.setProperty("display", "flex", "important");
    heroTitleOverlayEl.style.setProperty("transform", "none", "important");
  };
  
  if (!heroBlastoise || !entryPortal || !heroSection) {
    console.warn("Blastoise hero elements not found", {heroBlastoise, entryPortal, heroSection});
    return;
  }

  const renderHeroRuler = () => {
    if (!heroSection || !heroRuler) {
      return;
    }
    const sectionHeight = heroSection.offsetHeight;
    heroRuler.innerHTML = "";
    for (let offset = 0; offset <= sectionHeight; offset += 100) {
      const line = document.createElement("div");
      line.className = "hero-ruler-line";
      line.style.top = `${offset}px`;
      const label = document.createElement("span");
      label.textContent = `${offset}px`;
      line.appendChild(label);
      heroRuler.appendChild(line);
    }
  };

  const updateHeroDebugStatus = (progress, isHidden) => {
    if (!heroDebugStatus) {
      return;
    }
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const progressText = clampedProgress.toFixed(3);
    const stateText = isHidden ? "HIDDEN" : "VISIBLE";
    heroDebugStatus.textContent = `hero ${stateText} | progress ${progressText} | hide @ ${hideThreshold}`;
    heroDebugStatus.style.borderColor = isHidden ? "rgba(255, 59, 48, 0.9)" : "rgba(57, 255, 20, 0.8)";
    heroDebugStatus.style.color = isHidden ? "#ff3b30" : "#39ff14";
  };

  if (heroHideMarker) {
    heroHideMarker.style.top = `${hideThreshold * 100}%`;
    heroHideMarker.textContent = `hide threshold (${Math.round(hideThreshold * 100)}%)`;
  }
  renderHeroRuler();
  updateHeroDebugStatus(0, false);

  // Kill any existing animations
  gsap.killTweensOf(heroBlastoise);
  
  // Function to position zoom-target based on actual displayed image dimensions
  // This ensures it stays in the same spot relative to the image regardless of screen size
  function positionZoomTarget() {
    const zoomTarget = document.querySelector("#zoom-target");
    if (!zoomTarget || !heroBlastoise) {
      return;
    }

    const wrapper = heroBlastoise.parentElement; // hero-image-wrapper
    const container = wrapper.parentElement; // hero-blastoise-container
    const containerRect = container.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    const imageRect = heroBlastoise.getBoundingClientRect();
    
    // Get image natural dimensions
    const naturalWidth = heroBlastoise.naturalWidth;
    const naturalHeight = heroBlastoise.naturalHeight;
    
    if (naturalWidth === 0 || naturalHeight === 0 || wrapperRect.width === 0 || wrapperRect.height === 0) {
      console.warn("Image not loaded yet, retrying...");
      setTimeout(positionZoomTarget, 100);
      return;
    }
    
    // Calculate actual displayed image size (accounting for object-fit: contain)
    const containerAspect = containerRect.width / containerRect.height;
    const imageAspect = naturalWidth / naturalHeight;
    
    let displayedWidth, displayedHeight;
    if (containerAspect > imageAspect) {
      // Container is wider - image height fills container
      displayedHeight = containerRect.height;
      displayedWidth = displayedHeight * imageAspect;
    } else {
      // Container is taller - image width fills container
      displayedWidth = containerRect.width;
      displayedHeight = displayedWidth / imageAspect;
    }
    
    // Calculate image offset from container (accounting for actual object-position)
    const computedObjectPosition = getComputedStyle(heroBlastoise).objectPosition || "50% 50%";
    const [posXRaw, posYRaw = "50%"] = computedObjectPosition.split(" ");
    const parseObjectPosition = (value, fallback) => {
      if (!value) return fallback;
      if (value.endsWith("%")) {
        const num = parseFloat(value);
        return Number.isFinite(num) ? num / 100 : fallback;
      }
      if (value === "left" || value === "top") return 0;
      if (value === "right" || value === "bottom") return 1;
      if (value === "center") return 0.5;
      return fallback;
    };
    const objectPositionX = parseObjectPosition(posXRaw, 0.5);
    const objectPositionY = parseObjectPosition(posYRaw, 0.5);
    const imageOffsetX = containerRect.width * objectPositionX - displayedWidth * objectPositionX;
    const imageOffsetY = containerRect.height * objectPositionY - displayedHeight * objectPositionY;
    
    // Target position as a percentage of the displayed image dimensions
    const targetPercentX = 0.3765; // Calibrated shell opening target (responsive-safe baseline)
    const targetPercentY = 0.408; // Calibrated shell opening target (responsive-safe baseline)
    
    // Calculate pixel position relative to displayed image content
    const targetOffsetX = displayedWidth * targetPercentX;
    const targetOffsetY = displayedHeight * targetPercentY;
    
    // Position relative to container (where displayed image content actually is)
    const targetXInContainer = imageOffsetX + targetOffsetX;
    const targetYInContainer = imageOffsetY + targetOffsetY;
    
    // Convert container-relative position to wrapper-relative percentage
    // The wrapper is the same size as the container and centered
    const targetXRelativeToWrapper = targetXInContainer - (wrapperRect.left - containerRect.left);
    const targetYRelativeToWrapper = targetYInContainer - (wrapperRect.top - containerRect.top);
    
    // Convert to percentage of wrapper dimensions (which match image element dimensions)
    const percentX = (targetXRelativeToWrapper / wrapperRect.width) * 100;
    const percentY = (targetYRelativeToWrapper / wrapperRect.height) * 100;
    
    // Set position as percentage relative to wrapper (which will scale with image)
    zoomTarget.style.left = `${Math.max(0, Math.min(100, percentX))}%`;
    zoomTarget.style.top = `${Math.max(0, Math.min(100, percentY))}%`;
    
    console.log("Zoom target positioned:", {
      containerSize: { width: containerRect.width, height: containerRect.height },
      wrapperSize: { width: wrapperRect.width, height: wrapperRect.height },
      displayedImageSize: { width: displayedWidth, height: displayedHeight },
      imageOffset: { x: imageOffsetX, y: imageOffsetY },
      targetPercent: { x: targetPercentX, y: targetPercentY },
      targetPositionPercent: { x: percentX, y: percentY },
      naturalDimensions: { width: naturalWidth, height: naturalHeight }
    });
  }
  
  // Function to calculate wrapper-relative transform origin percentage
  // Returns percentages relative to the wrapper element (which we're scaling)
  // Uses the zoom-target's CSS position directly (since it's positioned as percentages)
  function calculateImageRelativeTransformOrigin() {
    const zoomTarget = document.querySelector("#zoom-target");
    if (!zoomTarget || !heroBlastoise) {
      // Fallback: use calibrated position
      return "37.65% 40.8%";
    }
    
    // The zoom-target is positioned as percentages relative to the wrapper
    // Since it has transform: translate(-50%, -50%), its center is at the left/top position
    // So we can use those percentages directly as the transform origin
    const leftPercent = parseFloat(zoomTarget.style.left) || 0;
    const topPercent = parseFloat(zoomTarget.style.top) || 0;
    
    // If the zoom-target hasn't been positioned yet, use fallback
    if (leftPercent === 0 && topPercent === 0 && !zoomTarget.style.left && !zoomTarget.style.top) {
      return "37.65% 40.8%";
    }
    
    return `${leftPercent}% ${topPercent}%`;
  }

  // Move the zoom target to viewport center during the zoom so it feels like
  // the camera is entering the shell instead of only scaling in place.
  function calculateCenteringTranslation() {
    const zoomTarget = document.querySelector("#zoom-target");
    const heroWrapperEl = heroBlastoise.parentElement;
    if (!zoomTarget || !heroWrapperEl) {
      return { x: 0, y: 0 };
    }

    const targetRect = zoomTarget.getBoundingClientRect();
    if (!targetRect.width || !targetRect.height) {
      return { x: 0, y: 0 };
    }

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    return {
      x: viewportCenterX - targetCenterX,
      y: viewportCenterY - targetCenterY
    };
  }
  
  // Position zoom-target initially and on resize
  positionZoomTarget();
  window.addEventListener('resize', () => {
    positionZoomTarget();
  });
  
  // Position hero title overlay text - DISABLED: text stays fixed, only fades
  // Text is now position: fixed with bottom: 8%, so it doesn't move
  function positionBottomText() {
    // Do nothing - text position is fixed via CSS
    // This function is kept for compatibility but doesn't move the text
    return;
  }
  
  // Position text initially and on resize
  if (heroBlastoise.complete) {
    positionBottomText();
  } else {
    heroBlastoise.addEventListener('load', positionBottomText);
  }
  window.addEventListener('resize', () => {
    positionBottomText();
  });
  
  // Also update position during scroll (in case image moves)
  ScrollTrigger.addEventListener("refresh", positionBottomText);
  
  // Get the wrapper element (contains both image and zoom-target)
  const heroWrapper = heroBlastoise.parentElement; // hero-image-wrapper
  
  // Set initial state with image-relative transform origin
  const initialTransformOrigin = calculateImageRelativeTransformOrigin();
  gsap.set(heroWrapper, {
    scale: 1,
    x: 0,
    y: 0,
    transformOrigin: initialTransformOrigin,
    force3D: true // Enable GPU acceleration from the start
  });
  
  console.log("Initial transform origin (image-relative):", initialTransformOrigin);
  
  // Set up scroll-zoom animation immediately
  setTimeout(() => {
    // Verify elements exist
    if (!heroSection || !heroBlastoise) {
      console.error("Missing elements for animation setup!");
      return;
    }
    
    // Determine final zoom level.
    const isMobile = window.innerWidth <= 640;
    const finalScale = isMobile ? 180 : 90;
    
    // Get the wrapper element (contains both image and zoom-target)
    const heroWrapper = heroBlastoise.parentElement; // hero-image-wrapper
    const heroContainerEl = document.querySelector(".hero-blastoise-container");
    
    // Calculate translation once at start (before scaling) based on initial dimensions
    // We'll use transform-origin at the pink square AND translate to center it
    const transformOrigin = calculateImageRelativeTransformOrigin();
    
    // Set transform origin to zoom around the pink square
    gsap.set(heroWrapper, { 
      transformOrigin: transformOrigin, 
      force3D: true,
      scale: 1,
      x: 0,
      y: 0
    });

    // Ensure zoom target is positioned and then calculate a screen-accurate
    // translation to place the target center at viewport center.
    positionZoomTarget();
    const initialTranslation = calculateCenteringTranslation();
    console.log("Animation transform origin (image-relative):", transformOrigin);
    console.log("Initial translation calculated:", initialTranslation);
    console.log("Hero wrapper element:", heroWrapper);
    console.log("Final scale:", finalScale);
    
    // Create zoom animation using normalized scroll progress (0 → 1)
    // Animation progresses based on how far user scrolls through the section
    // Scale the wrapper so both image and zoom-target scale together
    // Translate to center the pink target as we zoom
    const heroTitleOverlay = document.querySelector("#hero-title-overlay");
    const setHeroVisibilityAtMaxZoom = (shouldHide) => {
      if (shouldHide) {
        heroSection.style.setProperty("opacity", "0", "important");
        heroSection.style.setProperty("visibility", "hidden", "important");
        heroSection.style.pointerEvents = "none";
        if (heroContainerEl) {
          heroContainerEl.style.setProperty("opacity", "0", "important");
          heroContainerEl.style.setProperty("visibility", "hidden", "important");
          heroContainerEl.style.pointerEvents = "none";
        }
        if (heroTitleOverlay) {
          heroTitleOverlay.style.setProperty("opacity", "0", "important");
          heroTitleOverlay.style.setProperty("visibility", "hidden", "important");
        }
        return;
      }
      heroSection.style.setProperty("opacity", "1", "important");
      heroSection.style.setProperty("visibility", "visible", "important");
      heroSection.style.pointerEvents = "none";
      if (heroContainerEl) {
        heroContainerEl.style.setProperty("opacity", "1", "important");
        heroContainerEl.style.setProperty("visibility", "visible", "important");
        heroContainerEl.style.pointerEvents = "none";
      }
      if (heroTitleOverlay) {
        heroTitleOverlay.style.setProperty("opacity", "1", "important");
        heroTitleOverlay.style.setProperty("visibility", "visible", "important");
      }
    };
    const setHeroBackgroundByProgress = (progress) => {
      const handoffProgress = gsap.utils.clamp(0, 1, (progress - 0.9) / 0.1);
      const bgColor = gsap.utils.interpolate("#2d0000", "#000000", handoffProgress);
      heroSection.style.backgroundColor = bgColor;
      if (heroContainerEl) {
        heroContainerEl.style.setProperty("background-color", bgColor, "important");
      }
    };
    if (heroTitleOverlay) {
      gsap.set(heroTitleOverlay, { opacity: 1, x: 0, y: 0 });
    }
    ensureBottomTitleVisible();
    let zoomAnimation;
    zoomAnimation = gsap.to(heroWrapper, {
      scale: finalScale,
      x: initialTranslation.x,
      y: initialTranslation.y,
      ease: "none", // No easing for direct scroll-to-scale mapping
      force3D: true, // Enable GPU acceleration for smoother performance
      scrollTrigger: {
        trigger: heroSection, // Trigger on the scrolling section
        start: "top top", // When section enters viewport
        end: () => {
          // Keep pinning active for the full hero section so onLeave lines up
          // with the real end of #section-hero.
          const heroSectionHeight = heroSection.offsetHeight;
          console.log("Calculating end - heroSectionHeight:", heroSectionHeight, "scrollDistance:", heroSectionHeight);
          return `+=${heroSectionHeight}`;
        },
        scrub: 0.5,
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        markers: false, // Set to true for debugging
        onUpdate: function(self) {
          const rawProgress = (self && typeof self.progress === "number" && Number.isFinite(self.progress))
            ? self.progress
            : 0;
          const p = Math.max(0, Math.min(1, rawProgress));
          if (heroContainerEl) {
            heroContainerEl.style.zIndex = "20";
          }
          if (heroTitleOverlay) {
            const fadeStart = 0.72;
            const fadeProgress = p <= fadeStart
              ? 0
              : (p - fadeStart) / (1 - fadeStart);
            const titleOpacity = Math.max(0, Math.min(1, 1 - fadeProgress));
            gsap.set(heroTitleOverlay, { opacity: titleOpacity, x: 0, y: 0 });
          }
          setHeroBackgroundByProgress(p);
          setHeroVisibilityAtMaxZoom(false);
          updateHeroDebugStatus(p, false);
        },
        onEnter: function() {
          setHeroVisibilityAtMaxZoom(false);
          setHeroBackgroundByProgress(0);
          updateHeroDebugStatus(0, false);
          console.log("Zoom animation entered - start:", this.start, "end:", this.end);
          // Ensure hero container is visible when animation starts
          if (heroContainerEl) {
            heroContainerEl.style.opacity = "1";
            heroContainerEl.style.visibility = "visible";
            heroContainerEl.style.zIndex = "20";
          }
          const heroTitleOverlay = document.querySelector("#hero-title-overlay");
          if (heroTitleOverlay) {
            gsap.set(heroTitleOverlay, { opacity: 1, x: 0, y: 0 });
          }
          ensureBottomTitleVisible();
        },
        onLeave: function() {
          // Max zoom reached: hide hero layer and hand off to entry section.
          console.log("HERO onLeave FIRED");
          setHeroVisibilityAtMaxZoom(true);
          setHeroBackgroundByProgress(1);
          updateHeroDebugStatus(1, true);
          if (playEntryReveal) {
            playEntryReveal();
          }
        },
        onEnterBack: function() {
          // Returning from entry: show hero and reset entry reveal so it replays on next forward scroll.
          setHeroVisibilityAtMaxZoom(false);
          setHeroBackgroundByProgress(0.98);
          updateHeroDebugStatus(hideThreshold, false);
          if (resetEntryReveal) {
            resetEntryReveal();
          }
        },
        // Recalculate everything on resize for full responsiveness
        onRefresh: function(self) {
          const newOrigin = calculateImageRelativeTransformOrigin();
          const heroWrapper = heroBlastoise.parentElement; // hero-image-wrapper
          gsap.set(heroWrapper, {
            transformOrigin: newOrigin,
            force3D: true,
            scale: 1,
            x: 0,
            y: 0
          });
          positionZoomTarget(); // Reposition debug box
          // Recalculate translation for new dimensions
          const newTranslation = calculateCenteringTranslation();
          if (zoomAnimation) {
            zoomAnimation.vars.x = newTranslation.x;
            zoomAnimation.vars.y = newTranslation.y;
          }
          // Recalculate scale for mobile/desktop on resize
          // Use more reliable mobile detection
          const isMobileNow = window.innerWidth <= 640 || 
                             (window.matchMedia && window.matchMedia('(max-width: 640px)').matches);
          const newFinalScale = isMobileNow ? 180 : 90;
          if (zoomAnimation) {
            zoomAnimation.vars.scale = newFinalScale;
            zoomAnimation.invalidate();
          }
          if (self && self.start !== undefined && self.end !== undefined) {
            console.log("Zoom animation refreshed - start:", self.start, "end:", self.end, "mobile:", isMobileNow);
            // Validate end is positive
            if (self.end <= self.start) {
              console.error("Invalid ScrollTrigger end value - end must be > start");
            }
          }
          renderHeroRuler();
          if (heroHideMarker) {
            heroHideMarker.style.top = `${hideThreshold * 100}%`;
          }
        },
      }
    });
    
    // Reset text/image layering when the zoom trigger is recreated.
    const heroContainer = document.querySelector(".hero-blastoise-container");
    if (heroContainer) {
      heroContainer.style.zIndex = "20";
    }
    
    console.log("Zoom animation created:", zoomAnimation);
    console.log("ScrollTrigger instance:", zoomAnimation.scrollTrigger);
    
    // Handle window resize - recalculate transform origin
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newOrigin = calculateImageRelativeTransformOrigin();
        gsap.set(heroWrapper, { transformOrigin: newOrigin, force3D: true });
        console.log("Transform origin updated on resize:", newOrigin);
        ScrollTrigger.refresh();
      }, 250);
    });
    
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
  const entryDebugStatus = document.querySelector("#entry-debug-status");

  const updateEntryDebugStatus = (state, detail = "") => {
    if (!entryDebugStatus) return;
    const text = detail ? `entry ${state} | ${detail}` : `entry ${state}`;
    entryDebugStatus.textContent = text;
    const isComplete = state === "COMPLETE";
    entryDebugStatus.style.borderColor = isComplete ? "rgba(57, 255, 20, 0.8)" : "rgba(0, 174, 255, 0.8)";
    entryDebugStatus.style.color = isComplete ? "#39ff14" : "#00aeff";
  };

  if (!introEl || !appsByBlastoiseEl || !introDividerEl || !appsEl || !entrySection) {
    updateEntryDebugStatus("ERROR", "elements missing");
    return;
  }

  updateEntryDebugStatus("WAITING", "hero onLeave pending");
  gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });

  resetEntryReveal = () => {
    entryRevealDone = false;
    gsap.killTweensOf([introEl, appsEl]);
    gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });
    updateEntryDebugStatus("WAITING", "hero onLeave pending");
  };

  playEntryReveal = () => {
    if (entryRevealDone) return;
    entryRevealDone = true;

    gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });
    updateEntryDebugStatus("PHASE 1", "intro fading");

    gsap.to(introEl, {
      opacity: 1,
      duration: 1.2,
      delay: 0.3,
      ease: "power2.out",
      overwrite: true,
      onComplete: () => {
        updateEntryDebugStatus("PHASE 2", "apps fading");
        gsap.to(appsEl, {
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            updateEntryDebugStatus("COMPLETE");
          },
        });
      },
    });
  };
}

function init() {
  gsap.registerPlugin(ScrollTrigger);
  window.scrollTo(0, 0);

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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
