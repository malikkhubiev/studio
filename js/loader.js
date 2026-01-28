// ABOUTME: Page loader that tracks actual content loading progress
// ABOUTME: Shows column animation with percentage counter based on image load progress

(function() {
    'use strict';

    const loader = document.querySelector('.loader');
    const loaderCounter = document.querySelector('.loader-counter');
    const loaderCols = document.querySelectorAll('.loader-col');

    // UX/UI width matching is now handled via CSS media queries
    // (font-size calculated as DESIGNER-vw * 8/5 character ratio)
    // This stub is kept for backward compatibility with resize handler in script.js
    window.matchUxUiWidthToDesigner = function matchUxUiWidthToDesigner() {
        // No-op: CSS handles font-size calculation to prevent CLS
    };

    if (!loader || !loaderCounter) return;

    // Get all images on the page
    const images = Array.from(document.querySelectorAll('img'));
    // Also track background images in elements with inline styles
    const bgElements = Array.from(document.querySelectorAll('[style*="background-image"]'));

    // Force lazy images to load immediately by removing lazy attribute
    images.forEach(img => {
        if (img.loading === 'lazy') {
            img.loading = 'eager';
        }
    });

    const totalAssets = images.length + bgElements.length;
    let loadedAssets = 0;
    let displayedPercent = 0;

    // If no assets to load, show quick animation
    if (totalAssets === 0) {
        animateToPercent(100, completeLoader);
        return;
    }

    function updateProgress() {
        loadedAssets++;
        const actualPercent = Math.round((loadedAssets / totalAssets) * 100);
        animateToPercent(actualPercent, loadedAssets >= totalAssets ? completeLoader : null);
    }

    function animateToPercent(targetPercent, onComplete) {
        const animate = () => {
            if (displayedPercent < targetPercent) {
                displayedPercent += Math.ceil((targetPercent - displayedPercent) / 10) || 1;
                if (displayedPercent > targetPercent) displayedPercent = targetPercent;
                loaderCounter.innerHTML = displayedPercent + '%';
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };
        animate();
    }

    function completeLoader() {
        // Wait for GSAP to be available
        if (typeof gsap === 'undefined') {
            setTimeout(completeLoader, 50);
            return;
        }

        // Decode all images before completing to prevent jank during scroll
        const decodePromises = images.map(img => {
            if (img.decode) {
                return img.decode().catch(() => {});
            }
            return Promise.resolve();
        });

        Promise.all(decodePromises).then(finishLoader);
    }

    function finishLoader() {
        // Calculate UX/UI font-size before revealing content to prevent CLS
        window.matchUxUiWidthToDesigner();

        const tl = gsap.timeline({
            onComplete: () => {
                gsap.set(loader, { display: 'none' });
            }
        });

        tl.to(loaderCounter, {
            duration: 0.5,
            opacity: 0,
            y: -50,
            ease: "power2.in"
        })
        .to(loaderCols, {
            duration: 1.2,
            scaleY: 0,
            stagger: 0.1,
            ease: "power4.inOut",
            onStart: () => {
                // Animate grid lines as loader columns disappear
                gsap.to(".grid-background .line", {
                    duration: 1.5,
                    scaleY: 1,
                    stagger: 0.08,
                    ease: "power3.inOut",
                    delay: 0.6
                });
                // Dispatch event shortly after columns start animating
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('loaderComplete'));
                }, 500);
            }
        }, "-=0.2");
    }

    // Track image loading
    images.forEach(img => {
        if (img.complete) {
            updateProgress();
        } else {
            img.addEventListener('load', updateProgress);
            img.addEventListener('error', updateProgress);
        }
    });

    // Track background images
    bgElements.forEach(el => {
        const style = el.getAttribute('style');
        const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (match && match[1]) {
            const bgImg = new Image();
            bgImg.onload = updateProgress;
            bgImg.onerror = updateProgress;
            bgImg.src = match[1];
        } else {
            updateProgress();
        }
    });

    // Fallback: if loading takes too long, complete anyway
    setTimeout(() => {
        if (displayedPercent < 100) {
            animateToPercent(100, completeLoader);
        }
    }, 8000);
})();
