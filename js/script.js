console.log("Liquid animation script loaded (No-Module Version)");

// --- Lenis Smooth Scroll ---
const lenis = new Lenis({
    duration: 1.0,
    easing: (t) => 1 - Math.pow(1 - t, 3),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    syncTouch: false,
});

// Connect Lenis to GSAP ScrollTrigger (single integration point - no duplicate raf calls)
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// --- Utility Functions (Inlined to avoid module issues) ---

function createCoordsTransformer(svg) {
  const pt = svg.createSVGPoint();
  return function(e) {
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  };
}

function pointsInPath(path, detail) {
  const points = [];
  const len = path.getTotalLength();
  for (let i = 0; i < detail; i++) {
    const p = path.getPointAtLength((i / (detail - 1)) * len);
    points.push({ x: p.x, y: p.y });
  }
  return points;
}

function formatPoints(points, close) {
  points = [...points];
  if (!Array.isArray(points[0])) {
    points = points.map(({ x, y }) => [x, y]);
  }

  if (close) {
    const lastPoint = points[points.length - 1];
    const secondToLastPoint = points[points.length - 2];

    const firstPoint = points[0];
    const secondPoint = points[1];

    points.unshift(lastPoint);
    points.unshift(secondToLastPoint);

    points.push(firstPoint);
    points.push(secondPoint);
  }

  return points.flat();
}

function spline(points, tension = 1, close = false) {
  points = formatPoints(points, close);

  const size = points.length;
  const last = size - 4;

  const startPointX = close ? points[2] : points[0];
  const startPointY = close ? points[3] : points[1];

  let path = "M" + [startPointX, startPointY];

  const startIteration = close ? 2 : 0;
  const maxIteration = close ? size - 4 : size - 2;
  const inc = 2;

  for (let i = startIteration; i < maxIteration; i += inc) {
    const x0 = i ? points[i - 2] : points[0];
    const y0 = i ? points[i - 1] : points[1];

    const x1 = points[i + 0];
    const y1 = points[i + 1];

    const x2 = points[i + 2];
    const y2 = points[i + 3];

    const x3 = i !== last ? points[i + 4] : x2;
    const y3 = i !== last ? points[i + 5] : y2;

    const cp1x = x1 + ((x2 - x0) / 6) * tension;
    const cp1y = y1 + ((y2 - y0) / 6) * tension;

    const cp2x = x2 - ((x3 - x1) / 6) * tension;
    const cp2y = y2 - ((y3 - y1) / 6) * tension;

    path += "C" + [cp1x, cp1y, cp2x, cp2y, x2, y2];
  }

  return path;
}

// --- Main Logic ---

function createLiquidPath(path, options) {
  try {
    const svgPoints = pointsInPath(path, options.detail);
    console.log(`Path points generated: ${svgPoints.length}`);
    
    const originPoints = svgPoints.map(p => ({ x: p.x, y: p.y }));
    const liquidPoints = svgPoints.map(p => ({ x: p.x, y: p.y }));
    const mousePos = { x: 0, y: 0 };
    
    // Calculate size factor to reduce distortion on small elements (like eyes)
    const bbox = path.getBBox();
    const maxDim = Math.max(bbox.width, bbox.height);
    // If element is small (e.g. eyes), reduce the wave amplitude significantly
    // Assuming the main face is large (>300px) and eyes are small (<150px)
    const sizeFactor = Math.min(1, Math.max(0.2, maxDim / 500));
    console.log(`Path size: ${maxDim.toFixed(0)}px, Size Factor: ${sizeFactor.toFixed(2)}`);

    // Robust SVG coordinate transformer
    const svg = path.closest("svg");
    let transformCoords;
    try {
        const pt = svg.createSVGPoint();
        transformCoords = function(e) {
            if (!svg.getScreenCTM()) return { x: 0, y: 0 }; // Safety check
            pt.x = e.clientX;
            pt.y = e.clientY;
            const transformed = pt.matrixTransform(svg.getScreenCTM().inverse());
            return { x: transformed.x, y: transformed.y };
        };
    } catch (e) {
        console.error("Error creating coordinate transformer:", e);
        return; // Cannot animate without coordinates
    }
    
    const maxDist = {
      x: options.range.x, 
      y: options.range.y
    };

    let time = Math.random() * 1000;
    
    // Track mouse velocity for "drag" effect
    let lastMousePos = { x: 0, y: 0 };
    let mouseVelocity = { x: 0, y: 0 };

    let isVisible = false;

    // Visibility tracking using IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
        });
    }, { threshold: 0 });

    observer.observe(svg);

    gsap.ticker.add(() => {
      if (!isVisible) return;

      time += 0.006; // Slightly faster for more energy

      // Decay velocity
      mouseVelocity.x *= 0.9;
      mouseVelocity.y *= 0.9;

      const renderPoints = liquidPoints.map((point, index) => {
          const progress = index / liquidPoints.length;

          // Psychedelic & Smooth: Using non-linear phase shifts and interference
          // Layer 1: The "Breathing" - slow, deep distortion
          const wave1X = Math.sin(time * 0.6 + progress * Math.PI * 2) * 15 * sizeFactor;
          const wave1Y = Math.cos(time * 0.5 + progress * Math.PI * 2) * 15 * sizeFactor;

          // Layer 2: The "Psychedelic Ripple" - faster, higher frequency, moving in opposite direction
          const wave2X = Math.sin(time * -1.5 + progress * Math.PI * 4) * 8 * sizeFactor;
          const wave2Y = Math.cos(time * -1.3 + progress * Math.PI * 4) * 8 * sizeFactor;

          // Layer 3: "Liquid Noise" - varying frequency based on time
          const wave3X = Math.sin(time * 1.2 + index * 0.3) * 5 * sizeFactor;
          const wave3Y = Math.cos(time * 1.1 + index * 0.3) * 5 * sizeFactor;

          return {
              x: point.x + wave1X + wave2X + wave3X,
              y: point.y + wave1Y + wave2Y + wave3Y
          };
      });

      const newPathData = spline(renderPoints, options.tension, options.close);
      gsap.set(path, { attr: { d: newPathData } });
    });

    window.addEventListener("mousemove", (e) => {
      const coords = transformCoords(e);
      if (!coords) return;
      
      // Calculate velocity
      mouseVelocity.x = coords.x - lastMousePos.x;
      mouseVelocity.y = coords.y - lastMousePos.y;
      
      lastMousePos.x = coords.x;
      lastMousePos.y = coords.y;

      mousePos.x = coords.x;
      mousePos.y = coords.y;

      liquidPoints.forEach((point, index) => {
        const pointOrigin = originPoints[index];
        const dx = mousePos.x - pointOrigin.x;
        const dy = mousePos.y - pointOrigin.y;
        const distSq = dx * dx + dy * dy;
        const rangeSq = options.range.x * options.range.x;

        // Check if point is within interaction range
        if (distSq < rangeSq) {
          const dist = Math.sqrt(distSq);
          const force = 1 - (dist / options.range.x); // 1.0 at center, 0.0 at edge

          // "Fluid Drag" effect:
          // Instead of pulling to the mouse center, we push points in the direction
          // the mouse is moving (velocity). This creates a wake/wave effect.
          const dragStrength = 7.0; // Stronger pull
          
          const targetX = pointOrigin.x + (mouseVelocity.x * force * dragStrength);
          const targetY = pointOrigin.y + (mouseVelocity.y * force * dragStrength);

          // Clamp to prevent exploding
          const clampedX = gsap.utils.clamp(pointOrigin.x - 150, pointOrigin.x + 150, targetX);
          const clampedY = gsap.utils.clamp(pointOrigin.y - 150, pointOrigin.y + 150, targetY);

          gsap.to(point, {
            x: clampedX,
            y: clampedY,
            ease: "power2.out", 
            overwrite: "auto",
            duration: 0.9, // Slower response for "heavier" liquid feel
            onComplete: () => {
                gsap.to(point, {
                    x: pointOrigin.x,
                    y: pointOrigin.y,
                    ease: "elastic.out(1, 0.3)", // More wobble on return
                    duration: 4.5 // Longer settle time
                });
            }
          });
        } else {
            if (Math.abs(point.x - pointOrigin.x) > 0.1 || Math.abs(point.y - pointOrigin.y) > 0.1) {
                gsap.to(point, {
                    x: pointOrigin.x,
                    y: pointOrigin.y,
                    ease: "elastic.out(1, 0.3)",
                    duration: 2.5,
                    overwrite: "auto"
                });
            }
        }
      });
    });
  } catch (err) {
    console.error("Error in createLiquidPath:", err);
  }
}

