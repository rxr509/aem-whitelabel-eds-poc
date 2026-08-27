/**
 * Design Token Sync Script
 *
 * This script copies design token CSS files from the @sherwin-williams-co/chroma-design-tokens
 * package into the project's styles directory. This maintains the no-build nature of
 * AEM Edge Delivery Services while allowing use of external design tokens.
 *
 * Run with: npm run sync-tokens
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, '..');
const TOKENS_PACKAGE = '@sherwin-williams-co/chroma-design-tokens';
const TOKENS_SOURCE = join(PROJECT_ROOT, 'node_modules', TOKENS_PACKAGE);
const TOKENS_DEST = join(PROJECT_ROOT, 'styles', 'tokens');

/**
 * Recursively find all CSS files in a directory
 * @param {string} dir - Directory to search
 * @param {string[]} files - Accumulated files
 * @returns {string[]} Array of CSS file paths
 */
function findCssFiles(dir, files = []) {
  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      findCssFiles(fullPath, files);
    } else if (entry.endsWith('.css')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Copy design token CSS files to project styles directory
 */
function syncTokens() {
  console.log('🎨 Syncing design tokens from', TOKENS_PACKAGE);

  // Check if the package is installed
  if (!existsSync(TOKENS_SOURCE)) {
    console.error(`❌ Package ${TOKENS_PACKAGE} not found. Run 'npm install' first.`);
    process.exit(1);
  }

  // Create destination directory
  if (!existsSync(TOKENS_DEST)) {
    mkdirSync(TOKENS_DEST, { recursive: true });
    console.log('📁 Created tokens directory:', TOKENS_DEST);
  }

  // Common paths where design tokens packages store CSS
  const possiblePaths = [
    join(TOKENS_SOURCE, 'css'),
    join(TOKENS_SOURCE, 'dist', 'css'),
    join(TOKENS_SOURCE, 'dist'),
    join(TOKENS_SOURCE, 'build', 'css'),
    join(TOKENS_SOURCE, 'tokens'),
    TOKENS_SOURCE,
  ];

  let cssFiles = [];
  let sourcePath = null;

  // Find CSS files in the package
  for (const searchPath of possiblePaths) {
    const found = findCssFiles(searchPath);
    if (found.length > 0) {
      cssFiles = found;
      sourcePath = searchPath;
      break;
    }
  }

  if (cssFiles.length === 0) {
    console.log('⚠️  No CSS files found in the design tokens package.');
    console.log('   The package may use a different format (JSON, JS, etc.).');
    console.log('   You may need to manually create CSS custom properties from the token values.');

    // List what's in the package to help debug
    console.log('\n📂 Package contents:');
    const entries = readdirSync(TOKENS_SOURCE);
    entries.forEach((entry) => console.log(`   - ${entry}`));

    // Create a placeholder tokens file
    createPlaceholderTokens();
    return;
  }

  console.log(`📄 Found ${cssFiles.length} CSS file(s) in ${sourcePath}`);

  // Copy each CSS file
  cssFiles.forEach((file) => {
    const relativePath = file.replace(sourcePath, '').replace(/^\//, '');
    const destPath = join(TOKENS_DEST, relativePath);
    const destDir = dirname(destPath);

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }

    copyFileSync(file, destPath);
    console.log(`   ✅ Copied: ${relativePath}`);
  });

  console.log('\n✨ Design tokens synced successfully!');
  console.log('   Import them in your CSS with: @import url("/styles/tokens/[filename].css");');
}

/**
 * Create placeholder token file with common token structure
 */
function createPlaceholderTokens() {
  const placeholderContent = `/*
 * Sherwin-Williams Chroma Design Tokens
 * 
 * This is a placeholder file. After running 'npm install' and 'npm run sync-tokens',
 * check the @sherwin-williams-co/chroma-design-tokens package for available token formats.
 * 
 * Common token categories typically include:
 * - Colors (brand, semantic, palette)
 * - Typography (font families, sizes, weights, line heights)
 * - Spacing (padding, margin, gaps)
 * - Border (radius, width)
 * - Shadow (elevation)
 * - Animation (duration, easing)
 * 
 * Update this file with actual token values from the package.
 */

:root {
  /* =============================================
   * COLORS - Brand
   * ============================================= */
  --chroma-color-brand-primary: #0069af;
  --chroma-color-brand-secondary: #003057;
  --chroma-color-brand-accent: #ffc72c;

  /* =============================================
   * COLORS - Semantic
   * ============================================= */
  --chroma-color-background: #ffffff;
  --chroma-color-background-subtle: #f5f5f5;
  --chroma-color-surface: #ffffff;
  --chroma-color-text-primary: #1a1a1a;
  --chroma-color-text-secondary: #666666;
  --chroma-color-text-inverse: #ffffff;
  --chroma-color-link: #0069af;
  --chroma-color-link-hover: #004d80;
  --chroma-color-border: #e0e0e0;
  --chroma-color-border-strong: #999999;

  /* =============================================
   * COLORS - Status
   * ============================================= */
  --chroma-color-success: #2e7d32;
  --chroma-color-warning: #ed6c02;
  --chroma-color-error: #d32f2f;
  --chroma-color-info: #0288d1;

  /* =============================================
   * TYPOGRAPHY - Font Families
   * ============================================= */
  --chroma-font-family-sans: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --chroma-font-family-heading: 'Oswald', 'Open Sans', sans-serif;
  --chroma-font-family-mono: 'Roboto Mono', 'Courier New', monospace;

  /* =============================================
   * TYPOGRAPHY - Font Sizes
   * ============================================= */
  --chroma-font-size-xs: 0.75rem;
  --chroma-font-size-sm: 0.875rem;
  --chroma-font-size-base: 1rem;
  --chroma-font-size-lg: 1.125rem;
  --chroma-font-size-xl: 1.25rem;
  --chroma-font-size-2xl: 1.5rem;
  --chroma-font-size-3xl: 1.875rem;
  --chroma-font-size-4xl: 2.25rem;
  --chroma-font-size-5xl: 3rem;
  --chroma-font-size-6xl: 3.75rem;

  /* =============================================
   * TYPOGRAPHY - Font Weights
   * ============================================= */
  --chroma-font-weight-light: 300;
  --chroma-font-weight-normal: 400;
  --chroma-font-weight-medium: 500;
  --chroma-font-weight-semibold: 600;
  --chroma-font-weight-bold: 700;

  /* =============================================
   * TYPOGRAPHY - Line Heights
   * ============================================= */
  --chroma-line-height-tight: 1.25;
  --chroma-line-height-normal: 1.5;
  --chroma-line-height-relaxed: 1.75;

  /* =============================================
   * SPACING
   * ============================================= */
  --chroma-spacing-0: 0;
  --chroma-spacing-1: 0.25rem;
  --chroma-spacing-2: 0.5rem;
  --chroma-spacing-3: 0.75rem;
  --chroma-spacing-4: 1rem;
  --chroma-spacing-5: 1.25rem;
  --chroma-spacing-6: 1.5rem;
  --chroma-spacing-8: 2rem;
  --chroma-spacing-10: 2.5rem;
  --chroma-spacing-12: 3rem;
  --chroma-spacing-16: 4rem;
  --chroma-spacing-20: 5rem;
  --chroma-spacing-24: 6rem;

  /* =============================================
   * BORDER RADIUS
   * ============================================= */
  --chroma-radius-none: 0;
  --chroma-radius-sm: 0.125rem;
  --chroma-radius-base: 0.25rem;
  --chroma-radius-md: 0.375rem;
  --chroma-radius-lg: 0.5rem;
  --chroma-radius-xl: 0.75rem;
  --chroma-radius-2xl: 1rem;
  --chroma-radius-full: 9999px;

  /* =============================================
   * SHADOWS
   * ============================================= */
  --chroma-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --chroma-shadow-base: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --chroma-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --chroma-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --chroma-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* =============================================
   * TRANSITIONS
   * ============================================= */
  --chroma-transition-fast: 150ms;
  --chroma-transition-base: 200ms;
  --chroma-transition-slow: 300ms;
  --chroma-transition-easing: cubic-bezier(0.4, 0, 0.2, 1);

  /* =============================================
   * Z-INDEX
   * ============================================= */
  --chroma-z-dropdown: 1000;
  --chroma-z-sticky: 1020;
  --chroma-z-fixed: 1030;
  --chroma-z-modal-backdrop: 1040;
  --chroma-z-modal: 1050;
  --chroma-z-popover: 1060;
  --chroma-z-tooltip: 1070;
}
`;

  const destPath = join(TOKENS_DEST, 'chroma-tokens.css');
  const destDir = dirname(destPath);

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  writeFileSync(destPath, placeholderContent);
  console.log('\n📝 Created placeholder tokens file: styles/tokens/chroma-tokens.css');
  console.log('   Update this file with actual values from the design tokens package.');
}

// Run the sync
syncTokens();
