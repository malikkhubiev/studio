// ABOUTME: Reusable menu component that generates the navigation menu dynamically.
// ABOUTME: Handles menu open/close animations using GSAP and manages social links.

(function() {
    'use strict';

    // Configuration
    const SOCIAL_LINKS = {
        linkedin: 'https://www.linkedin.com/in/eszterbial',
        behance: 'https://www.behance.net/eszterbial',
        instagram: 'https://www.instagram.com/eszterbial/'
    };

    // Detect if we're in a subdirectory (e.g., /projects/)
    function getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/projects/')) {
            return '../';
        }
        return '';
    }

    // Check if mobile viewport
    function isMobile() {
        return window.innerWidth <= 768;
    }

    // Generate menu HTML
    function createMenuHTML() {
        const basePath = getBasePath();

        // Theme toggle HTML for mobile menu
        const themeToggleHTML = `
            <div class="menu-theme-toggle" id="menuThemeToggle">
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
            </div>
        `;

        return `
            <div class="menu-btn" id="menuBtn">MENU</div>
            <div class="menu-card" id="menuCard">
                <div class="menu-close-btn" id="closeBtn">
                    <svg width="60" height="20" viewBox="0 0 60 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L59 19" stroke="black" stroke-width="1"/>
                        <path d="M59 1L1 19" stroke="black" stroke-width="1"/>
                    </svg>
                </div>
                <nav class="menu-items">
                    <a href="${basePath}index.html" class="menu-link"><div class="menu-link-inner">HOME</div></a>
                    <a href="${basePath}about.html" class="menu-link"><div class="menu-link-inner">ABOUT</div></a>
                    <a href="${basePath}works.html" class="menu-link"><div class="menu-link-inner">WORK</div></a>
                    <a href="#contact" class="menu-link"><div class="menu-link-inner">CONTACT</div></a>
                    ${themeToggleHTML}
                </nav>
                <div class="menu-separator"></div>
                <div class="menu-footer">
                    <a href="${SOCIAL_LINKS.linkedin}" target="_blank" rel="noopener noreferrer" class="social-link">LINKEDIN ↗</a>
                    <a href="${SOCIAL_LINKS.behance}" target="_blank" rel="noopener noreferrer" class="social-link">BEHANCE ↗</a>
                    <a href="${SOCIAL_LINKS.instagram}" target="_blank" rel="noopener noreferrer" class="social-link">INSTAGRAM ↗</a>
                </div>
            </div>
        `;
    }

    // Initialize menu in container
    function initMenu() {
        const menuContainer = document.querySelector('.menu-container');
        if (!menuContainer) {
            console.warn('Menu container not found');
            return;
        }

        // Clear existing content and inject new menu
        menuContainer.innerHTML = createMenuHTML();

        // Get elements
        const menuBtn = document.getElementById('menuBtn');
        const menuCard = document.getElementById('menuCard');
        const closeBtn = document.getElementById('closeBtn');

        if (!menuBtn || !menuCard || !closeBtn) {
            console.error('Menu elements not found after injection');
            return;
        }

        const menuLinks = menuCard.querySelectorAll('.menu-link');
        const menuSeparator = menuCard.querySelector('.menu-separator');
        const menuFooterLinks = menuCard.querySelectorAll('.social-link');
        const menuCloseIcon = closeBtn.querySelector('svg');

        // Initialize menu theme toggle
        initMenuThemeToggle();

        // Set initial state
        gsap.set(menuCard, {
            opacity: 0,
            visibility: 'hidden',
            scale: 0.95,
            transformOrigin: "top right",
            clipPath: "none"
        });

        // Open menu handler
        function openMenu() {
            // Reset elements for entrance
            gsap.set(menuCard, {
                visibility: 'visible',
                opacity: 0,
                scale: 0.95
            });

            // Prepare text for "rise up" animation
            gsap.set('.menu-link-inner', { y: "150%", x: "0%" });
            gsap.set(menuSeparator, { scaleX: 0, opacity: 1, transformOrigin: "left center" });
            gsap.set(menuFooterLinks, { y: 20, opacity: 0 });
            gsap.set(menuCloseIcon, { rotation: -180, opacity: 0 });

            const tl = gsap.timeline();

            // 1. Card appears (Fade + Scale)
            tl.to(menuCard, {
                duration: 0.5,
                opacity: 1,
                scale: 1,
                ease: "power3.out"
            })
            // 2. Links rise up from below
            .to('.menu-link-inner', {
                duration: 0.8,
                y: "0%",
                stagger: 0.1,
                ease: "power4.out"
            }, "-=0.3")
            // 3. Separator grows
            .to(menuSeparator, {
                duration: 0.6,
                scaleX: 1,
                ease: "power3.out"
            }, "-=0.6")
            // 4. Footer links slide up
            .to(menuFooterLinks, {
                duration: 0.6,
                y: 0,
                opacity: 1,
                stagger: 0.05,
                ease: "power3.out"
            }, "-=0.5")
            // 5. Close icon spins in
            .to(menuCloseIcon, {
                duration: 0.6,
                rotation: 0,
                opacity: 1,
                ease: "back.out(1.7)"
            }, "-=0.6");

            // Initialize letter hover after menu opens
            setTimeout(initMenuLetterHover, 100);
        }

        // Close menu handler
        function closeMenu() {
            const tl = gsap.timeline({
                onComplete: () => {
                    gsap.set(menuCard, { visibility: 'hidden' });
                }
            });

            // 1. Links sink down
            tl.to(menuCard.querySelectorAll('.menu-link-inner'), {
                duration: 0.4,
                y: "150%",
                stagger: 0.05,
                ease: "power2.in"
            })
            // 2. Other elements fade out
            .to([menuSeparator, menuFooterLinks, menuCloseIcon], {
                duration: 0.3,
                opacity: 0,
                ease: "power1.in"
            }, "-=0.3")
            // 3. Card fades and scales down
            .to(menuCard, {
                duration: 0.4,
                opacity: 0,
                scale: 0.95,
                ease: "power2.inOut"
            }, "-=0.2");
        }

        // Event listeners
        menuBtn.addEventListener('click', openMenu);
        closeBtn.addEventListener('click', closeMenu);

        // Smooth scroll for contact link
        const contactLink = menuCard.querySelector('a[href="#contact"]');
        if (contactLink) {
            contactLink.addEventListener('click', (e) => {
                e.preventDefault();
                const contactSection = document.getElementById('contact');
                if (contactSection) {
                    closeMenu();
                    // Wait for menu close animation, then scroll
                    setTimeout(() => {
                        if (typeof lenis !== 'undefined') {
                            lenis.scrollTo(contactSection, {
                                duration: 1.8,
                                easing: (t) => 1 - Math.pow(1 - t, 4)
                            });
                        } else {
                            contactSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }, 500);
                }
            });
        }

        // Close menu when clicking outside
        document.addEventListener('click', (event) => {
            const isClickInsideMenu = menuCard.contains(event.target);
            const isClickOnMenuBtn = menuBtn.contains(event.target);
            const isMenuVisible = gsap.getProperty(menuCard, "opacity") > 0;

            if (!isClickInsideMenu && !isClickOnMenuBtn && isMenuVisible) {
                closeMenu();
            }
        });

        // Close menu on Escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const isMenuVisible = gsap.getProperty(menuCard, "opacity") > 0;
                if (isMenuVisible) {
                    closeMenu();
                }
            }
        });
    }

    // Menu letter stagger hover animation
    function initMenuLetterHover() {
        const menuLinks = document.querySelectorAll('.menu-link-inner');

        menuLinks.forEach(link => {
            // Skip if already initialized
            if (link.dataset.hoverInitialized) return;
            link.dataset.hoverInitialized = 'true';

            const text = link.textContent;
            link.textContent = '';

            // Create two rows: original and clone for hover swap
            const originalRow = document.createElement('span');
            originalRow.className = 'menu-text-row menu-text-original';

            const cloneRow = document.createElement('span');
            cloneRow.className = 'menu-text-row menu-text-clone';

            // Split text into chars for both rows
            text.split('').forEach(char => {
                const origChar = document.createElement('span');
                origChar.className = 'char';
                origChar.textContent = char === ' ' ? '\u00A0' : char;
                originalRow.appendChild(origChar);

                const cloneChar = document.createElement('span');
                cloneChar.className = 'char';
                cloneChar.textContent = char === ' ' ? '\u00A0' : char;
                cloneRow.appendChild(cloneChar);
            });

            link.appendChild(originalRow);
            link.appendChild(cloneRow);

            // Style the rows
            link.style.display = 'block';
            link.style.position = 'relative';
            link.style.clipPath = 'inset(-20% 0 -20% 0)';

            originalRow.style.display = 'block';
            cloneRow.style.display = 'block';
            cloneRow.style.position = 'absolute';
            cloneRow.style.top = '0';
            cloneRow.style.left = '0';

            const origChars = originalRow.querySelectorAll('.char');
            const cloneChars = cloneRow.querySelectorAll('.char');

            // Set initial state - clone chars positioned below
            gsap.set(cloneChars, { yPercent: 120 });

            const parentLink = link.closest('.menu-link');

            let hoverTl = null;
            let isHovered = false;

            parentLink.addEventListener('mouseenter', () => {
                isHovered = true;
                if (hoverTl) hoverTl.kill();

                hoverTl = gsap.timeline();
                // Original chars go up
                hoverTl.to(origChars, {
                    yPercent: -120,
                    duration: 0.5,
                    ease: "power2.out",
                    stagger: 0.04
                }, 0);
                // Clone chars come up to center
                hoverTl.to(cloneChars, {
                    yPercent: 0,
                    duration: 0.5,
                    ease: "power2.out",
                    stagger: 0.04
                }, 0);
            });

            parentLink.addEventListener('mouseleave', () => {
                isHovered = false;

                // Wait for hover animation to complete before reversing
                const onComplete = () => {
                    if (isHovered) return; // User re-entered during wait
                    if (hoverTl) hoverTl.kill();

                    hoverTl = gsap.timeline();
                    // Original chars return to center
                    hoverTl.to(origChars, {
                        yPercent: 0,
                        duration: 0.5,
                        ease: "power2.out",
                        stagger: 0.04
                    }, 0);
                    // Clone chars go back down
                    hoverTl.to(cloneChars, {
                        yPercent: 120,
                        duration: 0.5,
                        ease: "power2.out",
                        stagger: 0.04
                    }, 0);
                };

                if (hoverTl && hoverTl.isActive()) {
                    hoverTl.then(onComplete);
                } else {
                    onComplete();
                }
            });
        });
    }

    // Initialize theme toggle in mobile menu
    function initMenuThemeToggle() {
        const menuThemeToggle = document.getElementById('menuThemeToggle');
        if (!menuThemeToggle) return;

        const sunEl = menuThemeToggle.querySelector('.theme-toggle-sun');
        const moonEl = menuThemeToggle.querySelector('.theme-toggle-moon');
        const sunSvg = sunEl?.querySelector('svg');
        const moonSvg = moonEl?.querySelector('svg');

        if (!sunEl || !moonEl || !sunSvg || !moonSvg) return;

        // Set initial visual state based on current theme
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const isDark = currentTheme === 'dark';

        if (isDark) {
            menuThemeToggle.style.backgroundColor = 'rgba(230, 225, 221, 0.3)';
            sunEl.style.backgroundColor = 'transparent';
            moonEl.style.backgroundColor = 'rgba(26, 26, 26, 0.8)';
            gsap.set(sunSvg, { scale: 0 });
            gsap.set(moonSvg, { scale: 1 });
        } else {
            menuThemeToggle.style.backgroundColor = 'rgba(26, 26, 26, 0.3)';
            sunEl.style.backgroundColor = 'rgba(230, 225, 221, 0.8)';
            moonEl.style.backgroundColor = 'transparent';
            gsap.set(sunSvg, { scale: 1 });
            gsap.set(moonSvg, { scale: 0 });
        }

        let isAnimating = false;

        function animateToggle(toDark) {
            if (isAnimating) return;
            isAnimating = true;

            const duration = 0.6;
            const ease = 'power3.inOut';

            if (toDark) {
                gsap.to(sunEl, { backgroundColor: 'transparent', duration, ease });
                gsap.to(sunSvg, { scale: 0, rotation: 360, duration: duration * 0.7, ease: 'power4.in' });
                gsap.to(moonEl, { backgroundColor: 'rgba(26, 26, 26, 0.8)', duration, ease });
                gsap.to(moonSvg, { scale: 1, rotation: 0, duration, ease: 'elastic.out(1, 0.5)' });
                gsap.to(menuThemeToggle, { backgroundColor: 'rgba(230, 225, 221, 0.3)', duration, ease, onComplete: () => { isAnimating = false; } });
            } else {
                gsap.to(moonEl, { backgroundColor: 'transparent', duration, ease });
                gsap.to(moonSvg, { scale: 0, rotation: 180, duration: duration * 0.7, ease: 'power4.in' });
                gsap.to(sunEl, { backgroundColor: 'rgba(230, 225, 221, 0.8)', duration, ease });
                gsap.to(sunSvg, { scale: 1, rotation: 0, duration, ease: 'elastic.out(1, 0.5)' });
                gsap.to(menuThemeToggle, { backgroundColor: 'rgba(26, 26, 26, 0.3)', duration, ease, onComplete: () => { isAnimating = false; } });
            }
        }

        menuThemeToggle.addEventListener('click', () => {
            if (isAnimating) return;

            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            animateToggle(newTheme === 'dark');
            document.documentElement.setAttribute('data-theme', newTheme);
        });
    }

    // Initialize when DOM is ready and GSAP is available
    function safeInitMenu() {
        if (typeof gsap === 'undefined') {
            setTimeout(safeInitMenu, 50);
            return;
        }
        initMenu();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInitMenu);
    } else {
        safeInitMenu();
    }

    // Export for external use if needed
    window.MenuComponent = {
        init: initMenu,
        socialLinks: SOCIAL_LINKS
    };
})();