// Index page content reveal animations - triggered by loaderComplete event from loader.js
// IMPORTANT: This must be registered BEFORE window.load to ensure we catch the event
window.addEventListener('loaderComplete', () => {
    // Menu button animation - runs on all pages
    gsap.to(".menu-btn", {
        duration: 1.0,
        y: 0,
        opacity: 1,
        ease: "power3.out"
    });

    // Only run hero animations on index page (has hero-title)
    if (!document.querySelector('.hero-title')) return;

    // All elements appear simultaneously
    gsap.to(".hero-title .reveal-inner-hero", {
        duration: 1.2,
        y: "0%",
        stagger: 0.1,
        ease: "power3.out"
    });

    gsap.to(".services-text .reveal-inner", {
        duration: 1.0,
        y: "0%",
        stagger: 0.08,
        ease: "power3.out"
    });
});

// Use window.onload to ensure SVG geometry is fully calculated
window.addEventListener('load', () => {
    console.log('Window loaded, initializing animation...');

    if (typeof gsap === 'undefined') {
        console.error("GSAP is not loaded! Please check your internet connection or the script tag.");
        return;
    }

    // Direct access to the inlined SVG
    const svg = document.getElementById("Layer_1");

    if (svg) {
        console.log("Found inline SVG, starting animation...");
        const paths = Array.from(svg.querySelectorAll("path"));
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

        if (paths.length === 0) {
            console.warn("No paths found in SVG to animate.");
            return;
        }

        if (!prefersReducedMotion.matches) {
            paths.forEach((p, index) => {
                const d = p.getAttribute('d');
                // Improved closed path detection
                const isClosed = d && /z$/i.test(d.trim());

                console.log(`Animating path ${index + 1}/${paths.length}`);

                createLiquidPath(p, {
                    detail: 60, // High detail for small ripples
                    tension: 1,
                    close: isClosed,
                    range: { x: 350, y: 350 }, // Large interaction area ("nagy")
                    axis: ["x", "y"]
                });
            });
        }
    }

    // UX/UI width matching is handled via CSS media queries
    // (no-op stub kept for compatibility)

    // Character Swap Animation
    initCharSwapAnimation();

    // Custom Cursor
    initCustomCursor();

    // Interactive Wave Lines in Contact Section
    initContactWaves();

    // Psychedelic Door Animation
    initPsychedelicDoor();

    // Door click handler - navigate to dramatic exit page
    initDoorNavigation();

    // Countdown timer to 4:20 PM
    initCountdownTimer();

    // Hero exit fade on scroll
    initHeroExitFade();

    // Works page animations
    initWorksPageAnimations();

    // Work card image hover - scale down with GSAP (runs on all pages with work cards)
    const workCardImages = document.querySelectorAll('.work-card-image img');
    workCardImages.forEach(img => {
        const card = img.closest('.work-card');
        const isSmallScale = card.dataset.imgScale === 'small';
        const baseScale = isSmallScale ? 1.05 : 1.15;

        // Set initial scale for GSAP to animate from
        gsap.set(img, { scale: baseScale });

        card.addEventListener('mouseenter', () => {
            gsap.to(img, {
                scale: 1,
                duration: 0.8,
                ease: "power3.out"
            });
        });

        card.addEventListener('mouseleave', () => {
            gsap.to(img, {
                scale: baseScale,
                duration: 0.6,
                ease: "power2.inOut"
            });
        });
    });

    // Project card animations (index.html)
    initProjectCardAnimations();

    // View all circle magnetic effect
    initViewAllMagnetic();

    // Adaptive logo color based on background
    initAdaptiveLogo();

    // Theme toggle (light/dark mode)
    initThemeToggle();

    // Scroll-based theme switch at footer (index page only)
    initFooterThemeSwitch();

    // Process section timeline animations
    initProcessSectionAnimations();
});

// UX/UI width matching moved to CSS media queries to prevent CLS

// Character Swap Animation for DESIGNER and UX/UI text
function initCharSwapAnimation() {
    const charSwapElements = document.querySelectorAll('[data-char-swap]');

    charSwapElements.forEach(element => {
        const text = element.textContent;
        element.textContent = '';

        // Wrap each character in a container with original and clone
        const chars = text.split('');
        const charContainers = [];

        chars.forEach(char => {
            const container = document.createElement('span');
            container.className = 'char-swap-container';

            const original = document.createElement('span');
            original.className = 'char-swap-original';
            original.textContent = char === ' ' ? '\u00A0' : char;

            const clone = document.createElement('span');
            clone.className = 'char-swap-clone';
            clone.textContent = char === ' ' ? '\u00A0' : char;

            if (char == ".") {
                original.classList.add("maincolor");
                clone.classList.add("maincolor");
            }

            container.appendChild(original);
            container.appendChild(clone);
            element.appendChild(container);

            charContainers.push({ container, original, clone });
        });

        // Start the animation loop after a delay
        setTimeout(() => {
            startCharSwapLoop(charContainers);
        }, 2500); // Wait for initial page load animation
    });
}

function startCharSwapLoop(charContainers) {
    // Shuffle array to get random order
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    function animateSequence() {
        const shuffled = shuffleArray(charContainers);
        // Pick only 1-2 random characters per sequence
        const count = Math.random() < 0.5 ? 1 : 2;
        const selected = shuffled.slice(0, count);

        let delay = 0;
        selected.forEach((charData) => {
            setTimeout(() => {
                animateChar(charData);
            }, delay);
            // Small offset if animating 2 chars (150-300ms)
            delay += 150 + Math.random() * 150;
        });

        // Schedule next sequence with pause (3-4 seconds)
        const nextDelay = 3000 + Math.random() * 1000;
        setTimeout(animateSequence, nextDelay);
    }

    animateSequence();
}

