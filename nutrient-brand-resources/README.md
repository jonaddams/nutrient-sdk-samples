# Nutrient Brand Resources

Official brand guidelines and design system assets for Nutrient projects.

## Contents

This package contains everything needed to implement Nutrient branding in your projects:

- **Fonts**: ABC Monument Grotesk font family (Variable, Mono Regular, Mono Medium)
- **CSS Variables**: Complete design token system (colors, spacing, typography, etc.)
- **Components**: Pre-built button, badge, and alert components
- **Documentation**: Usage guidelines and code examples

## Quick Start

### 1. Copy Font Files

Copy the font files from `fonts/` to your project's public fonts directory:

```bash
cp -r fonts/ /path/to/your/project/public/fonts/
```

Or for Next.js projects:
```bash
cp -r fonts/ /path/to/your/project/public/fonts/
```

### 2. Import the CSS

**Option A: Import in your main CSS file**
```css
@import url('/path/to/nutrient-brand.css');
```

**Option B: Link in HTML (vanilla projects)**
```html
<link rel="stylesheet" href="/path/to/nutrient-brand.css">
```

**Option C: Import in JavaScript/TypeScript (React, Next.js, etc.)**
```javascript
import './path/to/nutrient-brand.css';
```

### 3. Start Using Components

```html
<button class="btn btn-primary">Primary Button</button>
<span class="nutrient-badge nutrient-badge-success">Success</span>
```

## Brand Colors

### Primary Colors

| Color Name | CSS Variable | Light Mode Value | Usage |
|------------|--------------|------------------|-------|
| Disc Pink | `--disc-pink` | `hsla(317, 50%, 74%, 1)` | Accent, highlights |
| Code Coral | `--code-coral` | `hsla(9, 87%, 61%, 1)` | Errors, warnings |
| Data Green | `--data-green` | `hsla(129, 32%, 57%, 1)` | Success, positive actions |
| Digital Pollen | `--digital-pollen` | `hsla(43, 82%, 67%, 1)` | Warnings, loading states |

### Neutral Colors

| Color Name | CSS Variable | Value |
|------------|--------------|-------|
| White | `--white` | `hsla(0, 0%, 100%, 1)` |
| Warm Gray 100 | `--warm-gray-100` | `hsla(30, 20%, 92%, 1)` |
| Warm Gray 200 | `--warm-gray-200` | `hsla(13, 13%, 87%, 1)` |
| Warm Gray 400 | `--warm-gray-400` | `hsla(30, 14%, 72%, 1)` |
| Warm Gray 600 | `--warm-gray-600` | `hsla(32, 10%, 49%, 1)` |
| Warm Gray 800 | `--warm-gray-800` | `hsla(30, 16%, 35%, 1)` |
| Warm Gray 900 | `--warm-gray-900` | `hsla(27, 15%, 24%, 1)` |
| Warm Gray 950 | `--warm-gray-950` | `hsla(24, 15%, 13%, 1)` |
| Black | `--black` | `hsla(0, 13%, 9%, 1)` |

### Semantic Colors

These automatically adapt to light/dark mode:

```css
--background: Light mode uses warm-gray-100, dark mode uses black
--foreground: Light mode uses black, dark mode uses warm-gray-400
--accent: Light mode uses black, dark mode uses warm-gray-400
--neutral: Light mode uses warm-gray-400, dark mode uses warm-gray-600
```

## Typography

### Font Families

```css
/* Sans-serif (headings, body text) */
font-family: var(--font-sans);
/* Output: "ABC Monument Grotesk", system-ui, -apple-system, sans-serif */

/* Monospace (code, buttons, badges) */
font-family: var(--font-mono);
/* Output: "JetBrains Mono", "ABC Monument Grotesk Mono", ... */
```

### Heading Styles

All heading styles are pre-configured:

