// ABOUTME: Reusable logo component that generates the site logo as a clickable link.
// ABOUTME: Automatically handles relative paths for subdirectories like /projects/.

(function() {
    'use strict';

    // Detect if we're in a subdirectory (e.g., /projects/)
    function getBasePath() {
        const path = window.location.pathname;
        if (path.includes('/projects/')) {
            return '../';
        }
        return '';
    }

    // Generate logo HTML as a link to homepage
    function createLogoHTML() {
        const basePath = getBasePath();
        const homeUrl = basePath + 'index.html';

        return `
            <span class="logotype">V<span class="maincolor">.</span>APP</span>
        `;
    }

    // Initialize logo in container
    function initLogo() {
        const logoContainer = document.querySelector('.logo');
        if (!logoContainer) {
            return;
        }

        // Clear existing content and inject new logo
        logoContainer.innerHTML = createLogoHTML();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initLogo);
    } else {
        initLogo();
    }

    // Export for external use if needed
    window.LogoComponent = {
        init: initLogo
    };
})();