function animateChar(charData) {
    const { original, clone } = charData;
    const charWidth = original.offsetWidth;
    const gap = 4; // Small gap in pixels between outgoing and incoming

    // Set initial positions
    gsap.set(clone, { x: -(charWidth + gap) }); // Clone starts to the left, outside view
    gsap.set(original, { x: 0 }); // Original at normal position

    // Animate both simultaneously
    const duration = 0.5;
    const ease = "power2.inOut";

    // Original slides out to the right
    gsap.to(original, {
        x: charWidth + gap,
        duration: duration,
        ease: ease
    });

    // Clone slides in from the left to center position
    gsap.to(clone, {
        x: 0,
        duration: duration,
        ease: ease,
        onComplete: () => {
            // Reset for next animation: swap roles
            // Move original back to start position (hidden left)
            // Move clone to original position
            gsap.set(original, { x: -(charWidth + gap) });
            gsap.set(clone, { x: 0 });

        }
    });
}

// Custom Cursor and View Work Cursor
function initCustomCursor() {
    // Create cursor element
    const cursor = document.createElement('div');
    cursor.className = 'custom-cursor';
    document.body.appendChild(cursor);

    // Create view work cursor - simple text badge like menu button
    const viewWorkCursor = document.createElement('div');
    viewWorkCursor.className = 'view-work-cursor';
    viewWorkCursor.textContent = 'Посмотреть►';
    document.body.appendChild(viewWorkCursor);

    // Create contact title follow cursor
    const contactTitleCursor = document.createElement('div');
    contactTitleCursor.className = 'contact-title-cursor';
    contactTitleCursor.innerHTML = `<img src="images/contact.png" alt="">`;
    document.body.appendChild(contactTitleCursor);

    // Get all project images (white areas) and work cards
    const projectImages = document.querySelectorAll('.project-image, .work-card');

    // Get contact title element
    const contactTitle = document.querySelector('.contact-title');

    // Get all hoverable elements (excluding work cards which have their own cursor)
    const hoverables = document.querySelectorAll('a:not(.work-card), button, .menu-btn, .menu-link, .social-link, .contact-social-link, .download-cv-btn');

    let mouseX = 0;
    let mouseY = 0;
    let contactCursorX = 0;
    let contactCursorY = 0;
    let currentSkewX = 0;
    let currentSkewY = 0;
    let isOnContactTitle = false;

    // Smooth follow animation for contact title cursor using lerp
    function animateContactCursor() {
        if (isOnContactTitle) {
            // Calculate velocity
            const velocityX = mouseX - contactCursorX;
            const velocityY = mouseY - contactCursorY;

            // Lerp position
            contactCursorX += velocityX * 0.12;
            contactCursorY += velocityY * 0.12;

            // Calculate skew based on velocity (clamped)
            const targetSkewX = Math.max(-15, Math.min(15, velocityX * 0.3));
            const targetSkewY = Math.max(-15, Math.min(15, velocityY * 0.3));

            // Smooth skew transition
            currentSkewX += (targetSkewX - currentSkewX) * 0.15;
            currentSkewY += (targetSkewY - currentSkewY) * 0.15;

            contactTitleCursor.style.left = contactCursorX + 'px';
            contactTitleCursor.style.top = contactCursorY + 'px';
            contactTitleCursor.style.transform = `translate(-50%, -50%) scale(1) skew(${currentSkewX}deg, ${currentSkewY}deg)`;
        }
        requestAnimationFrame(animateContactCursor);
    }
    animateContactCursor();

    // Update cursor position on mouse move
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        cursor.style.left = mouseX + 'px';
        cursor.style.top = mouseY + 'px';

        viewWorkCursor.style.left = mouseX + 'px';
        viewWorkCursor.style.top = mouseY + 'px';
    });

    // Handle hoverable elements
    hoverables.forEach(el => {
        el.addEventListener('mouseenter', () => {
            if (!cursor.classList.contains('on-project')) {
                cursor.classList.add('hovering');
                document.body.classList.add('show-default-cursor');
            }
        });

        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hovering');
            document.body.classList.remove('show-default-cursor');
        });
    });

    // Handle project image hover
    projectImages.forEach(image => {
        image.addEventListener('mouseenter', () => {
            cursor.classList.add('on-project');
            cursor.classList.remove('hovering');
            viewWorkCursor.classList.add('visible');
        });

        image.addEventListener('mouseleave', () => {
            cursor.classList.remove('on-project');
            viewWorkCursor.classList.remove('visible');
        });
    });

    // Handle contact title hover
    if (contactTitle) {
        contactTitle.addEventListener('mouseenter', () => {
            cursor.classList.add('on-contact-title');
            isOnContactTitle = true;
            // Initialize cursor position to current mouse position
            contactCursorX = mouseX;
            contactCursorY = mouseY;
            contactTitleCursor.style.left = contactCursorX + 'px';
            contactTitleCursor.style.top = contactCursorY + 'px';
            contactTitleCursor.classList.add('visible');
        });

        contactTitle.addEventListener('mouseleave', () => {
            cursor.classList.remove('on-contact-title');
            isOnContactTitle = false;
            contactTitleCursor.classList.remove('visible');
        });
    }

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
        cursor.classList.add('hidden');
        viewWorkCursor.classList.remove('visible');
    });

    document.addEventListener('mouseenter', () => {
        cursor.classList.remove('hidden');
    });
}

