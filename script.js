// Global locomotive scroll instance
let locoScroll;
let heroZoomComplete = false;

function loco(){
  gsap.registerPlugin(ScrollTrigger);

  const mainEl = document.querySelector("#main");
  if (!mainEl) {
    console.warn("Locomotive Scroll init skipped: #main not found");
    return;
  }

  if (locoScroll) {
    locoScroll.update();
    ScrollTrigger.refresh();
    return;
  }

  locoScroll = new LocomotiveScroll({
    el: mainEl,
    smooth: true,
    multiplier: 1,
    class: "is-revealed",
    smoothMobile: false,
    resetNativeScroll: false,
    inertia: 0.5
  });

  locoScroll.on("scroll", ScrollTrigger.update);

  ScrollTrigger.scrollerProxy("#main", {
    scrollTop(value) {
      if (arguments.length) {
        locoScroll.scrollTo(value, { duration: 0, disableLerp: true });
        return;
      }
      return locoScroll.scroll?.instance?.scroll?.y ?? mainEl.scrollTop;
    },
    scrollLeft() {
      return 0;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };
    },
    pinType: "transform"
  });

  ScrollTrigger.addEventListener("refresh", () => {
    if (locoScroll) {
      locoScroll.update();
    }
  });

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (locoScroll) {
        locoScroll.update();
      }
      ScrollTrigger.refresh();
    }, 150);
  });

  ScrollTrigger.refresh();

}