```html
<h1>2.5rem, 700 weight, -0.02em letter-spacing</h1>
<h2>2rem, 700 weight, -0.01em letter-spacing</h2>
<h3>1.5rem, 600 weight</h3>
<h4>1.25rem, 600 weight</h4>
<h5>1.125rem, 600 weight</h5>
<h6>1rem, 600 weight</h6>
```

### Body Text

```html
<p>Default paragraph styling: 1rem, line-height 1.75</p>
<code>Inline code with monospace font</code>
```

## Spacing Scale

Use consistent spacing throughout your project:

```css
--spacing-4xs: 0.125rem;  /* 2px */
--spacing-3xs: 0.25rem;   /* 4px */
--spacing-2xs: 0.5rem;    /* 8px */
--spacing-xs: 0.75rem;    /* 12px */
--spacing-sm: 1rem;       /* 16px */
--spacing-md: 1.25rem;    /* 20px */
--spacing-lg: 1.5rem;     /* 24px */
--spacing-xl: 2rem;       /* 32px */
--spacing-2xl: 2.5rem;    /* 40px */
--spacing-3xl: 3rem;      /* 48px */
```

Example:
```css
.my-component {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}
```

## Border Radius Scale

```css
--radius-xxs: 0.25rem;  /* 4px */
--radius-xs: 0.5rem;    /* 8px */
--radius-sm: 0.75rem;   /* 12px */
--radius-md: 1rem;      /* 16px */
--radius-lg: 1.25rem;   /* 20px */
--radius-xl: 1.5rem;    /* 24px */
--radius-2xl: 2rem;     /* 32px */
```

Example:
```css
.card {
  border-radius: var(--radius-md);
}
```

## Button Components

### Basic Usage

```html
<!-- Primary button -->
<button class="btn btn-primary">Primary Action</button>

<!-- Secondary button -->
<button class="btn btn-secondary">Secondary Action</button>

<!-- Success button -->
<button class="btn btn-success">Success Action</button>

<!-- Small button -->
<button class="btn btn-primary btn-sm">Small Button</button>

<!-- Large button -->
<button class="btn btn-primary btn-lg">Large Button</button>
```

### Button Variants

| Class | Background | Text Color | Usage |
|-------|------------|------------|-------|
| `.btn` (default) | Black (light) / Digital Pollen (dark) | White (light) / Black (dark) | Primary actions |
| `.btn-primary` | Black (light) / Digital Pollen (dark) | White (light) / Black (dark) | Primary actions (explicit) |
| `.btn-secondary` | Transparent with border | Black (light) / White (dark) | Secondary actions |
| `.btn-success` | Data Green | Black | Positive actions, confirmations |

### Button Sizes

| Class | Min Height | Padding | Font Size |
|-------|------------|---------|-----------|
| Default | 2.5rem | 0.75rem 1.5rem | 0.75rem |
| `.btn-sm` | 2rem | 0.5rem 1rem | 0.625rem |
| `.btn-lg` | 3rem | 1rem 2rem | 0.875rem |

### Button as Link

```html
<a href="/page" class="btn btn-primary">Link Button</a>
```

## Badge Components

### Basic Usage

```html
<!-- Neutral badge -->
<span class="nutrient-badge nutrient-badge-neutral">Neutral</span>

<!-- Accent badge -->
<span class="nutrient-badge nutrient-badge-accent">Warning</span>

<!-- Success badge -->
<span class="nutrient-badge nutrient-badge-success">Success</span>

<!-- Pink badge -->
<span class="nutrient-badge nutrient-badge-pink">Info</span>

<!-- Coral badge -->
<span class="nutrient-badge nutrient-badge-coral">Error</span>
```

### Badge Variants

| Class | Background | Usage |
|-------|------------|-------|
| `.nutrient-badge-neutral` | Warm Gray 200/800 | Default, status |
| `.nutrient-badge-accent` | Digital Pollen | Warnings, loading |
| `.nutrient-badge-success` | Data Green | Success states |
| `.nutrient-badge-pink` | Disc Pink | Info, highlights |
| `.nutrient-badge-coral` | Code Coral | Errors, alerts |