// Interactive Wave Lines for Contact Section
function initContactWaves() {
    const canvas = document.getElementById('waveCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;

    // Mouse position tracking with history for drag effect
    let mouse = { x: -1000, y: -1000 };
    let targetMouse = { x: -1000, y: -1000 };
    let mouseHistory = [];
    const historyLength = 20;

    // Configuration
    const config = {
        lineCount: 40,
        pointsPerLine: 120,
        lineColor: 'rgba(230, 225, 221, 1)',  // 100% beige
        lineWidth: 1,
        mouseRadius: 120,
        mouseStrength: 25,       // Reduced for subtler effect
        smoothing: 0.08,         // Smoother mouse following
        returnSpeed: 0.03,       // Slower return for drag trail
        padding: 16              // 1em padding from edges
    };

    // Store line points
    let lines = [];

    // Resize canvas to match container
    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        initLines();
    }

    // Initialize line points
    function initLines() {
        lines = [];
        const padding = config.padding;
        const usableHeight = canvas.height - padding * 2;
        const lineSpacing = usableHeight / (config.lineCount + 1);

        for (let i = 0; i < config.lineCount; i++) {
            const y = padding + lineSpacing * (i + 1);
            const points = [];

            for (let j = 0; j <= config.pointsPerLine; j++) {
                const x = padding + (j / config.pointsPerLine) * (canvas.width - padding * 2);
                points.push({
                    x: x,
                    baseY: y,
                    y: y,
                    velocity: 0
                });
            }
            lines.push(points);
        }
    }

    // Draw all lines
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = config.lineColor;
        ctx.lineWidth = config.lineWidth;

        lines.forEach(points => {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            // Draw smooth curve through points using quadratic curves
            for (let i = 1; i < points.length - 1; i++) {
                const xc = (points[i].x + points[i + 1].x) / 2;
                const yc = (points[i].y + points[i + 1].y) / 2;
                ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
            }

            // Connect to last point
            const last = points[points.length - 1];
            ctx.lineTo(last.x, last.y);
            ctx.stroke();
        });
    }

    // Update line positions based on mouse with drag effect
    function update() {
        // Smooth mouse movement
        mouse.x += (targetMouse.x - mouse.x) * config.smoothing;
        mouse.y += (targetMouse.y - mouse.y) * config.smoothing;

        // Add current position to history
        mouseHistory.push({ x: mouse.x, y: mouse.y });
        if (mouseHistory.length > historyLength) {
            mouseHistory.shift();
        }

        lines.forEach(points => {
            points.forEach(point => {
                let totalDisplacement = 0;

                // Calculate influence from mouse history (drag trail effect)
                mouseHistory.forEach((historyPoint, index) => {
                    const age = (historyLength - index) / historyLength;
                    const dx = historyPoint.x - point.x;
                    const dy = historyPoint.y - point.baseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < config.mouseRadius) {
                        const force = (1 - dist / config.mouseRadius);
                        // Smoother cubic falloff
                        const easeForce = force * force * force;
                        // Older positions have less influence
                        const ageMultiplier = age * age;
                        const displacement = easeForce * config.mouseStrength * ageMultiplier;

                        // All lines move in same direction (downward) for cohesive look
                        totalDisplacement += displacement;
                    }
                });

                // Apply displacement with spring physics
                const targetY = point.baseY + totalDisplacement;
                const diff = targetY - point.y;
                point.velocity += diff * 0.15;
                point.velocity *= 0.75; // Damping
                point.y += point.velocity;

                // Slow return to base when no mouse influence
                if (totalDisplacement === 0) {
                    point.y += (point.baseY - point.y) * config.returnSpeed;
                }
            });
        });
    }

    // Animation loop - only when visible
    let isVisible = false;
    let animationId = null;

    function animate() {
        if (!isVisible) {
            animationId = null;
            return;
        }
        update();
        draw();
        animationId = requestAnimationFrame(animate);
    }

    // Mouse move handler - track across entire contact section
    function handleMouseMove(e) {
        const rect = canvas.getBoundingClientRect();
        targetMouse.x = e.clientX - rect.left;
        targetMouse.y = e.clientY - rect.top;
    }

    // Mouse leave handler
    function handleMouseLeave() {
        targetMouse.x = -1000;
        targetMouse.y = -1000;
    }

    // Initialize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Listen on the entire contact section for smoother interaction
    const contactSection = document.querySelector('.contact-section');
    if (contactSection) {
        contactSection.addEventListener('mousemove', handleMouseMove);
        contactSection.addEventListener('mouseleave', handleMouseLeave);
    } else {
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);
    }

    // Visibility tracking using IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
            if (isVisible && !animationId) {
                animate();
            }
        });
    }, { threshold: 0 });

    observer.observe(canvas);
}

// Ray Sunburst Door Animation - matching dramatic-exit.html
// Optimized: only runs when canvas is visible in viewport
function initPsychedelicDoor() {
    const canvases = [
        document.getElementById('psychedelicCanvas'),
        document.getElementById('heroPsychedelicCanvas')
    ].filter(c => c !== null);

    if (canvases.length === 0) return;

    canvases.forEach(canvas => initSinglePsychedelicCanvas(canvas));
}

function initSinglePsychedelicCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const SVG_HEIGHT = 257.3;
    const RAY_COUNT = 36;

    // Original path coordinates from dramatic-exit.html
    const originalPath = [
        ['M', 1378.1, 99.2],
        ['c', -43.3, 8.2, -89.7, 14.9, -131.8, -2],
        ['c', -35.2, -14.1, -58.5, -43.8, -90.6, -62.4],
        ['c', -24.5, -14.2, -50.9, -25.2, -78.7, -30.9],
        ['c', -56.4, -11.4, -114.5, 1.4, -156.4, 42.1],
        ['c', -56, 54.4, -83.5, 133.2, -176.9, 123],
        ['c', -67.4, -7.4, -100.6, -63, -158.9, -87],
        ['c', -102.3, -42.1, -179.8, 16.3, -218.2, 74.8],
        ['s', -78, 70.9, -78, 70.9],
        ['c', 0, 0, -80.3, 36.8, -162.5, -27.2],
        ['C', 43.8, 136.4, 0, 132, 0, 132],
        ['c', 97.1, 44.5, 133.5, 87.4, 133.5, 87.4],
        ['c', 45.9, 34.5, 102.3, 49.1, 157.2, 28.2],
        ['c', 58.4, -22.3, 79.9, -71.8, 124.1, -110.6],
        ['c', 41.2, -36.2, 113.2, -43.1, 161, -15.5],
        ['c', 44.7, 25.7, 79, 63.1, 126.7, 85.9],
        ['c', 74.4, 35.7, 150.4, 2.9, 205.1, -51.5],
        ['c', 36.9, -36.7, 72.7, -82.9, 129.4, -84.2],
        ['c', 35.7, -0.8, 61.9, 18.3, 89.5, 37.9],
        ['c', 32.8, 23.3, 66.6, 45.7, 103.1, 62.9],
        ['c', 43.7, 20.5, 89.3, 31.4, 137.5, 30.8],
        ['c', 14.6, -0.2, 87.8, 1.2, 91.2, -18.9],
        ['c', 0, -0.1, 19, -111.8, 19, -111.8],
        ['c', -2.1, 12.1, -87.1, 24.4, -99.2, 26.7],
        ['Z']
    ];

    function flipY(val, isAbsolute) {
        if (isAbsolute) {
            return SVG_HEIGHT - val;
        } else {
            return -val;
        }
    }

    function interpolate(orig, flipped, t) {
        return orig + (flipped - orig) * t;
    }

    function generatePath(t) {
        let d = '';
        for (const seg of originalPath) {
            const cmd = seg[0];
            if (cmd === 'Z') {
                d += 'Z';
                continue;
            }

            const isAbsolute = cmd === cmd.toUpperCase();
            const values = seg.slice(1);

            d += cmd;
            for (let i = 0; i < values.length; i++) {
                const isY = (i % 2 === 1);
                let val = values[i];
                if (isY) {
                    const flippedVal = flipY(val, isAbsolute);
                    val = interpolate(val, flippedVal, t);
                }
                d += (i > 0 ? ',' : '') + val.toFixed(1);
            }
        }
        return d;
    }

    let rotation = 0;
    const pathT = 0; // Fixed at left position (original shape)
    let isVisible = false;
    let animationId = null;

    function draw() {
        if (!isVisible) {
            animationId = null;
            return;
        }

        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#1A1A1A';
        ctx.fillRect(0, 0, width, height);

        ctx.save();
        ctx.translate(centerX, centerY);
        rotation += 0.3; // Slow rotation
        ctx.rotate(rotation * Math.PI / 180);

        // Scale to fit the small canvas
        const scale = Math.max(width, height) / 1477.3 * 1.2;

        // Draw rays
        ctx.fillStyle = 'rgba(161, 153, 255, 0.5)'; // #A199FF at 50% opacity
        const pathData = generatePath(pathT);

        for (let i = 0; i < RAY_COUNT; i++) {
            ctx.save();
            ctx.rotate(i * 10 * Math.PI / 180);
            ctx.scale(scale, scale);
            ctx.translate(0, -SVG_HEIGHT / 2);

            const path2D = new Path2D(pathData);
            ctx.fill(path2D);
            ctx.restore();
        }

        ctx.restore();
        animationId = requestAnimationFrame(draw);
    }

    // Visibility tracking using IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            isVisible = entry.isIntersecting;
            if (isVisible && !animationId) {
                draw();
            }
        });
    }, { threshold: 0 });

    observer.observe(canvas);
}