// Blastoise hero - STEP 1: Just make it visible and keep it visible
function initBlastoiseHero() {
  const heroBlastoise = document.querySelector("#hero-blastoise");
  const entryPortal = document.querySelector("#entry-portal");
  const page1 = document.querySelector("#page1");
  
  if (!heroBlastoise || !entryPortal || !page1) {
    console.warn("Blastoise hero elements not found", {heroBlastoise, entryPortal, page1});
    return;
  }

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

    const container = heroBlastoise.parentElement; // hero-blastoise-container
    const containerRect = container.getBoundingClientRect();
    
    // Get image natural dimensions
    const naturalWidth = heroBlastoise.naturalWidth;
    const naturalHeight = heroBlastoise.naturalHeight;
    
    if (naturalWidth === 0 || naturalHeight === 0) {
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
    
    // Calculate image offset from container center (image is centered)
    const imageOffsetX = (containerRect.width - displayedWidth) / 2;
    const imageOffsetY = (containerRect.height - displayedHeight) / 2;
    
    // Target position as a percentage of the displayed image dimensions
    // These values need to be calibrated based on where the black spot actually is
    // The black spot is in the black space under the left cannon
    // Based on visual inspection, it's approximately:
    // - Around 30-35% from the left edge of the displayed image
    // - Around 45-50% from the top edge of the displayed image
    // We'll start with conservative estimates and adjust
    
    // Zoom target position: image-relative percentages
    const targetPercentX = 0.376; // 37.6% from left of image (moved left slightly)
    const targetPercentY = 0.408; // 40.8% from top of image (keep Y position)
    
    // Calculate pixel position relative to displayed image
    const targetOffsetX = displayedWidth * targetPercentX;
    const targetOffsetY = displayedHeight * targetPercentY;
    
    // Position relative to container (accounting for image centering)
    // Center the zoom-target box on the target point
    const targetX = imageOffsetX + targetOffsetX - (zoomTarget.offsetWidth / 2);
    const targetY = imageOffsetY + targetOffsetY - (zoomTarget.offsetHeight / 2);
    
    // Ensure position is within bounds
    const finalX = Math.max(0, Math.min(targetX, containerRect.width - zoomTarget.offsetWidth));
    const finalY = Math.max(0, Math.min(targetY, containerRect.height - zoomTarget.offsetHeight));
    
    // Set position
    zoomTarget.style.left = `${finalX}px`;
    zoomTarget.style.top = `${finalY}px`;
    
    console.log("Zoom target positioned:", {
      containerSize: { width: containerRect.width, height: containerRect.height },
      displayedImageSize: { width: displayedWidth, height: displayedHeight },
      imageOffset: { x: imageOffsetX, y: imageOffsetY },
      targetPercent: { x: targetPercentX, y: targetPercentY },
      targetPosition: { x: finalX, y: finalY },
      naturalDimensions: { width: naturalWidth, height: naturalHeight }
    });
  }
  
  // Function to calculate image-relative transform origin percentage
  // Returns percentages relative to the image itself (not screen coordinates)
  function calculateImageRelativeTransformOrigin() {
    const zoomTarget = document.querySelector("#zoom-target");
    if (!zoomTarget) {
      // Fallback: use calibrated position in black space under left cannon
      return "37.6% 40.8%";
    }
    
    // Get image's actual displayed dimensions (accounting for object-fit: contain)
    const imageRect = heroBlastoise.getBoundingClientRect();
    const targetRect = zoomTarget.getBoundingClientRect();
    
    // Calculate target center relative to image element's bounding box
    const targetCenterX = targetRect.left + targetRect.width / 2 - imageRect.left;
    const targetCenterY = targetRect.top + targetRect.height / 2 - imageRect.top;
    
    // Convert to percentage relative to image element dimensions
    // This is image-relative, not screen-relative
    const originX = (targetCenterX / imageRect.width) * 100;
    const originY = (targetCenterY / imageRect.height) * 100;
    
    return `${Math.max(0, Math.min(100, originX))}% ${Math.max(0, Math.min(100, originY))}%`;
  }
  
  // Position zoom-target initially and on resize
  positionZoomTarget();
  window.addEventListener('resize', () => {
    positionZoomTarget();
  });
  
  // Set initial state with image-relative transform origin
  const initialTransformOrigin = calculateImageRelativeTransformOrigin();
  gsap.set(heroBlastoise, {
    scale: 1,
    x: 0,
    y: 0,
    transformOrigin: initialTransformOrigin
  });
  
  console.log("Initial transform origin (image-relative):", initialTransformOrigin);
  
  // Set up scroll-zoom animation immediately
  setTimeout(() => {
    // Verify elements exist
    if (!page1 || !heroBlastoise) {
      console.error("Missing elements for animation setup!");
      return;
    }
    
    // Recalculate transform origin to ensure it's accurate
    const transformOrigin = calculateImageRelativeTransformOrigin();
    gsap.set(heroBlastoise, { transformOrigin: transformOrigin });
    console.log("Animation transform origin (image-relative):", transformOrigin);
    
    // Calculate section height for normalized scroll progress
    const sectionHeight = page1.offsetHeight;
    
    // Create zoom animation using normalized scroll progress (0 → 1)
    // Animation progresses based on how far user scrolls through the section
    // NO x/y translations - zoom happens at transform-origin point (image-relative)
    const zoomAnimation = gsap.to(heroBlastoise, {
      scale: 120, // Final zoom level
      // NO x/y translations - zoom happens at transform-origin point
      ease: "power1.out", // Smooth easing instead of "none" for controlled animation
      scrollTrigger: {
        trigger: page1,
        start: "top top", // When section enters viewport
        end: () => `+=${sectionHeight * 2}`, // End after scrolling 2x section height (normalized to section)
        scrub: 1.5, // Smooth scrubbing with interpolation (higher = smoother, slower response)
        scroller: scroller,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (!heroZoomComplete && self.progress >= 1) {
            heroZoomComplete = true;
            document.body.classList.add("hero-zoom-complete");
            if (locoScroll) {
              locoScroll.update();
            }
            ScrollTrigger.refresh();
          }
        },
        // Recalculate everything on resize for full responsiveness
        onRefresh: function() {
          const newOrigin = calculateImageRelativeTransformOrigin();
          gsap.set(heroBlastoise, { transformOrigin: newOrigin });
          positionZoomTarget(); // Reposition debug box
          // Update end point based on new section height
          this.end = `+=${page1.offsetHeight * 2}`;
        },
      }
    });
    
    // Pin page1 AFTER creating the zoom animation
    // This way the zoom animation calculates start position before pin spacing exists
    // Match the end distance to the zoom animation (normalized to section)
    ScrollTrigger.create({
      trigger: page1,
      start: "top top",
      end: () => `+=${sectionHeight * 2}`, // Match zoom animation end distance (normalized to section)
      pin: true,
      pinSpacing: true,
      scroller: scroller,
      invalidateOnRefresh: true,
      onRefresh: function() {
        // Update end point based on new section height
        this.end = `+=${page1.offsetHeight * 2}`;
      }
    });
    
    // Force ScrollTrigger to recognize we're at the start position
    setTimeout(() => {
      ScrollTrigger.refresh();
      const st = zoomAnimation.scrollTrigger;
      if (st) {
        st.update();
        const mainEl = document.querySelector("#main");
        const currentScroll = mainEl ? mainEl.scrollTop : 0;
        // Log the actual start/end positions for debugging
        console.log("ScrollTrigger start:", st.start, "end:", st.end, "current scroll:", currentScroll);
        console.log("ScrollTrigger progress:", st.progress, "isActive:", st.isActive);
        
        // If we're already past the start position (shouldn't happen, but just in case)
        // or if progress is 0 but we should be active, force an update
        if (currentScroll >= st.start && st.progress === 0) {
          console.log("Forcing ScrollTrigger to recognize start position");
          st.update();
        }
      }
    }, 200);
    
    // Also update immediately after creation
    setTimeout(() => {
      ScrollTrigger.update();
    }, 100);
    
    console.log("Zoom animation created:", zoomAnimation);
    console.log("ScrollTrigger instance:", zoomAnimation.scrollTrigger);
    
    // Handle window resize - recalculate transform origin
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const newOrigin = calculateImageRelativeTransformOrigin();
        gsap.set(heroBlastoise, { transformOrigin: newOrigin });
        console.log("Transform origin updated on resize:", newOrigin);
        ScrollTrigger.refresh();
      }, 250);
    });
    
    ScrollTrigger.refresh();
  }, 100);
}

