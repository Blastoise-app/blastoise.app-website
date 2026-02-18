// Global locomotive scroll instance
let locoScroll;
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function loco(){
    gsap.registerPlugin(ScrollTrigger);

// Using Locomotive Scroll from Locomotive https://github.com/locomotivemtl/locomotive-scroll

// Wait for DOM to be fully loaded and content to be measured
setTimeout(() => {
  const mainEl = document.querySelector("#main");
  if (mainEl) {
    // CRITICAL: Ensure we start at the top before initializing Locomotive Scroll
    mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
    
    // CRITICAL: Force #main to be visible BEFORE initializing Locomotive Scroll
    // Locomotive Scroll sets opacity: 0 during initialization, which hides everything
    mainEl.style.setProperty("opacity", "1", "important");
    mainEl.style.setProperty("pointer-events", "auto", "important");
    
    // CRITICAL: Ensure main element can scroll BEFORE initializing Locomotive Scroll
    // Remove any transforms or styles that might prevent scrolling
    mainEl.style.height = "";
    mainEl.style.minHeight = "";
    
    console.log("Before Locomotive Scroll - scrollHeight:", mainEl.scrollHeight, "clientHeight:", mainEl.clientHeight);
    
    locoScroll = new LocomotiveScroll({
      el: mainEl,
      smooth: true,
      multiplier: 1,
      class: "is-revealed",
      smoothMobile: true,
      // Always boot from top so ScrollTrigger progress starts at 0.
      resetNativeScroll: true,
      inertia: 0.5 // Add some inertia for smoother feel
    });
    
    // Keep scrolling enabled; animation setup handles image readiness independently.
      mainEl.classList.add("scroll-enabled");
      mainEl.style.overflowY = "scroll";
    
    console.log("Locomotive Scroll initialized:", locoScroll);
    
    // CRITICAL: Force Locomotive Scroll to update multiple times to ensure scrolling works
    setTimeout(() => {
      if (locoScroll) {
        locoScroll.update();
        console.log("After first update - scrollHeight:", mainEl.scrollHeight, "clientHeight:", mainEl.clientHeight);
      }
    }, 100);
    
    setTimeout(() => {
      if (locoScroll) {
        locoScroll.update();
        console.log("After second update - scrollHeight:", mainEl.scrollHeight, "clientHeight:", mainEl.clientHeight);
        console.log("Locomotive Scroll scroll instance:", locoScroll.scroll?.instance);
      }
    }, 500);
    
    // CRITICAL: Immediately force #main to be visible after Locomotive Scroll initialization
    // Locomotive Scroll may set opacity: 0 during initialization
    mainEl.style.setProperty("opacity", "1", "important");
    mainEl.style.setProperty("pointer-events", "auto", "important");
    
    // CRITICAL: Exclude hero image from Locomotive Scroll transforms
    // This prevents Locomotive Scroll from moving/hiding it
    setTimeout(() => {
      const heroBlastoise = document.querySelector("#hero-blastoise");
      const heroContainer = document.querySelector(".hero-blastoise-container");
      const heroSection = document.querySelector("#section-hero");
      
      // Ensure hero section is marked as a scroll section
      // Remove data-scroll attributes that interfere with ScrollTrigger
      if (heroSection) {
        heroSection.removeAttribute("data-scroll-section");
      }
      if (heroBlastoise) {
        heroBlastoise.removeAttribute("data-scroll");
        heroBlastoise.removeAttribute("data-scroll-speed");
      }
      if (heroContainer) {
        heroContainer.removeAttribute("data-scroll");
        heroContainer.removeAttribute("data-scroll-speed");
      }
      
      // Force Locomotive Scroll to update and respect our settings
      if (locoScroll) {
        locoScroll.update();
      }
    }, 100);
    
    // Aggressively pin startup scroll position to 0 to avoid restored-progress fade.
    const forceTop = () => {
      mainEl.scrollTop = 0;
      window.scrollTo(0, 0);
      locoScroll.scrollTo(0, { duration: 0, disableLerp: true });
      if (locoScroll.scroll && locoScroll.scroll.instance) {
        locoScroll.scroll.instance.scroll.y = 0;
        locoScroll.scroll.instance.scroll.x = 0;
      }
      ScrollTrigger.update();
    };
    forceTop();
    setTimeout(forceTop, 80);
    setTimeout(forceTop, 220);
    setTimeout(forceTop, 500);
    
    // CRITICAL: Watch for Locomotive Scroll ready event and ensure #main is visible
    locoScroll.on("ready", () => {
      mainEl.style.setProperty("opacity", "1", "important");
      mainEl.style.setProperty("pointer-events", "auto", "important");
      console.log("Locomotive Scroll ready - forced #main to be visible");
    });

    // Select pin behavior from the active runtime mode.
    // Locomotive smooth mode uses transforms; native mode needs fixed pinning.
    const proxyPinType = (
      (getComputedStyle(mainEl).transform && getComputedStyle(mainEl).transform !== "none") ||
      !!locoScroll?.options?.smooth ||
      !!locoScroll?.options?.smoothMobile
    ) ? "transform" : "fixed";

    // tell ScrollTrigger to use these proxy methods for the "#main" element since Locomotive Scroll is hijacking things
    ScrollTrigger.scrollerProxy("#main", {
      scrollTop(value) {
        if (arguments.length) {
          // Setting scroll position
          locoScroll.scrollTo(value, { duration: 0, disableLerp: true });
          return;
        }
        // Read scroll position from Locomotive Scroll
        // Locomotive Scroll v3.5.4 stores scroll position in scroll.instance.scroll.y
        const locoY = locoScroll?.scroll?.instance?.scroll?.y;
        if (typeof locoY === "number" && !isNaN(locoY)) {
          return Math.max(0, locoY); // Ensure non-negative
        }
        // Fallback to DOM scrollTop
        const domY = mainEl ? mainEl.scrollTop : 0;
        return Math.max(0, domY); // Ensure non-negative
      },
      scrollLeft(value) {
        return 0;
      },
      getBoundingClientRect() {
        // Return viewport dimensions - #main is the viewport container
        // For custom scrollers, this should represent the viewport
        // Use actual viewport dimensions for proper mobile support
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const vw = window.innerWidth || document.documentElement.clientWidth;
        return {
          top: 0,
          left: 0,
          width: vw,
          height: vh
        };
      },
      pinType: proxyPinType
    });
    let didInitialProxyRefresh = false;
    const runInitialProxyRefresh = () => {
      if (didInitialProxyRefresh) {
        return;
      }
      didInitialProxyRefresh = true;
      ScrollTrigger.refresh();
    };

    // each time the window updates, we should refresh ScrollTrigger and then update LocomotiveScroll. 
    ScrollTrigger.addEventListener("refresh", () => {
      if (locoScroll) {
        locoScroll.update();
      }
    });
    
    // CRITICAL: Handle window resize to update Locomotive Scroll and ScrollTrigger
    let resizeTimeout;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (locoScroll) {
          locoScroll.update();
          console.log("Window resized - Locomotive Scroll updated");
        }
        ScrollTrigger.refresh();
        console.log("Window resized - ScrollTrigger refreshed");
      }, 150); // Debounce resize events
    });

    // Single scroll update path: Locomotive drives ScrollTrigger.
    locoScroll.on("scroll", (e) => {
      // Always update ScrollTrigger when Locomotive Scroll fires scroll event
      ScrollTrigger.update();
    });
    
    // Force updates to ensure scroll is enabled
    setTimeout(() => {
      if (locoScroll) {
        locoScroll.update();
      }
    }, 200);
    
    setTimeout(() => {
      if (locoScroll) {
        locoScroll.update();
        runInitialProxyRefresh();
      }
    }, 500);
  }
}, 100);

}
loco()

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

  // Verify Locomotive Scroll is ready - wait a bit if not ready
  if (!locoScroll) {
    console.warn("Locomotive Scroll not initialized yet, retrying...");
    setTimeout(() => initBlastoiseHero(), 200);
    return;
  }

  // MUST use "#main" as scroller to match Locomotive Scroll setup
  const scroller = "#main";
  
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
        scrub: true, // Use direct scroll binding; Locomotive remains the only smoother.
        pin: true,
        pinSpacing: false,
        anticipatePin: 1,
        scroller: scroller,
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
          // Returning from entry: show hero and reset entry handoff state.
          setHeroVisibilityAtMaxZoom(false);
          setHeroBackgroundByProgress(0.98);
          updateHeroDebugStatus(hideThreshold, false);
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