// Countdown timer to 4:20 PM
function initCountdownTimer() {
    const timerElements = document.querySelectorAll('.countdown-timer');
    if (timerElements.length === 0) return;

    function updateCountdown() {
        const now = new Date();
        const target = new Date();
        target.setHours(16, 20, 0, 0);

        // If it's already past 4:20 today, count to tomorrow's 4:20
        if (now >= target) {
            target.setDate(target.getDate() + 1);
        }

        const diff = target - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timerElements.forEach(el => el.textContent = formatted);
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Door Navigation - click open door to go to dramatic exit page
// At 16:20 local time, automatically redirects to dramatic exit
function initDoorNavigation() {
    const openDoors = document.querySelectorAll('.contact-door-open, .hero-door-open');
    if (openDoors.length === 0) return;

    // Check if it's 16:20 (4:20 PM)
    function is420() {
        const now = new Date();
        return now.getHours() === 16 && now.getMinutes() === 20;
    }

    // Get the current page name for return path
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Auto-redirect at 16:20
    function checkTimeAndRedirect() {
        if (is420()) {
            const returnPath = currentPage + '#hero';
            window.location.href = 'dramatic-exit.html?from=' + encodeURIComponent(returnPath);
        }
    }

    // Check every second for the magic time
    setInterval(checkTimeAndRedirect, 1000);
    // Also check immediately on load
    checkTimeAndRedirect();

    // Door click handler for all doors
    openDoors.forEach(openDoor => {
        openDoor.style.cursor = 'pointer';
    });
}

// Hero Exit hide when hero section is less than 50% visible
function initHeroExitFade() {
    const heroExit = document.querySelector('.hero-exit');
    const heroSection = document.querySelector('main');
    if (!heroExit || !heroSection) return;

    ScrollTrigger.create({
        trigger: heroSection,
        start: 'top top',
        end: '50% top',
        onLeave: () => { heroExit.style.opacity = '0'; },
        onEnterBack: () => { heroExit.style.opacity = '1'; }
    });
}

// Works Page GSAP Animations
function initWorksPageAnimations() {
    const worksSection = document.querySelector('.works-section');
    if (!worksSection) return;

    // Simple reveal animation for works title
    const titleFavorite = document.querySelector('.works-title-favorite');
    const titleMain = document.querySelector('.works-title-main');

    if (titleFavorite && titleMain) {
        // Set initial state
        gsap.set([titleFavorite, titleMain], {
            opacity: 0,
            y: 30
        });

        // Animate titles with simple fade in
        gsap.to(titleFavorite, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.2
        });
        gsap.to(titleMain, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.35
        });
    }

    // Animate work cards
    const workCards = document.querySelectorAll('.work-card');

    // First card: simple reveal on load
    if (workCards.length > 0) {
        const firstCard = workCards[0];
        gsap.set(firstCard, { opacity: 0 });
        gsap.to(firstCard, {
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.5
        });
    }

    // Other cards: reveal on scroll using opacity (GPU accelerated, faster than clipPath)
    // Note: we only animate opacity, not y/transform, to preserve the CSS staggered layout
    workCards.forEach((card, index) => {
        if (index === 0) return; // Skip first card, already animated

        // Set initial state - use opacity only (preserves CSS transform for staggered layout)
        gsap.set(card, {
            opacity: 0
        });

        // Reveal with opacity
        ScrollTrigger.create({
            trigger: card,
            start: "top 85%",
            once: true,
            onEnter: () => {
                gsap.to(card, {
                    opacity: 1,
                    duration: 0.6,
                    ease: "power2.out"
                });
            }
        });
    });

}