// Flags to prevent multiple initializations
let blastoiseHeroInitialized = false;
let entrySectionsInitialized = false;

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
  
  // Ensure Locomotive Scroll is updated (but don't force scroll position)
  locoScroll.update();
  ScrollTrigger.refresh();
  
  // Initialize hero animations
  initBlastoiseHero();
}

// Initialize entry sections independently of hero image loading
function initializeEntrySectionsWhenReady() {
  if (entrySectionsInitialized) {
    return;
  }

  if (!locoScroll) {
    console.log("Waiting for Locomotive Scroll for entry sections...");
    setTimeout(initializeEntrySectionsWhenReady, 100);
    return;
  }

  entrySectionsInitialized = true;
  initEntrySections();
}

// Animate entry sections to reveal them on scroll
function initEntrySections() {
  const entrySections = document.querySelectorAll(".entry-section");
  const scroller = "#main";
  
  if (entrySections.length === 0) {
    console.warn("No entry sections found");
    return;
  }
  
  console.log(`Found ${entrySections.length} entry sections`);
  
  // Find "Enter the Shell" section (first one)
  const enterShellSection = entrySections[0];
  const blastoiseAppSection = entrySections[1];
  const otherSections = Array.from(entrySections).slice(2);
  
  if (!enterShellSection) {
    console.warn("Enter the Shell section not found");
    return;
  }
  if (!blastoiseAppSection) {
    console.warn("blastoise.app section not found");
    return;
  }
  
  console.log("Enter the Shell section found:", enterShellSection);
  
  window.enterShellSection = enterShellSection;
  
  // Set initial state - hidden
  gsap.set(enterShellSection, {
    opacity: 0,
    y: 50,
    visibility: "hidden"
  });

  // Debug UI: mark the trigger start line (top center)
  const triggerMarkerId = "enter-shell-trigger-marker";
  const mainScrollEl = document.querySelector("#main");
  if (mainScrollEl) {
    let marker = document.getElementById(triggerMarkerId);
    if (!marker) {
      marker = document.createElement("div");
      marker.id = triggerMarkerId;
      marker.textContent = "Enter the Shell trigger (top center)";
    }
    if (marker.parentElement !== mainScrollEl) {
      mainScrollEl.appendChild(marker);
    }
    const updateMarkerPosition = () => {
      const scrollY = locoScroll?.scroll?.instance?.scroll?.y ?? mainScrollEl.scrollTop;
      marker.style.top = `${scrollY + (window.innerHeight / 2)}px`;
    };
    updateMarkerPosition();
    if (locoScroll) {
      locoScroll.on("scroll", updateMarkerPosition);
    }
    window.addEventListener("resize", updateMarkerPosition);
  }
  
  // Fade in when the bottom of the section reaches the viewport bottom
  const enterShellFade = gsap.to(enterShellSection, {
    opacity: 1,
    y: 0,
    visibility: "visible",
    duration: 1,
    ease: "power2.out",
    paused: true
  });

  const mainEl = document.querySelector("#main");
  let enterShellRevealed = false;
  const checkEnterShellReveal = () => {
    if (enterShellRevealed || !heroZoomComplete) {
      return;
    }
    const rect = enterShellSection.getBoundingClientRect();
    if (rect.bottom <= window.innerHeight) {
      enterShellRevealed = true;
      enterShellFade.play();
      console.log("Enter the Shell - fade animation started");
    }
  };
  checkEnterShellReveal();
  if (locoScroll) {
    locoScroll.on("scroll", checkEnterShellReveal);
  }
  window.addEventListener("resize", checkEnterShellReveal);
  
  // Prepare blastoise.app + remaining sections as hidden
  gsap.set([blastoiseAppSection, ...otherSections], {
    opacity: 0,
    y: 50,
    visibility: "hidden"
  });

  // Fade in blastoise.app when it enters, then reveal all remaining sections
  const blastoiseAppFade = gsap.to(blastoiseAppSection, {
    opacity: 1,
    y: 0,
    visibility: "visible",
    duration: 1,
    ease: "power2.out",
    paused: true
  });

  ScrollTrigger.create({
    trigger: blastoiseAppSection,
    scroller: scroller,
    start: "top 85%",
    end: "top 85%",
    once: true,
    onEnter: () => {
      blastoiseAppFade.play();
      gsap.set(otherSections, {
        opacity: 1,
        y: 0,
        visibility: "visible"
      });
      console.log("blastoise.app - fade animation started; remaining sections revealed");
    }
  });
  
  // Refresh ScrollTrigger after creating animations
  ScrollTrigger.refresh();
}