// Flags to prevent multiple initializations
let blastoiseHeroInitialized = false;

// Initialize Blastoise hero AFTER Locomotive Scroll is fully set up
// Use a more reliable initialization approach
function initializeBlastoiseHeroWhenReady() {
  // Prevent multiple initializations
  if (blastoiseHeroInitialized) {
    return;
  }
  
  // Check if Locomotive Scroll is ready
  if (!locoScroll) {
    console.log("Waiting for Locomotive Scroll...");
    setTimeout(initializeBlastoiseHeroWhenReady, 100);
    return;
  }
  
  // Verify elements exist
  const heroBlastoise = document.querySelector("#hero-blastoise");
  if (!heroBlastoise) {
    console.log("Waiting for hero image...");
    setTimeout(initializeBlastoiseHeroWhenReady, 100);
    return;
  }
  
  // Verify image is loaded
  if (!heroBlastoise.complete || heroBlastoise.naturalWidth === 0) {
    console.log("Waiting for image to load...");
    heroBlastoise.onload = initializeBlastoiseHeroWhenReady;
    return;
  }
  
  console.log("All ready, initializing Blastoise hero");
  blastoiseHeroInitialized = true; // Mark as initialized
  
  // Enable scrolling now that image is loaded
  const mainEl = document.querySelector("#main");
  if (mainEl) {
    mainEl.classList.add("scroll-enabled");
    // Also enable via style to ensure it works
    mainEl.style.overflowY = "scroll";
  }
  
  // Enable Locomotive Scroll now that image is loaded
  if (locoScroll) {
    // Ensure we're at scroll position 0 before initializing animations
    locoScroll.scrollTo(0, { duration: 0, disableLerp: true });
    if (locoScroll.scroll && locoScroll.scroll.instance) {
      locoScroll.scroll.instance.scroll.y = 0;
      locoScroll.scroll.instance.scroll.x = 0;
    }
    locoScroll.start();
    locoScroll.update();
  }
  const heroTitleOverlay = document.querySelector("#hero-title-overlay");
  if (heroTitleOverlay) {
    gsap.set(heroTitleOverlay, { opacity: 1, x: 0, y: 0 });
  }
  
  // Initialize hero animations immediately - ScrollTrigger will handle timing
  console.log("Calling initBlastoiseHero...");
  initBlastoiseHero();

  // Entry section: fade in from center with scroll frozen
  initEntryReveal();
}

