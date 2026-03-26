import { SiteManifest } from '@flybyme/isomorphic-core';

/**
 * StyleEngine - JIT CSS Generator
 * Generates utility classes and CSS variables based on the SiteManifest.
 */
export class StyleEngine {
    private static STYLE_ID = 'mesh-dynamic-styles';

    public static init(manifest: SiteManifest): void {
        if (typeof document === 'undefined') return;

        let styleTag = document.getElementById(this.STYLE_ID) as HTMLStyleElement;
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = this.STYLE_ID;
            document.head.appendChild(styleTag);
        }

        const css = this.generateCSS(manifest);
        styleTag.textContent = css;
    }

    private static generateCSS(manifest: SiteManifest): string {
        const tokens = manifest.design?.tokens;
        if (!tokens) return '';

        let css = `
/* 1. UNIVERSAL COMPATIBILITY RESET */
html, body { 
    margin: 0 !important; 
    padding: 0 !important; 
    width: 100% !important; 
    height: 100% !important; 
    overflow: hidden !important; 
    background-color: ${manifest.app.background || '#020617'} !important;
    -webkit-text-size-adjust: 100%;
    overscroll-behavior: none;
}

*, *::before, *::after { box-sizing: border-box; }

#mesh-root-app {
    width: 100% !important;
    height: 100% !important;
    display: flex !important;
    flex-direction: column !important;
}

:root {\n`;

        // 1. CSS Variables - Colors
        if (tokens.colors) {
            Object.entries(tokens.colors).forEach(([name, value]) => {
                css += `  --mesh-color-${name}: ${value};\n`;
            });
        }

        // 2. CSS Variables - Spacing
        if (tokens.spacing) {
            if (!tokens.spacing.xs) tokens.spacing.xs = '4px';
            Object.entries(tokens.spacing).forEach(([name, value]) => {
                css += `  --mesh-spacing-${name}: ${value};\n`;
            });
        }

        // 3. CSS Variables - Typography Sizes
        if (tokens.typography?.sizes) {
            Object.entries(tokens.typography.sizes).forEach(([name, value]) => {
                css += `  --mesh-text-${name}: ${value};\n`;
            });
        }

        css += '}\n\n';

        // 4. Color Utilities
        if (tokens.colors) {
            Object.keys(tokens.colors).forEach(name => {
                css += `.mesh-bg-${name} { background-color: var(--mesh-color-${name}) !important; }\n`;
                css += `.mesh-text-${name} { color: var(--mesh-color-${name}) !important; }\n`;
            });
        }

        // 5. Typography Utility
        if (tokens.typography?.sizes) {
            Object.keys(tokens.typography.sizes).forEach(name => {
                css += `.mesh-text-${name} { font-size: var(--mesh-text-${name}) !important; }\n`;
            });
        }

        // 6. Interactive Primitives
        css += `
.mesh-nav-link { 
    display: block; 
    cursor: pointer; 
    transition: background-color 0.2s ease, color 0.2s ease; 
    text-decoration: none;
    color: inherit;
}
.mesh-nav-link:hover { background-color: var(--mesh-color-elevated) !important; color: var(--mesh-color-primary) !important; }
.mesh-nav-link.active { background-color: var(--mesh-color-primary) !important; color: #fff !important; }

.mesh-font-bold { font-weight: bold !important; }
.mesh-font-normal { font-weight: normal !important; }
.mesh-font-light { font-weight: 300 !important; }

.mesh-min-w-0 { min-width: 0 !important; min-height: 0 !important; }
`;

        return css;
    }
}
