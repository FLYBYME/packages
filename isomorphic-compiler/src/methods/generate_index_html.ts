import { SiteManifest, AppIcon } from '@flybyme/isomorphic-core';
import * as path from 'path';

/**
 * generate_index_html
 * Generates the main index.html file with necessary meta tags, 
 * CSS links, and script inclusions.
 * Includes automatic cache-busting.
 */
export function generate_index_html(manifest: SiteManifest, bundlePath: string, generatedAssets: string[] = []): string {
    const seo = manifest.app.seo;
    const icons: AppIcon[] = manifest.app.icons || [];
    const mainIcon = icons.find((i: AppIcon) => i.sizes === '192x192') || icons[0];

    // Derive the CSS path from the JS bundle path
    const cssFileName = path.basename(bundlePath).replace('.js', '.css');
    const hasBundleCss = generatedAssets.includes(cssFileName);
    const cssPath = bundlePath.replace('.js', '.css');

    // Add a unique version timestamp for cache busting
    const version = Date.now();
    const bundleWithVersion = `${bundlePath}?v=${version}`;
    const cssWithVersion = hasBundleCss ? `${cssPath}?v=${version}` : null;

    const globalStyles = manifest.assets?.globalStyles || [];
    const styleLinks = globalStyles.map(style => `<link rel="stylesheet" href="${style}">`).join('\n    ');

    return `
<!DOCTYPE html>
<html lang="${manifest.i18n.defaultLocale || 'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${seo.defaultTitle}</title>
    <meta name="description" content="${seo.defaultDescription}">
    <meta name="theme-color" content="${manifest.app.themeColor}">
    ${mainIcon ? `<link rel="icon" type="${mainIcon.type}" href="${mainIcon.src}">` : ''}
    
    <!-- Global Styles -->
    ${styleLinks}

    <!-- Bundle CSS -->
    ${cssWithVersion ? `<link rel="stylesheet" href="${cssWithVersion}">` : ''}

    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json">

    <style>
        /* 1. Global Box Sizing */
        *, *::before, *::after {
            box-sizing: border-box;
        }
        
        /* 2. Strict Viewport Lock */
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden; /* CRITICAL: Prevents the whole browser tab from scrolling */
            background: ${manifest.app.background};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        /* 3. App Wrapper */
        #mesh-root-app {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
    </style>
</head>
<body>
    <div id="mesh-root-app"></div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script type="module" src="${bundleWithVersion}"></script>
</body>
</html>
    `;
}