// Entry section: Phase 1 scroll-driven (intro), Phase 2 time-based (apps)
let playEntryReveal = null;
function initEntryReveal() {
  const introEl = document.querySelector("#entry-intro");
  const appsByBlastoiseEl = document.querySelector("#entry-apps-by-blastoise");
  const introDividerEl = document.querySelector("#entry-intro-divider");
  const introH2El = introEl ? introEl.querySelector("h2") : null;
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

  if (!introEl || !appsByBlastoiseEl || !introDividerEl || !appsEl || !locoScroll || !entrySection) {
    updateEntryDebugStatus("ERROR", "elements missing");
    return;
  }

  updateEntryDebugStatus("WAITING", "scroll frozen until hero onLeave");
  // Hide parent containers so individual children cannot flash visible.
  // CSS also sets .entry-section--intro { opacity: 0 } as a pre-JS safety net.
  gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });

  // Capturing scroll blocker — fires before Locomotive sees any wheel/touch input.
  const _blockScroll = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  const hardLockScroll = () => {
    locoScroll.stop();
    if (locoScroll.scroll && locoScroll.scroll.instance) {
      locoScroll.scroll.instance.delta.y = locoScroll.scroll.instance.scroll.y;
    }
    window.addEventListener('wheel',      _blockScroll, { passive: false, capture: true });
    window.addEventListener('touchmove',  _blockScroll, { passive: false, capture: true });
  };
  const hardUnlockScroll = () => {
    window.removeEventListener('wheel',     _blockScroll, { capture: true });
    window.removeEventListener('touchmove', _blockScroll, { capture: true });
    locoScroll.start();
  };

  let entryRevealDone = false;
  playEntryReveal = () => {
    if (entryRevealDone) return;
    entryRevealDone = true;

    // Confirm both containers are invisible before the sequence starts.
    gsap.set([introEl, appsEl], { opacity: 0, overwrite: true });

    // Hard-lock scroll for the entire reveal sequence.
    hardLockScroll();
    updateEntryDebugStatus("PHASE 1", "intro fading");

    // Phase 1: intro fades in while scroll is fully locked.
    gsap.to(introEl, {
      opacity: 1,
      duration: 2.5,
      delay: 0.6,
      ease: "power2.out",
      overwrite: true,
      onComplete: () => {
        // Phase 2: apps fade in immediately — scroll still locked.
        updateEntryDebugStatus("PHASE 2", "apps fading");
        gsap.to(appsEl, {
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          overwrite: true,
          onComplete: () => {
            // Everything visible — release the scroll lock.
            hardUnlockScroll();
            updateEntryDebugStatus("COMPLETE", "scroll enabled");
          },
        });
      },
    });

  };
}

// Start initialization after DOM is ready (single bootstrap path).
console.log("Setting up Blastoise hero initialization...");
let didBootstrapInit = false;
function bootstrapAppInit() {
  if (didBootstrapInit) {
    return;
  }
  didBootstrapInit = true;
  console.log("Bootstrapping initialization");
  setTimeout(initializeBlastoiseHeroWhenReady, 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapAppInit, { once: true });
} else {
  bootstrapAppInit();
}