// View All Circle - Flower Hug Effect
function initViewAllMagnetic() {
    const viewAllCircle = document.querySelector('.view-all-circle');
    if (!viewAllCircle) return;

    const circleIcon = viewAllCircle.querySelector('.view-all-circle-icon');
    if (!circleIcon) return;

    // Get the actual size of the beige flower
    const iconRect = circleIcon.getBoundingClientRect();
    const flowerSize = 50;

    // Replace beige flower img with inline SVG for manipulation
    const beigeFlowerSVG = `
        <svg class="view-all-circle-icon beige-flower-svg smallinvisible" viewBox="0 0 31.1 28.3" xmlns="http://www.w3.org/2000/svg">
            <path class="beige-petal-right" d="M23.3,9.7c3.5-2,3.5-7,0-9s-7.8.5-7.8,4.5v18c0,4,4.3,6.5,7.8,4.5s3.5-7,0-9c3.5,2,7.8-.5,7.8-4.5s-4.3-6.5-7.8-4.5Z" fill="#e6e1dd"/>
            <path class="beige-petal-left" d="M7.8.7c-3.5,2-3.5,7,0,9C4.3,7.7,0,10.2,0,14.2s4.3,6.5,7.8,4.5c-3.5,2-3.5,7,0,9s7.8-.5,7.8-4.5V5.2C15.6,1.2,11.2-1.3,7.8.7Z" fill="#e6e1dd"/>
            <g class="beige-flower-face">
                <path class="beige-eye-left" d="M14.3,11.3c-1.2,1.2-3.2,1.2-4.4,0" fill="none" stroke="#1a1a1a" stroke-linecap="round" stroke-miterlimit="10"/>
                <path class="beige-eye-right" d="M21.1,11.3c-1.2,1.2-3.2,1.2-4.4,0" fill="none" stroke="#1a1a1a" stroke-linecap="round" stroke-miterlimit="10"/>
                <path class="beige-mouth" d="M22.2,14.3c-3.7,3.7-9.6,3.7-13.3,0" fill="none" stroke="#1a1a1a" stroke-linecap="round" stroke-miterlimit="10"/>
            </g>
        </svg>
    `;

    circleIcon.outerHTML = beigeFlowerSVG;
    const beigeFlower = viewAllCircle.querySelector('.beige-flower-svg');
    const beigePetalLeft = beigeFlower.querySelector('.beige-petal-left');
    const beigeFace = beigeFlower.querySelector('.beige-flower-face');

    // Create purple flower cursor
    const flowerCursor = document.createElement('div');
    flowerCursor.className = 'flower-hug-cursor triangleCursor';
    flowerCursor.style.fontSize = flowerSize + 'px';
    flowerCursor.innerHTML = `
        ▲
    `;
    document.body.appendChild(flowerCursor);

    const purplePetalRight = flowerCursor.querySelector('.purple-petal-right');
    const purpleFace = flowerCursor.querySelector('.purple-flower-face');
    const purpleArm = flowerCursor.querySelector('.purple-arm');

    // State
    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let isHovering = false;
    let isHugging = false;
    let isLeaving = false;

    // Store original circle position to avoid feedback loop from transforms
    let originalCenter = null;

    function getCircleCenter() {
        // Return cached center if we have it and are hovering (to avoid jitter from transforms)
        if (originalCenter && (isHovering || isLeaving)) {
            return originalCenter;
        }
        const rect = viewAllCircle.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function cacheOriginalCenter() {
        // Reset transform temporarily to get true position
        gsap.set(viewAllCircle, { x: 0, y: 0, scale: 1 });
        const rect = viewAllCircle.getBoundingClientRect();
        originalCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    const HUG_THRESHOLD = 60;
    const UNHUG_THRESHOLD = 90;
    const MAGNETIC_STRENGTH = 0.25;

    function animate() {
        if (isHovering || isLeaving) {
            const center = getCircleCenter();
            const dx = center.x - mouseX;
            const dy = center.y - mouseY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Magnetic effect on entire circle - moves toward cursor and scales up
            const circleRect = viewAllCircle.getBoundingClientRect();
            const maxMagneticDist = circleRect.width;
            const magneticStrength = Math.max(0, 1 - distance / maxMagneticDist) * 20;
            const offsetX = -dx / distance * magneticStrength || 0;
            const offsetY = -dy / distance * magneticStrength || 0;
            const circleScale = 1 + Math.max(0, 1 - distance / maxMagneticDist) * 0.12;

            gsap.to(viewAllCircle, {
                x: offsetX,
                y: offsetY,
                scale: circleScale,
                duration: 0.4,
                ease: 'power2.out'
            });

            // Magnetic pull - stronger as we get closer
            const pullStrength = Math.max(0, 1 - distance / 100) * MAGNETIC_STRENGTH;

            let targetX = mouseX + dx * pullStrength;
            let targetY = mouseY + dy * pullStrength;

            // Trigger hug when close enough
            if (distance < HUG_THRESHOLD && !isHugging) {
                isHugging = true;
                triggerHugAnimation();
            }

            // Release hug when cursor moves far enough away (smooth unhug)
            if (distance > UNHUG_THRESHOLD && isHugging) {
                resetHugAnimation();
            }

            // When hugging, lock to final position (left of beige, accounting for circle's magnetic offset)
            if (isHugging) {
                targetX = center.x + offsetX - flowerSize * 0.25;
                targetY = center.y + offsetY;
            }

            // Smooth interpolation
            cursorX += (targetX - cursorX) * 0.12;
            cursorY += (targetY - cursorY) * 0.12;

            flowerCursor.style.left = cursorX + 'px';
            flowerCursor.style.top = cursorY + 'px';
        }

        requestAnimationFrame(animate);
    }
    animate();

    function triggerHugAnimation() {
        // Purple petal-right (inner side) squishes toward center
        gsap.to(purplePetalRight, {
            scaleX: 0.8,
            x: -3,
            transformOrigin: 'left center',
            duration: 0.4,
            ease: 'power2.out'
        });

        // Purple face: shrink, shift right, rotate toward beige
        gsap.to(purpleFace, {
            x: 2,
            scale: 0.85,
            rotation: 10,
            transformOrigin: 'center center',
            duration: 0.35,
            ease: 'power2.out'
        });

        // Purple arm - curved like in embracing-flowers.svg, shifted left and rotated right
        gsap.to(purpleArm, { opacity: 1, x: -5, y: 1, rotation: 15, transformOrigin: 'left center', duration: 0.3 });

        // Beige petal-left (inner side) squishes toward center
        gsap.to(beigePetalLeft, {
            scaleX: 0.8,
            x: 3,
            transformOrigin: 'right center',
            duration: 0.4,
            ease: 'power2.out'
        });

        // Beige face: shrink, shift right a bit so it's not covered, rotate toward purple
        gsap.to(beigeFace, {
            x: 2,
            scale: 0.85,
            rotation: -10,
            transformOrigin: 'center center',
            duration: 0.35,
            ease: 'power2.out'
        });
    }

    function resetHugAnimation() {
        isHugging = false;

        // Reset purple flower petal
        gsap.to(purplePetalRight, {
            scaleX: 1,
            x: 0,
            duration: 0.3,
            ease: 'power2.out'
        });
        gsap.to(purpleFace, {
            x: 0,
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: 'power2.out'
        });
        gsap.to(purpleArm, {
            opacity: 0,
            x: 0,
            y: 0,
            rotation: 0,
            duration: 0.25
        });

        // Reset beige flower petal
        gsap.to(beigePetalLeft, {
            scaleX: 1,
            x: 0,
            duration: 0.3,
            ease: 'power2.out'
        });
        gsap.to(beigeFace, {
            x: 0,
            scale: 1,
            rotation: 0,
            duration: 0.3,
            ease: 'power2.out'
        });
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    let leaveTimeout = null;

    viewAllCircle.addEventListener('mouseenter', () => {
        // Clear any pending leave timeout if re-entering quickly
        if (leaveTimeout) {
            clearTimeout(leaveTimeout);
            leaveTimeout = null;
        }

        // Cache original center position before any transforms
        cacheOriginalCenter();

        isHovering = true;
        isLeaving = false;
        cursorX = mouseX;
        cursorY = mouseY;
        flowerCursor.classList.add('visible');

        const customCursor = document.querySelector('.custom-cursor');
        if (customCursor) customCursor.classList.add('on-flower-hug');
    });

    viewAllCircle.addEventListener('mouseleave', () => {
        isHovering = false;
        isLeaving = true;
        resetHugAnimation();

        // Reset entire circle position and scale
        gsap.to(viewAllCircle, {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.5,
            ease: 'power2.out'
        });

        // Delay hiding the flower cursor for smooth transition
        leaveTimeout = setTimeout(() => {
            isLeaving = false;
            originalCenter = null; // Clear cached position
            flowerCursor.classList.remove('visible');
            const customCursor = document.querySelector('.custom-cursor');
            if (customCursor) customCursor.classList.remove('on-flower-hug');
        }, 400);
    });
}

// Project card title stagger animation on hover (index.html)
function initProjectCardAnimations() {
    const projectNames = document.querySelectorAll('.project-name');
    if (projectNames.length === 0) return;

    function splitTextIntoChars(element) {
        const text = element.textContent;
        element.textContent = '';
        text.split('').forEach(char => {
            const span = document.createElement('span');
            span.className = 'char';
            span.textContent = char === ' ' ? '\u00A0' : char;
            element.appendChild(span);
        });
        return element.querySelectorAll('.char');
    }

    projectNames.forEach(title => {
        const chars = splitTextIntoChars(title);
        const parentCard = title.closest('.project-card');

        const oddChars = Array.from(chars).filter((_, i) => i % 2 === 1);
        const evenChars = Array.from(chars).filter((_, i) => i % 2 === 0);

        // Start hidden
        gsap.set(oddChars, { yPercent: 120 });
        gsap.set(evenChars, { yPercent: -120 });

        // Animate on hover
        if (parentCard) {
            parentCard.addEventListener('mouseenter', () => {
                gsap.to(oddChars, {
                    yPercent: 0,
                    duration: 0.5,
                    ease: "power2.out",
                    stagger: 0.04
                });
                gsap.to(evenChars, {
                    yPercent: 0,
                    duration: 0.5,
                    ease: "power2.out",
                    stagger: 0.04
                });
            });

            parentCard.addEventListener('mouseleave', () => {
                gsap.to(oddChars, {
                    yPercent: 120,
                    duration: 0.3,
                    ease: "power2.in",
                    stagger: 0.02
                });
                gsap.to(evenChars, {
                    yPercent: -120,
                    duration: 0.3,
                    ease: "power2.in",
                    stagger: 0.02
                });
            });
        }
    });
}

// Adaptive Logo Color - detects background brightness and switches color
function initAdaptiveLogo() {
    const logo = document.querySelector('.logo');
    if (!logo) return;

    // Create an offscreen canvas for sampling
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Sample size - small area behind the logo
    const SAMPLE_SIZE = 50;
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;

    // Brightness threshold: below this = dark background = use beige logo
    const BRIGHTNESS_THRESHOLD = 128;

    // Debounce for performance
    let updateScheduled = false;
    let lastColor = null;

    function getAverageBrightness() {
        const logoRect = logo.getBoundingClientRect();
        const x = logoRect.left;
        const y = logoRect.top;
        const width = Math.min(logoRect.width, SAMPLE_SIZE);
        const height = Math.min(logoRect.height, SAMPLE_SIZE);

        // Use html2canvas alternative: sample from rendered page using getComputedStyle
        // For images, we need a different approach - check what elements are behind

        // Find all elements that might be behind the logo at this position
        const elementsAtPoint = document.elementsFromPoint(x + width / 2, y + height / 2);

        // Look for images or colored backgrounds
        for (const el of elementsAtPoint) {
            if (el === logo || logo.contains(el)) continue;

            // Check for background images (like project cards)
            const bgImage = getComputedStyle(el).backgroundImage;
            if (bgImage && bgImage !== 'none') {
                // If there's a background image, we need to sample it
                return sampleBackgroundImage(el, x, y, width, height);
            }

            // Check for img elements
            if (el.tagName === 'IMG') {
                return sampleImageElement(el, x, y, width, height);
            }

            // Check background color
            const bgColor = getComputedStyle(el).backgroundColor;
            if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
                return getBrightnessFromColor(bgColor);
            }
        }

        // Default: assume light background (soft-beige)
        return 200;
    }

    function sampleImageElement(img, logoX, logoY, logoWidth, logoHeight) {
        try {
            const imgRect = img.getBoundingClientRect();

            // Calculate the portion of the image that's behind the logo
            const offsetX = logoX - imgRect.left;
            const offsetY = logoY - imgRect.top;

            // Scale to actual image dimensions
            const scaleX = img.naturalWidth / imgRect.width;
            const scaleY = img.naturalHeight / imgRect.height;

            const srcX = Math.max(0, offsetX * scaleX);
            const srcY = Math.max(0, offsetY * scaleY);
            const srcWidth = Math.min(logoWidth * scaleX, img.naturalWidth - srcX);
            const srcHeight = Math.min(logoHeight * scaleY, img.naturalHeight - srcY);

            if (srcWidth <= 0 || srcHeight <= 0) return 200;

            // Draw the relevant portion to our canvas
            ctx.clearRect(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

            return calculateCanvasBrightness();
        } catch (e) {
            // CORS or other error
            return 200;
        }
    }

    function sampleBackgroundImage(el, logoX, logoY, logoWidth, logoHeight) {
        // For CSS background images, try to find an img child or return default
        const childImg = el.querySelector('img');
        if (childImg && childImg.complete) {
            return sampleImageElement(childImg, logoX, logoY, logoWidth, logoHeight);
        }
        return 200;
    }

    function calculateCanvasBrightness() {
        try {
            const imageData = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
            const data = imageData.data;
            let totalBrightness = 0;
            let pixelCount = 0;

            // Sample every 4th pixel for performance
            for (let i = 0; i < data.length; i += 16) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];

                if (a > 0) {
                    // Perceived brightness formula
                    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
                    totalBrightness += brightness;
                    pixelCount++;
                }
            }

            return pixelCount > 0 ? totalBrightness / pixelCount : 200;
        } catch (e) {
            return 200;
        }
    }

    function getBrightnessFromColor(colorString) {
        // Parse rgba/rgb color string
        const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            const r = parseInt(match[1]);
            const g = parseInt(match[2]);
            const b = parseInt(match[3]);
            return r * 0.299 + g * 0.587 + b * 0.114;
        }
        return 200;
    }

    function updateLogoColor() {
        const brightness = getAverageBrightness();
        const newColor = brightness < BRIGHTNESS_THRESHOLD ? 'light' : 'dark';

        if (newColor !== lastColor) {
            lastColor = newColor;
            if (newColor === 'light') {
                // Dark background - use beige/light logo
                logo.classList.add('logo-light');
                logo.classList.remove('logo-dark');
            } else {
                // Light background - use dark logo
                logo.classList.remove('logo-light');
                logo.classList.add('logo-dark');
            }
        }

        updateScheduled = false;
    }

    // Throttled update - only check every 150ms during scroll to avoid jank
    let lastUpdateTime = 0;
    const THROTTLE_MS = 150;

    function scheduleUpdate() {
        const now = Date.now();
        if (now - lastUpdateTime < THROTTLE_MS) return;
        lastUpdateTime = now;

        if (!updateScheduled) {
            updateScheduled = true;
            requestAnimationFrame(updateLogoColor);
        }
    }

    // Update on scroll and resize - throttled
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });

    // Initial update after a short delay (wait for images to load)
    setTimeout(updateLogoColor, 100);
}

