# Your Project's Title...
Your project's description...

## Environments
- Preview: https://main--aem-whitelabel--kxs692.aem.page/
- Live: https://main--aem-whitelabel--kxs692.aem.live/

## Documentation

Before using the aem-boilerplate, we recommand you to go through the documentation on https://www.aem.live/docs/ and more specifically:
1. [Developer Tutorial](https://www.aem.live/developer/tutorial)
2. [The Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
3. [Web Performance](https://www.aem.live/developer/keeping-it-100)
4. [Markup, Sections, Blocks, and Auto Blocking](https://www.aem.live/developer/markup-sections-blocks)

## Installation

```sh
npm i
```

## Design Tokens

This project uses [Sherwin-Williams Chroma Design Tokens](https://artifactory.sherwin.com) for consistent theming across all components.

### Setup

The design tokens are configured via the `.npmrc` file which points to the Sherwin-Williams Artifactory:

```
@sherwin-williams-co:registry=https://artifactory.sherwin.com/artifactory/api/npm/npm-virtual
```

**Note:** You may need to authenticate with the Artifactory. Contact your team for credentials.

### Token Architecture

The project maintains a **no-build** approach while using design tokens through a layered CSS architecture:

```
styles/
├── tokens/
│   └── chroma-tokens.css    # Raw design tokens (synced from npm package)
├── theme.css                 # Token-to-variable mapping
└── styles.css                # Global styles (imports theme.css)
```

1. **`chroma-tokens.css`**: Contains the raw design tokens from the `@sherwin-williams-co/chroma-design-tokens` package
2. **`theme.css`**: Maps Chroma tokens to project-specific CSS custom properties
3. **`styles.css`**: Imports the theme and provides global styling

### Syncing Design Tokens

After installing dependencies, sync the design tokens to the project:

```sh
npm run sync-tokens
```

This command extracts CSS files from the `@sherwin-williams-co/chroma-design-tokens` package and copies them to `styles/tokens/`. The synced files should be committed to the repository.

### Using Design Tokens

Design tokens are available as CSS custom properties throughout the project:

```css
/* Colors */
--brand-primary: var(--chroma-color-brand-primary);
--link-color: var(--chroma-color-link);
--background-color: var(--chroma-color-background);

/* Typography */
--body-font-family: var(--chroma-font-family-sans);
--heading-font-family: var(--chroma-font-family-heading);

/* Spacing */
--spacing-4: var(--chroma-spacing-4);
--spacing-8: var(--chroma-spacing-8);

/* Other tokens */
--radius-lg: var(--chroma-radius-lg);
--shadow-md: var(--chroma-shadow-md);
--transition-base: var(--chroma-transition-base);
```

### Component-Specific Tokens

The theme also provides component-specific tokens for consistent styling:

```css
/* Buttons */
--button-primary-bg
--button-primary-text
--button-radius

/* Cards */
--card-bg
--card-border
--card-shadow

/* Navigation */
--nav-height
--nav-bg
--nav-shadow

/* Footer */
--footer-bg
--footer-text
```

### Customizing the Theme

To customize the theme, edit `styles/theme.css`. You can:

1. Override token mappings for specific components
2. Add new component-specific tokens
3. Create variant themes (e.g., dark mode)

Example dark mode variant:
```css
@media (prefers-color-scheme: dark) {
  :root {
    --background-color: var(--chroma-color-background-dark);
    --text-color: var(--chroma-color-text-dark);
  }
}
```

## Linting

```sh
npm run lint
```

## Local development

1. Create a new repository based on the `aem-boilerplate` template
1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to the repository
1. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
1. Start AEM Proxy: `aem up` (opens your browser at `http://localhost:3000`)
1. Open the `{repo}` directory in your favorite IDE and start coding :)
