# Nutrient Brand - Quick Start Guide

Fast reference for integrating Nutrient branding into new projects.

## 30-Second Setup

```bash
# 1. Copy this entire folder to your project
cp -r nutrient-brand-resources /path/to/your/project/

# 2. Copy fonts to public directory
cp -r nutrient-brand-resources/fonts /path/to/your/project/public/

# 3. Import CSS in your main file
# Add to your CSS: @import url('/path/to/nutrient-brand.css');
# Or in JS/TS: import './nutrient-brand.css';
```

## Essential Components

### Buttons
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-success">Success</button>
<button class="btn btn-primary btn-sm">Small</button>
```

### Badges
```html
<span class="nutrient-badge nutrient-badge-success">Success</span>
<span class="nutrient-badge nutrient-badge-accent">Warning</span>
<span class="nutrient-badge nutrient-badge-coral">Error</span>
```

### Alerts
```html
<div class="nutrient-alert nutrient-alert-neutral">
  <div class="nutrient-alert-icon">[icon]</div>
  <div class="nutrient-alert-content"><p>Message</p></div>
</div>
```

## Most-Used Colors

```css
/* Brand colors */
--data-green      /* Success: #7CBF81 */
--code-coral      /* Error: #F26234 */
--digital-pollen  /* Warning: #F6D457 */
--disc-pink       /* Info: #E095CB */

/* Neutrals */
--white           /* #FFFFFF */
--black           /* #1A1414 */
--warm-gray-400   /* Mid-gray: #C4B9AD */

/* Semantic (auto light/dark) */
--background
--foreground
--accent
--neutral
```

## Most-Used Spacing

```css
--spacing-2xs: 0.5rem;   /* 8px - tight spacing */
--spacing-sm: 1rem;      /* 16px - default spacing */
--spacing-md: 1.25rem;   /* 20px - medium spacing */
--spacing-lg: 1.5rem;    /* 24px - large spacing */
--spacing-xl: 2rem;      /* 32px - section spacing */
```

## Typography

```css
/* Fonts */
font-family: var(--font-sans);  /* Headings, body */
font-family: var(--font-mono);  /* Code, buttons, badges */

/* Use semantic HTML */
<h1>Main heading</h1>
<h2>Section heading</h2>
<p>Body text</p>
<code>Inline code</code>
```

## Common Patterns

### Card Component
```html
<div style="
  background: var(--background);
  border: 1px solid var(--warm-gray-400);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

### Status Badge
```html
<!-- Success -->
<span class="nutrient-badge nutrient-badge-success">Active</span>

<!-- Warning -->
<span class="nutrient-badge nutrient-badge-accent">Pending</span>

<!-- Error -->
<span class="nutrient-badge nutrient-badge-coral">Failed</span>
```

### Action Buttons
```html
<!-- Primary action -->
<button class="btn btn-success">Save Changes</button>

<!-- Secondary action -->
<button class="btn btn-secondary">Cancel</button>

<!-- Destructive action -->
<button class="btn btn-secondary" style="
  border-color: var(--code-coral);
  color: var(--code-coral);
">Delete</button>
```

## Dark Mode

Everything works automatically with `prefers-color-scheme: dark`. No extra code needed!

## Framework Examples

### Next.js
```typescript
// app/layout.tsx
import '@/nutrient-brand-resources/styles/nutrient-brand.css';
```

### React
```jsx
// App.jsx
import './nutrient-brand-resources/styles/nutrient-brand.css';
```

### Vue
```vue
<!-- App.vue -->
<style>
@import './nutrient-brand-resources/styles/nutrient-brand.css';
</style>
```

### HTML
```html
<link rel="stylesheet" href="/nutrient-brand-resources/styles/nutrient-brand.css">
```

## Color Cheat Sheet

| Purpose | CSS Variable | Hex |
|---------|--------------|-----|
| Success | `--data-green` | #7CBF81 |
| Error | `--code-coral` | #F26234 |
| Warning | `--digital-pollen` | #F6D457 |
| Info | `--disc-pink` | #E095CB |
| Background | `--background` | Auto |
| Text | `--foreground` | Auto |
| Border | `--warm-gray-400` | #C4B9AD |

## Need More?

- **Full Documentation**: See `README.md`
- **Color Reference**: See `docs/color-reference.md`
- **Font Files**: In `fonts/` directory
- **CSS Source**: In `styles/nutrient-brand.css`

## Troubleshooting

**Fonts not loading?**
- Verify fonts are in `/public/fonts/` directory
- Check font paths in CSS match your project structure
- Clear browser cache

**Dark mode not working?**
- Ensure you're using semantic variables (`--background`, `--foreground`)
- Test with browser dev tools: Toggle "Emulate prefers-color-scheme: dark"

**Components look wrong?**
- Make sure you imported `nutrient-brand.css` before your custom CSS
- Check for conflicting CSS from other libraries
- Verify class names are exact (case-sensitive)

## Custom Build

Want to customize? Edit `styles/nutrient-brand.css`:

1. Keep the `:root` variables intact
2. Modify component styles as needed
3. Add your own components using the design tokens
4. Test in both light and dark mode

## Support

Questions? Check the main `README.md` or contact the Nutrient design team.