// Theme Toggle (Light/Dark Mode)
function initThemeToggle() {
    // Create the controls container
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';

    // Create the theme toggle switch
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Toggle dark mode');
    themeToggle.type = 'button';
    themeToggle.innerHTML = `
        <div class="theme-toggle-sun">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="12" cy="12" r="4"/>
                <line x1="12" y1="2" x2="12" y2="5"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="4.22" y1="4.22" x2="6.34" y2="6.34"/>
                <line x1="17.66" y1="17.66" x2="19.78" y2="19.78"/>
                <line x1="2" y1="12" x2="5" y2="12"/>
                <line x1="19" y1="12" x2="22" y2="12"/>
                <line x1="4.22" y1="19.78" x2="6.34" y2="17.66"/>
                <line x1="17.66" y1="6.34" x2="19.78" y2="4.22"/>
            </svg>
        </div>
        <div class="theme-toggle-moon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
        </div>
    `;

    controlsContainer.appendChild(themeToggle);
    document.body.appendChild(controlsContainer);

    // Hide controls when scrolling into contact section
    ScrollTrigger.create({
        trigger: '.contact-section',
        start: 'top bottom',
        end: 'bottom bottom',
        onEnter: () => controlsContainer.classList.add('hidden'),
        onLeaveBack: () => controlsContainer.classList.remove('hidden')
    });

    // Theme is set by inline script in HTML based on page type
    // Do not override - just read the current theme for toggle state
    const currentTheme = document.documentElement.getAttribute('data-theme');

    const sunEl = themeToggle.querySelector('.theme-toggle-sun');
    const moonEl = themeToggle.querySelector('.theme-toggle-moon');
    const sunSvg = sunEl.querySelector('svg');
    const moonSvg = moonEl.querySelector('svg');

    // Set initial visual state based on current theme
    const isDark = currentTheme === 'dark';
    if (isDark) {
        themeToggle.style.backgroundColor = 'rgba(230, 225, 221, 0.3)';
        sunEl.style.backgroundColor = 'transparent';
        moonEl.style.backgroundColor = 'rgba(26, 26, 26, 0.8)';
        gsap.set(sunSvg, { scale: 0 });
        gsap.set(moonSvg, { scale: 1 });
    }

    let isAnimating = false;

    // Awwwards-level smooth animation
    function animateToggle(toDark) {
        if (isAnimating) return;
        isAnimating = true;

        const duration = 0.6;
        const ease = 'power3.inOut';

        if (toDark) {
            // Magnetic pull effect - sun shrinks into itself
            gsap.to(sunEl, {
                backgroundColor: 'transparent',
                duration: duration,
                ease: ease
            });
            gsap.to(sunSvg, {
                scale: 0,
                rotation: 360,
                duration: duration * 0.7,
                ease: 'power4.in'
            });

            // Moon emerges with elastic reveal
            gsap.to(moonEl, {
                backgroundColor: 'rgba(26, 26, 26, 0.8)',
                duration: duration,
                ease: ease
            });
            gsap.fromTo(moonSvg,
                { scale: 0, rotation: -180 },
                {
                    scale: 1,
                    rotation: 0,
                    duration: duration,
                    delay: duration * 0.3,
                    ease: 'elastic.out(1, 0.5)'
                }
            );

            // Background with subtle morph
            gsap.to(themeToggle, {
                backgroundColor: 'rgba(230, 225, 221, 0.3)',
                duration: duration,
                ease: ease,
                onComplete: () => { isAnimating = false; }
            });

        } else {
            // Moon fades with rotation
            gsap.to(moonEl, {
                backgroundColor: 'transparent',
                duration: duration,
                ease: ease
            });
            gsap.to(moonSvg, {
                scale: 0,
                rotation: 180,
                duration: duration * 0.7,
                ease: 'power4.in'
            });

            // Sun bursts back with rays spinning
            gsap.to(sunEl, {
                backgroundColor: 'rgba(230, 225, 221, 0.8)',
                duration: duration,
                ease: ease
            });
            gsap.fromTo(sunSvg,
                { scale: 0, rotation: -360 },
                {
                    scale: 1,
                    rotation: 0,
                    duration: duration,
                    delay: duration * 0.3,
                    ease: 'elastic.out(1, 0.5)'
                }
            );

            // Background morph
            gsap.to(themeToggle, {
                backgroundColor: 'rgba(26, 26, 26, 0.3)',
                duration: duration,
                ease: ease,
                onComplete: () => { isAnimating = false; }
            });
        }
    }

    // Toggle theme on click
    themeToggle.addEventListener('click', () => {
        if (isAnimating) return;

        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        animateToggle(newTheme === 'dark');
        document.documentElement.setAttribute('data-theme', newTheme);
    });
}