// Start initialization after DOM is ready
console.log("Setting up Blastoise hero initialization...");

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired, starting initialization");
    loco();
    setTimeout(initializeBlastoiseHeroWhenReady, 500);
    setTimeout(initializeEntrySectionsWhenReady, 500);
  });
} else {
  console.log("DOM already loaded, starting initialization");
  loco();
  setTimeout(initializeBlastoiseHeroWhenReady, 500);
  setTimeout(initializeEntrySectionsWhenReady, 500);
}

// Also try on window load as backup
window.addEventListener('load', () => {
  console.log("Window load fired, starting initialization");
  setTimeout(initializeBlastoiseHeroWhenReady, 300);
  setTimeout(initializeEntrySectionsWhenReady, 300);
});

var clutter= "";
const page2Title = document.querySelector("#page2>h1");
if (page2Title) {
  page2Title.textContent.split(" ").forEach(function(dets){
      clutter += `<span> ${dets} </span>`

      page2Title.innerHTML = clutter;
  })

  gsap.to("#page2>h1>span",{
      scrollTrigger:{
          trigger:`#page2>h1>span`,
          start:`top bottom`,
          end:`bottom top`,
          scroller:`#main`,
          scrub:.5,
      },
      stagger:.2,
      color:`#fff`
  })
} else {
  console.warn("Skipping #page2>h1 animation: element not found");
}


function canvas(){
  const canvas = document.querySelector("#page3>canvas");
  if (!canvas) {
    console.warn("Skipping #page3 canvas animation: canvas not found");
    return;
  }
  const context = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
});

function files(index) {
  var data = `
  assets/images/frames00007.png
  assets/images/frames00013.png
  assets/images/frames00010.png
  assets/images/frames00016.png
  assets/images/frames00019.png
  assets/images/frames00022.png
  assets/images/frames00025.png
  assets/images/frames00028.png
  assets/images/frames00031.png
  assets/images/frames00034.png
  assets/images/frames00037.png
  assets/images/frames00040.png
  assets/images/frames00043.png
  assets/images/frames00046.png
  assets/images/frames00049.png
  assets/images/frames00052.png
  assets/images/frames00055.png
  assets/images/frames00058.png
  assets/images/frames00061.png
  assets/images/frames00064.png
  assets/images/frames00067.png
  assets/images/frames00070.png
  assets/images/frames00073.png
  assets/images/frames00076.png
  assets/images/frames00079.png
  assets/images/frames00082.png
  assets/images/frames00085.png
  assets/images/frames00088.png
  assets/images/frames00091.png
  assets/images/frames00094.png
  assets/images/frames00097.png
  assets/images/frames00100.png
  assets/images/frames00103.png
  assets/images/frames00106.png
  assets/images/frames00109.png
  assets/images/frames00112.png
  assets/images/frames00115.png
  assets/images/frames00118.png
  assets/images/frames00121.png
  assets/images/frames00124.png
  assets/images/frames00127.png
  assets/images/frames00130.png
  assets/images/frames00133.png
  assets/images/frames00136.png
  assets/images/frames00139.png
  assets/images/frames00142.png
  assets/images/frames00145.png
  assets/images/frames00148.png
  assets/images/frames00151.png
  assets/images/frames00154.png
  assets/images/frames00157.png
  assets/images/frames00160.png
  assets/images/frames00163.png
  assets/images/frames00166.png
  assets/images/frames00169.png
  assets/images/frames00172.png
  assets/images/frames00175.png
  assets/images/frames00178.png
  assets/images/frames00181.png
  assets/images/frames00184.png
  assets/images/frames00187.png
  assets/images/frames00190.png
  assets/images/frames00193.png
  assets/images/frames00196.png
  assets/images/frames00199.png
  assets/images/frames00202.png
 `;
  return data.split("\n")[index];
}

const frameCount = 67;

const images = [];
const imageSeq = {
  frame: 1,
};

for (let i = 0; i < frameCount; i++) {
  const img = new Image();
  img.src = files(i);
  img.onerror = function() {
    console.warn(`Failed to load image: ${files(i)}`);
  };
  images.push(img);
}

gsap.to(imageSeq, {
  frame: frameCount - 1,
  snap: "frame",
  ease: `none`,
  scrollTrigger: {
    scrub: .5,
    trigger: `#page3`,
    start: `top top`,
    end: `250% top`,
    scroller: `#main`,
  },
  onUpdate: render,
});

images[1].onload = render;

function render() {
  scaleImage(images[imageSeq.frame], context);
}

function scaleImage(img, ctx) {
  if (!img || !img.complete || img.naturalWidth === 0) {
    return; // Skip if image is not loaded
  }
  var canvas = ctx.canvas;
  var hRatio = canvas.width / img.width;
  var vRatio = canvas.height / img.height;
  var ratio = Math.max(hRatio, vRatio);
  var centerShift_x = (canvas.width - img.width * ratio) / 2;
  var centerShift_y = (canvas.height - img.height * ratio) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    centerShift_x,
    centerShift_y,
    img.width * ratio,
    img.height * ratio
  );
}
ScrollTrigger.create({

  trigger: "#page3",
  pin: true,
  scroller: `#main`,
  start: `top top`,
  end: `250% top`,
});
}
canvas()