## Alert Components

### Basic Usage

```html
<div class="nutrient-alert nutrient-alert-neutral">
  <div class="nutrient-alert-icon">
    <!-- Your icon SVG here -->
    <svg>...</svg>
  </div>
  <div class="nutrient-alert-content">
    <p>This is a neutral alert message.</p>
  </div>
</div>
```

### Complete Example

```html
<div class="nutrient-alert nutrient-alert-success">
  <div class="nutrient-alert-icon">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  </div>
  <div class="nutrient-alert-content">
    <p>Your document has been successfully uploaded!</p>
  </div>
</div>
```

### Alert Variants

| Class | Background | Usage |
|-------|------------|-------|
| `.nutrient-alert-neutral` | Warm Gray 100/900 | General information |
| `.nutrient-alert-success` | Data Green Dark | Success messages |
| `.nutrient-alert-warning` | Digital Pollen Dark | Warnings |
| `.nutrient-alert-error` | Code Coral Dark | Error messages |
| `.nutrient-alert-info` | Disc Pink Dark | Information highlights |

## Dark Mode Support

All components automatically support dark mode via `prefers-color-scheme: dark`. No additional configuration needed.

### Custom Dark Mode

If you want to override the default dark mode behavior:

```css
/* Force dark mode */
[data-theme="dark"] {
  --background: var(--black);
  --foreground: var(--warm-gray-400);
  /* ... other overrides */
}

/* Force light mode */
[data-theme="light"] {
  --background: var(--warm-gray-100);
  --foreground: var(--black);
  /* ... other overrides */
}
```

## Framework-Specific Examples

### Next.js

```typescript
// app/layout.tsx
import '@/styles/nutrient-brand.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### React

```jsx
// App.jsx
import './styles/nutrient-brand.css';

function App() {
  return (
    <div>
      <button className="btn btn-primary">Click Me</button>
    </div>
  );
}
```

### Vue

```vue
<!-- App.vue -->
<template>
  <div>
    <button class="btn btn-primary">Click Me</button>
  </div>
</template>

<style>
@import './styles/nutrient-brand.css';
</style>
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/styles/nutrient-brand.css">
</head>
<body>
  <button class="btn btn-primary">Click Me</button>
</body>
</html>
```

## Customization

### Extending Colors

Add your own custom colors while maintaining the Nutrient brand:

```css
:root {
  /* Your custom colors */
  --custom-blue: hsla(210, 100%, 50%, 1);
  --custom-purple: hsla(280, 70%, 60%, 1);
}
```

### Custom Components

Build new components using Nutrient design tokens:

```css
.my-card {
  background: var(--background);
  border: 1px solid var(--warm-gray-400);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  font-family: var(--font-sans);
}
```

## Best Practices

1. **Use CSS Variables**: Always use the provided CSS variables instead of hardcoded values
2. **Respect the Spacing Scale**: Use the spacing scale for consistent layout
3. **Typography Hierarchy**: Use semantic HTML (`<h1>`, `<h2>`, etc.) instead of styling divs
4. **Dark Mode**: Test your components in both light and dark mode
5. **Accessibility**: Maintain color contrast ratios (all provided colors meet WCAG AA standards)

## File Structure

```
nutrient-brand-resources/
├── fonts/
│   ├── ABCMonumentGroteskVariable.woff2
│   ├── ABCMonumentGroteskSemi-Mono-Regular.woff2
│   └── ABCMonumentGroteskMono-Medium.woff2
├── styles/
│   └── nutrient-brand.css
├── docs/
│   └── color-reference.md
└── README.md
```

## Version

**Current Version**: 1.0.0
**Last Updated**: November 2025

## License

These brand assets are proprietary to Nutrient and should only be used for official Nutrient projects and demos.

## Support

For questions or updates to the brand guidelines, contact the Nutrient design team.