// Scroll-based theme switch for index, works, and project pages
function initFooterThemeSwitch() {
    function switchTheme() {
        // Skip automatic theme switching on mobile (below 768px)
        if (window.innerWidth < 768) return;

        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        updateThemeToggleVisuals(newTheme === 'dark');
    }

    // Index page: trigger when projects section leaves viewport
    const projectsSection = document.querySelector('.projects-section');
    if (projectsSection) {
        ScrollTrigger.create({
            trigger: projectsSection,
            start: 'bottom top',
            onEnter: switchTheme,
            onLeaveBack: switchTheme
        });
        return;
    }

    // Works page and project pages: trigger when marquee reaches center of viewport
    const marquee = document.querySelector('.contact-marquee-wrapper');
    const isWorksPage = document.body.classList.contains('works-page');
    const isProjectPage = document.body.classList.contains('project-page');
    if (marquee && (isWorksPage || isProjectPage)) {
        ScrollTrigger.create({
            trigger: marquee,
            start: 'center center',
            onEnter: switchTheme,
            onLeaveBack: switchTheme
        });
    }
}

// Process Section – scroll reveal & timeline animation
function initProcessSectionAnimations() {
    const section = document.querySelector('.process-section');
    if (!section || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const header = section.querySelector('.process-header');
    const steps = section.querySelectorAll('.process-step');

    if (header) {
        gsap.set(header, { opacity: 0, y: 40 });

        ScrollTrigger.create({
            trigger: section,
            start: 'top 80%',
            once: true,
            onEnter: () => {
                gsap.to(header, {
                    opacity: 1,
                    y: 0,
                    duration: 0.9,
                    ease: 'power3.out'
                });
            }
        });
    }

    if (steps.length) {
        gsap.set(steps, { opacity: 0, y: 30, scale: 0.98 });

        ScrollTrigger.batch(steps, {
            start: 'top 85%',
            once: true,
            onEnter: (batch) => {
                gsap.to(batch, {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.7,
                    ease: 'power3.out',
                    stagger: 0.08
                });
            }
        });
    }
}

// Helper to update theme toggle button visuals without triggering click
function updateThemeToggleVisuals(isDark) {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;

    const sunEl = themeToggle.querySelector('.theme-toggle-sun');
    const moonEl = themeToggle.querySelector('.theme-toggle-moon');
    const sunSvg = sunEl?.querySelector('svg');
    const moonSvg = moonEl?.querySelector('svg');

    if (!sunEl || !moonEl || !sunSvg || !moonSvg) return;

    const duration = 0.6;
    const ease = 'power3.inOut';

    if (isDark) {
        gsap.to(sunEl, { backgroundColor: 'transparent', duration, ease });
        gsap.to(sunSvg, { scale: 0, rotation: 360, duration: duration * 0.7, ease: 'power4.in' });
        gsap.to(moonEl, { backgroundColor: 'rgba(26, 26, 26, 0.8)', duration, ease });
        gsap.to(moonSvg, { scale: 1, rotation: 0, duration, ease: 'elastic.out(1, 0.5)' });
        gsap.to(themeToggle, { backgroundColor: 'rgba(230, 225, 221, 0.3)', duration, ease });
    } else {
        gsap.to(moonEl, { backgroundColor: 'transparent', duration, ease });
        gsap.to(moonSvg, { scale: 0, rotation: 180, duration: duration * 0.7, ease: 'power4.in' });
        gsap.to(sunEl, { backgroundColor: 'rgba(230, 225, 221, 0.8)', duration, ease });
        gsap.to(sunSvg, { scale: 1, rotation: 0, duration, ease: 'elastic.out(1, 0.5)' });
        gsap.to(themeToggle, { backgroundColor: 'rgba(26, 26, 26, 0.3)', duration, ease });
    }
}