var clutter= "";
const page4Title = document.querySelector("#page4>h1");
if (page4Title) {
  page4Title.textContent.split(" ").forEach(function(dets){
      clutter += `<span> ${dets} </span>`

      page4Title.innerHTML = clutter;
  })

  gsap.to("#page4>h1>span",{
      scrollTrigger:{
          trigger:`#page4>h1>span`,
          start:`top bottom`,
          end:`bottom top`,
          scroller:`#main`,
          scrub:.5,
      },
      stagger:.2,
      color:`#fff`
  })
} else {
  console.warn("Skipping #page4>h1 animation: element not found");
}





function canvas1(){
  const canvas = document.querySelector("#page5>canvas");
  if (!canvas) {
    console.warn("Skipping #page5 canvas animation: canvas not found");
    return;
  }
  const context = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
});

function files(index) {
  var data = `
  assets/images/bridges00004.png
  assets/images/bridges00007.png
  assets/images/bridges00007.png
  assets/images/bridges00010.png
  assets/images/bridges00013.png
  assets/images/bridges00016.png
  assets/images/bridges00019.png
  assets/images/bridges00022.png
  assets/images/bridges00025.png
  assets/images/bridges00028.png
  assets/images/bridges00031.png
  assets/images/bridges00034.png
  assets/images/bridges00037.png
  assets/images/bridges00040.png
  assets/images/bridges00043.png
  assets/images/bridges00046.png
  assets/images/bridges00049.png
  assets/images/bridges00052.png
  assets/images/bridges00055.png
  assets/images/bridges00058.png
  assets/images/bridges00061.png
  assets/images/bridges00064.png
  assets/images/bridges00067.png
  assets/images/bridges00070.png
  assets/images/bridges00073.png
  assets/images/bridges00076.png
  assets/images/bridges00079.png
  assets/images/bridges00082.png
  assets/images/bridges00085.png
  assets/images/bridges00088.png
  assets/images/bridges00091.png
  assets/images/bridges00094.png
  assets/images/bridges00097.png
  assets/images/bridges00100.png
  assets/images/bridges00103.png
  assets/images/bridges00106.png
  assets/images/bridges00109.png
  assets/images/bridges00112.png
  assets/images/bridges00115.png
  assets/images/bridges00118.png
  assets/images/bridges00121.png
  assets/images/bridges00124.png
  assets/images/bridges00127.png
  assets/images/bridges00130.png
  assets/images/bridges00133.png
  assets/images/bridges00136.png
  assets/images/bridges00139.png
  assets/images/bridges00142.png
  assets/images/bridges00145.png
  assets/images/bridges00148.png
  assets/images/bridges00151.png
  assets/images/bridges00154.png
  assets/images/bridges00157.png
  assets/images/bridges00160.png
  assets/images/bridges00163.png
  assets/images/bridges00166.png
  assets/images/bridges00169.png
  assets/images/bridges00172.png
  assets/images/bridges00175.png
  assets/images/bridges00178.png
  assets/images/bridges00181.png
  assets/images/bridges00184.png
  assets/images/bridges00187.png
  assets/images/bridges00190.png
  assets/images/bridges00193.png
  assets/images/bridges00196.png
  assets/images/bridges00199.png
  assets/images/bridges00202.png
 `;
  return data.split("\n")[index];
}

const frameCount = 67;

const images = [];
const imageSeq = {
  frame: 1,
};

for (let i = 0; i < frameCount; i++) {
  const img = new Image();
  img.src = files(i);
  img.onerror = function() {
    console.warn(`Failed to load image: ${files(i)}`);
  };
  images.push(img);
}

gsap.to(imageSeq, {
    frame: frameCount - 1,
    snap: "frame",
    ease: `none`,
    scrollTrigger: {
    scrub: .5,
    trigger: `#page5`,
    start: `top top`,
    end: `250% top`,
    scroller: `#main`,
  },
  onUpdate: render,
});

images[1].onload = render;

function render() {
  scaleImage(images[imageSeq.frame], context);
}

function scaleImage(img, ctx) {
  if (!img || !img.complete || img.naturalWidth === 0) {
    return; // Skip if image is not loaded
  }
  var canvas = ctx.canvas;
  var hRatio = canvas.width / img.width;
  var vRatio = canvas.height / img.height;
  var ratio = Math.max(hRatio, vRatio);
  var centerShift_x = (canvas.width - img.width * ratio) / 2;
  var centerShift_y = (canvas.height - img.height * ratio) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    centerShift_x,
    centerShift_y,
    img.width * ratio,
    img.height * ratio
  );
}
ScrollTrigger.create({

  trigger: "#page5",
  pin: true,
  scroller: `#main`,
  start: `top top`,
  end: `250% top`,
});
}
canvas1()



var clutter= "";
const page6Title = document.querySelector("#page6>h1");
if (page6Title) {
  page6Title.textContent.split(" ").forEach(function(dets){
      clutter += `<span> ${dets} </span>`

      page6Title.innerHTML = clutter;
  })

  gsap.to("#page6>h1>span",{
      scrollTrigger:{
          trigger:`#page6>h1>span`,
          start:`top bottom`,
          end:`bottom top`,
          scroller:`#main`,
          scrub:.5,
      },
      stagger:.2,
      color:`#fff`
  })
} else {
  console.warn("Skipping #page6>h1 animation: element not found");
}




function canvas2(){
  const canvas = document.querySelector("#page7>canvas");
  if (!canvas) {
    console.warn("Skipping #page7 canvas animation: canvas not found");
    return;
  }
  const context = canvas.getContext("2d");
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  
  window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  render();
  });
  
  function files(index) {
  var data = `
  
  https://thisismagma.com/assets/home/lore/seq/1.webp?2
  https://thisismagma.com/assets/home/lore/seq/2.webp?2
  https://thisismagma.com/assets/home/lore/seq/3.webp?2
  https://thisismagma.com/assets/home/lore/seq/4.webp?2
  https://thisismagma.com/assets/home/lore/seq/5.webp?2
  https://thisismagma.com/assets/home/lore/seq/6.webp?2
  https://thisismagma.com/assets/home/lore/seq/7.webp?2
  https://thisismagma.com/assets/home/lore/seq/8.webp?2
  https://thisismagma.com/assets/home/lore/seq/9.webp?2
  https://thisismagma.com/assets/home/lore/seq/10.webp?2
  https://thisismagma.com/assets/home/lore/seq/11.webp?2
  https://thisismagma.com/assets/home/lore/seq/12.webp?2
  https://thisismagma.com/assets/home/lore/seq/13.webp?2
  https://thisismagma.com/assets/home/lore/seq/14.webp?2
  https://thisismagma.com/assets/home/lore/seq/15.webp?2
  https://thisismagma.com/assets/home/lore/seq/16.webp?2
  https://thisismagma.com/assets/home/lore/seq/17.webp?2
  https://thisismagma.com/assets/home/lore/seq/18.webp?2
  https://thisismagma.com/assets/home/lore/seq/19.webp?2
  https://thisismagma.com/assets/home/lore/seq/20.webp?2
  https://thisismagma.com/assets/home/lore/seq/21.webp?2
  https://thisismagma.com/assets/home/lore/seq/22.webp?2
  https://thisismagma.com/assets/home/lore/seq/23.webp?2
  https://thisismagma.com/assets/home/lore/seq/24.webp?2
  https://thisismagma.com/assets/home/lore/seq/25.webp?2
  https://thisismagma.com/assets/home/lore/seq/26.webp?2
  https://thisismagma.com/assets/home/lore/seq/27.webp?2
  https://thisismagma.com/assets/home/lore/seq/28.webp?2
  https://thisismagma.com/assets/home/lore/seq/29.webp?2
  https://thisismagma.com/assets/home/lore/seq/30.webp?2
  https://thisismagma.com/assets/home/lore/seq/31.webp?2
  https://thisismagma.com/assets/home/lore/seq/32.webp?2
  https://thisismagma.com/assets/home/lore/seq/33.webp?2
  https://thisismagma.com/assets/home/lore/seq/34.webp?2
  https://thisismagma.com/assets/home/lore/seq/35.webp?2
  https://thisismagma.com/assets/home/lore/seq/36.webp?2
  https://thisismagma.com/assets/home/lore/seq/37.webp?2
  https://thisismagma.com/assets/home/lore/seq/38.webp?2
  https://thisismagma.com/assets/home/lore/seq/39.webp?2
  https://thisismagma.com/assets/home/lore/seq/40.webp?2
  https://thisismagma.com/assets/home/lore/seq/41.webp?2
  https://thisismagma.com/assets/home/lore/seq/42.webp?2
  https://thisismagma.com/assets/home/lore/seq/43.webp?2
  https://thisismagma.com/assets/home/lore/seq/44.webp?2
  https://thisismagma.com/assets/home/lore/seq/45.webp?2
  https://thisismagma.com/assets/home/lore/seq/46.webp?2
  https://thisismagma.com/assets/home/lore/seq/47.webp?2
  https://thisismagma.com/assets/home/lore/seq/48.webp?2
  https://thisismagma.com/assets/home/lore/seq/49.webp?2
  https://thisismagma.com/assets/home/lore/seq/50.webp?2
  https://thisismagma.com/assets/home/lore/seq/51.webp?2
  https://thisismagma.com/assets/home/lore/seq/52.webp?2
  https://thisismagma.com/assets/home/lore/seq/53.webp?2
  https://thisismagma.com/assets/home/lore/seq/54.webp?2
  https://thisismagma.com/assets/home/lore/seq/55.webp?2
  https://thisismagma.com/assets/home/lore/seq/56.webp?2
  https://thisismagma.com/assets/home/lore/seq/57.webp?2
  https://thisismagma.com/assets/home/lore/seq/58.webp?2
  https://thisismagma.com/assets/home/lore/seq/59.webp?2
  https://thisismagma.com/assets/home/lore/seq/60.webp?2
  https://thisismagma.com/assets/home/lore/seq/61.webp?2
  https://thisismagma.com/assets/home/lore/seq/62.webp?2
  https://thisismagma.com/assets/home/lore/seq/63.webp?2
  https://thisismagma.com/assets/home/lore/seq/64.webp?2
  https://thisismagma.com/assets/home/lore/seq/65.webp?2
  https://thisismagma.com/assets/home/lore/seq/66.webp?2
  https://thisismagma.com/assets/home/lore/seq/67.webp?2
  https://thisismagma.com/assets/home/lore/seq/68.webp?2
  https://thisismagma.com/assets/home/lore/seq/69.webp?2
  https://thisismagma.com/assets/home/lore/seq/70.webp?2
  https://thisismagma.com/assets/home/lore/seq/71.webp?2
  https://thisismagma.com/assets/home/lore/seq/72.webp?2
  https://thisismagma.com/assets/home/lore/seq/73.webp?2
  https://thisismagma.com/assets/home/lore/seq/74.webp?2
  https://thisismagma.com/assets/home/lore/seq/75.webp?2
  https://thisismagma.com/assets/home/lore/seq/76.webp?2
  https://thisismagma.com/assets/home/lore/seq/77.webp?2
  https://thisismagma.com/assets/home/lore/seq/78.webp?2
  https://thisismagma.com/assets/home/lore/seq/79.webp?2
  https://thisismagma.com/assets/home/lore/seq/80.webp?2
  https://thisismagma.com/assets/home/lore/seq/81.webp?2
  https://thisismagma.com/assets/home/lore/seq/82.webp?2
  https://thisismagma.com/assets/home/lore/seq/83.webp?2
  https://thisismagma.com/assets/home/lore/seq/84.webp?2
  https://thisismagma.com/assets/home/lore/seq/85.webp?2
  https://thisismagma.com/assets/home/lore/seq/86.webp?2
  https://thisismagma.com/assets/home/lore/seq/87.webp?2
  https://thisismagma.com/assets/home/lore/seq/88.webp?2
  https://thisismagma.com/assets/home/lore/seq/89.webp?2
  https://thisismagma.com/assets/home/lore/seq/90.webp?2
  https://thisismagma.com/assets/home/lore/seq/91.webp?2
  https://thisismagma.com/assets/home/lore/seq/92.webp?2
  https://thisismagma.com/assets/home/lore/seq/93.webp?2
  https://thisismagma.com/assets/home/lore/seq/94.webp?2
  https://thisismagma.com/assets/home/lore/seq/95.webp?2
  https://thisismagma.com/assets/home/lore/seq/96.webp?2
  https://thisismagma.com/assets/home/lore/seq/97.webp?2
  https://thisismagma.com/assets/home/lore/seq/98.webp?2
  https://thisismagma.com/assets/home/lore/seq/99.webp?2
  https://thisismagma.com/assets/home/lore/seq/100.webp?2
  https://thisismagma.com/assets/home/lore/seq/101.webp?2
  https://thisismagma.com/assets/home/lore/seq/102.webp?2
  https://thisismagma.com/assets/home/lore/seq/103.webp?2
  https://thisismagma.com/assets/home/lore/seq/104.webp?2
  https://thisismagma.com/assets/home/lore/seq/105.webp?2
  https://thisismagma.com/assets/home/lore/seq/106.webp?2
  https://thisismagma.com/assets/home/lore/seq/107.webp?2
  https://thisismagma.com/assets/home/lore/seq/108.webp?2
  https://thisismagma.com/assets/home/lore/seq/109.webp?2
  https://thisismagma.com/assets/home/lore/seq/110.webp?2
  https://thisismagma.com/assets/home/lore/seq/111.webp?2
  https://thisismagma.com/assets/home/lore/seq/112.webp?2
  https://thisismagma.com/assets/home/lore/seq/113.webp?2
  https://thisismagma.com/assets/home/lore/seq/114.webp?2
  https://thisismagma.com/assets/home/lore/seq/115.webp?2
  https://thisismagma.com/assets/home/lore/seq/116.webp?2
  https://thisismagma.com/assets/home/lore/seq/117.webp?2
  https://thisismagma.com/assets/home/lore/seq/118.webp?2
  https://thisismagma.com/assets/home/lore/seq/119.webp?2
  https://thisismagma.com/assets/home/lore/seq/120.webp?2
  https://thisismagma.com/assets/home/lore/seq/121.webp?2
  https://thisismagma.com/assets/home/lore/seq/122.webp?2
  https://thisismagma.com/assets/home/lore/seq/123.webp?2
  https://thisismagma.com/assets/home/lore/seq/124.webp?2
  https://thisismagma.com/assets/home/lore/seq/125.webp?2
  https://thisismagma.com/assets/home/lore/seq/126.webp?2
  https://thisismagma.com/assets/home/lore/seq/127.webp?2
  https://thisismagma.com/assets/home/lore/seq/128.webp?2
  https://thisismagma.com/assets/home/lore/seq/129.webp?2
  https://thisismagma.com/assets/home/lore/seq/130.webp?2
  https://thisismagma.com/assets/home/lore/seq/131.webp?2
  https://thisismagma.com/assets/home/lore/seq/132.webp?2
  https://thisismagma.com/assets/home/lore/seq/133.webp?2
  https://thisismagma.com/assets/home/lore/seq/134.webp?2
  https://thisismagma.com/assets/home/lore/seq/135.webp?2
  https://thisismagma.com/assets/home/lore/seq/136.webp?2
  
  `;
  return data.split("\n")[index];
  }
  
  const frameCount = 136;
  
  const images = [];
  const imageSeq = {
  frame: 1,
  };
  
  for (let i = 0; i < frameCount; i++) {
  const img = new Image();
  img.src = files(i);
  img.onerror = function() {
    console.warn(`Failed to load image: ${files(i)}`);
  };
  images.push(img);
  }

  gsap.to(imageSeq, {
  frame: frameCount - 1,
  snap: "frame",
  ease: `none`,
  scrollTrigger: {
    scrub: .5,
    trigger: `#page7`,
    start: `top top`,
    end: `250% top`,
    scroller: `#main`,
  },
  onUpdate: render,
  });

  images[1].onload = render;
  
  function render() {
  scaleImage(images[imageSeq.frame], context);
  }
  
  function scaleImage(img, ctx) {
  var canvas = ctx.canvas;
  var hRatio = canvas.width / img.width;
  var vRatio = canvas.height / img.height;
  var ratio = Math.max(hRatio, vRatio);
  var centerShift_x = (canvas.width - img.width * ratio) / 2;
  var centerShift_y = (canvas.height - img.height * ratio) / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    img,
    0,
    0,
    img.width,
    img.height,
    centerShift_x,
    centerShift_y,
    img.width * ratio,
    img.height * ratio
  );
  }
  ScrollTrigger.create({
  
  trigger: "#page7",
  pin: true,
  scroller: `#main`,
  start: `top top`,
  end: `250% top`,
  });
  }
  canvas2()
  
  
  
  gsap.to(".page7-cir",{
    scrollTrigger:{
      trigger:`.page7-cir`,
      start:`top center`,
      end:`bottom top`,
      scroller:`#main`,
      scrub:.5
    },
    scale:1.5
  })
  
  
  
  gsap.to(".page7-cir-inner",{
    scrollTrigger:{
      trigger:`.page7-cir-inner`,
      start:`top center`,
      end:`bottom top`,
      scroller:`#main`,
      scrub:.5
    },
    backgroundColor : `#0a3bce91`,
  })


// Button functionality - Initialize after page loads
setTimeout(function() {
  // Book a Demo buttons
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(button => {
    const buttonText = button.textContent.trim();
    if (buttonText.includes('Book a Demo') || buttonText.includes('BOOK A DEMO')) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        // Scroll to page13 (Become an early adopter section)
        const page13 = document.querySelector('#page13');
        if (page13 && locoScroll) {
          locoScroll.scrollTo(page13);
        }
      });
    }
    // Learn More buttons
    else if (buttonText.includes('LEARN MORE') || buttonText.includes('Learn More')) {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        // Scroll to page10 (What is Magma section)
        const page10 = document.querySelector('#page10');
        if (page10 && locoScroll) {
          locoScroll.scrollTo(page10);
        }
      });
    }
  });

  // Menu button functionality
  const menuButton = document.querySelector('#right-nav button:last-child');
  if (menuButton) {
    menuButton.addEventListener('click', function() {
      // Toggle menu functionality can be added here
      alert('Menu functionality coming soon!');
    });
  }

  // Social media links
  const socialLinks = document.querySelectorAll('.page14-inner');
  socialLinks.forEach(link => {
    link.style.cursor = 'pointer';
    link.addEventListener('click', function() {
      const h1Element = link.querySelector('h1');
      if (h1Element) {
        const platform = h1Element.textContent.trim();
        const urls = {
          'Twitter': 'https://twitter.com',
          'LinkedIn': 'https://linkedin.com',
          'Instagram': 'https://instagram.com',
          'Telegram': 'https://telegram.org',
          'Youtube': 'https://youtube.com'
        };
        // Handle Twitter/X icon
        if (link.querySelector('.ri-twitter-x-line')) {
          window.open('https://twitter.com', '_blank');
        } else if (urls[platform]) {
          window.open(urls[platform], '_blank');
        }
      }
    });
  });
}, 100);
