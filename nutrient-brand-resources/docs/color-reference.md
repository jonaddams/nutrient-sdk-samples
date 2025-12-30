# Nutrient Color Reference

Complete color palette with usage guidelines.

## Primary Brand Colors

### Disc Pink
- **CSS Variable**: `--disc-pink`
- **Value**: `hsla(317, 50%, 74%, 1)`
- **RGB**: `rgb(224, 149, 203)`
- **Hex**: `#E095CB`
- **Dark Variant**: `--disc-pink-dark` - `hsla(317, 30%, 24%, 1)`
- **Usage**: Accent colors, highlights, informational elements
- **Best for**: Badges, decorative elements, hover states

### Code Coral
- **CSS Variable**: `--code-coral`
- **Value**: `hsla(9, 87%, 61%, 1)`
- **RGB**: `rgb(242, 98, 52)`
- **Hex**: `#F26234`
- **Dark Variant**: `--code-coral-dark` - `hsla(9, 49%, 27%, 1)`
- **Usage**: Errors, critical warnings, destructive actions
- **Best for**: Error messages, alert badges, delete buttons

### Data Green
- **CSS Variable**: `--data-green`
- **Value**: `hsla(129, 32%, 57%, 1)`
- **RGB**: `rgb(124, 191, 129)`
- **Hex**: `#7CBF81`
- **Dark Variant**: `--data-green-dark` - `hsla(131, 20%, 21%, 1)`
- **Usage**: Success states, positive actions, confirmations
- **Best for**: Success messages, complete status, approve buttons

### Digital Pollen
- **CSS Variable**: `--digital-pollen`
- **Value**: `hsla(43, 82%, 67%, 1)`
- **RGB**: `rgb(246, 212, 87)`
- **Hex**: `#F6D457`
- **Dark Variant**: `--digital-pollen-dark` - `hsla(42, 56%, 23%, 1)`
- **Usage**: Warnings, loading states, attention-grabbing elements
- **Best for**: Warning badges, loading indicators, "in progress" states

## Neutral Colors

### White
- **CSS Variable**: `--white`
- **Value**: `hsla(0, 0%, 100%, 1)`
- **RGB**: `rgb(255, 255, 255)`
- **Hex**: `#FFFFFF`
- **Usage**: Backgrounds (light mode), text on dark backgrounds
- **Accessibility**: Use for high-contrast text on dark surfaces

### Warm Gray 100 (Lightest)
- **CSS Variable**: `--warm-gray-100`
- **Value**: `hsla(30, 20%, 92%, 1)`
- **RGB**: `rgb(241, 236, 230)`
- **Hex**: `#F1ECE6`
- **Usage**: Light backgrounds, subtle surfaces
- **Best for**: Page backgrounds (light mode), card backgrounds

### Warm Gray 200
- **CSS Variable**: `--warm-gray-200`
- **Value**: `hsla(13, 13%, 87%, 1)`
- **RGB**: `rgb(228, 221, 216)`
- **Hex**: `#E4DDD8`
- **Usage**: Slightly darker backgrounds, neutral badges
- **Best for**: Secondary surfaces, dividers, neutral status badges

### Warm Gray 400 (Mid-tone)
- **CSS Variable**: `--warm-gray-400`
- **Value**: `hsla(30, 14%, 72%, 1)`
- **RGB**: `rgb(196, 185, 173)`
- **Hex**: `#C4B9AD`
- **Usage**: Borders, icons, secondary text
- **Best for**: Divider lines, placeholder text, disabled states

### Warm Gray 600
- **CSS Variable**: `--warm-gray-600`
- **Value**: `hsla(32, 10%, 49%, 1)`
- **RGB**: `rgb(135, 125, 115)`
- **Hex**: `#877D73`
- **Usage**: Body text, tertiary elements
- **Best for**: Secondary headings, captions, metadata

### Warm Gray 800
- **CSS Variable**: `--warm-gray-800`
- **Value**: `hsla(30, 16%, 35%, 1)`
- **RGB**: `rgb(103, 92, 80)`
- **Hex**: `#675C50`
- **Usage**: Primary text (light mode), strong emphasis
- **Best for**: Body copy, important text, headings

### Warm Gray 900
- **CSS Variable**: `--warm-gray-900`
- **Value**: `hsla(27, 15%, 24%, 1)`
- **RGB**: `rgb(70, 63, 56)`
- **Hex**: `#463F38`
- **Usage**: Very dark backgrounds (dark mode), strongest text
- **Best for**: Alert backgrounds (dark mode), high-contrast elements

### Warm Gray 950 (Darkest Gray)
- **CSS Variable**: `--warm-gray-950`
- **Value**: `hsla(24, 15%, 13%, 1)`
- **RGB**: `rgb(38, 34, 30)`
- **Hex**: `#26221E`
- **Usage**: Near-black backgrounds, deep shadows
- **Best for**: Dark surfaces, card backgrounds (dark mode)

### Black
- **CSS Variable**: `--black`
- **Value**: `hsla(0, 13%, 9%, 1)`
- **RGB**: `rgb(26, 20, 20)`
- **Hex**: `#1A1414`
- **Usage**: Primary text (light mode), backgrounds (dark mode)
- **Best for**: Body text, headings, primary backgrounds in dark mode

## Semantic Colors

These colors automatically adapt based on light/dark mode:

### Background
- **CSS Variable**: `--background`
- **Light Mode**: `var(--warm-gray-100)`
- **Dark Mode**: `var(--black)`
- **Usage**: Main page background
- **Example**: `background: var(--background);`

### Foreground
- **CSS Variable**: `--foreground`
- **Light Mode**: `var(--black)`
- **Dark Mode**: `var(--warm-gray-400)`
- **Usage**: Primary text color
- **Example**: `color: var(--foreground);`

### Accent
- **CSS Variable**: `--accent`
- **Light Mode**: `var(--black)`
- **Dark Mode**: `var(--warm-gray-400)`
- **Usage**: Links, emphasis, interactive elements
- **Example**: `border-color: var(--accent);`

### Neutral
- **CSS Variable**: `--neutral`
- **Light Mode**: `var(--warm-gray-400)`
- **Dark Mode**: `var(--warm-gray-600)`
- **Usage**: Borders, dividers, secondary elements
- **Example**: `border: 1px solid var(--neutral);`

## Color Combinations

### High Contrast Combinations

These combinations meet WCAG AAA standards (7:1 contrast ratio):

1. **White on Black**
   - Text: `var(--white)`
   - Background: `var(--black)`
   - Use for: Primary text on dark backgrounds

2. **Black on White**
   - Text: `var(--black)`
   - Background: `var(--white)`
   - Use for: Primary text on light backgrounds

3. **White on Data Green Dark**
   - Text: `var(--white)`
   - Background: `var(--data-green-dark)`
   - Use for: Success alerts

4. **White on Code Coral Dark**
   - Text: `var(--white)`
   - Background: `var(--code-coral-dark)`
   - Use for: Error alerts

### Medium Contrast Combinations

These combinations meet WCAG AA standards (4.5:1 contrast ratio):

1. **Warm Gray 800 on Warm Gray 100**
   - Text: `var(--warm-gray-800)`
   - Background: `var(--warm-gray-100)`
   - Use for: Body text on light backgrounds

2. **Warm Gray 400 on Black**
   - Text: `var(--warm-gray-400)`
   - Background: `var(--black)`
   - Use for: Body text in dark mode

3. **Black on Data Green**
   - Text: `var(--black)`
   - Background: `var(--data-green)`
   - Use for: Success buttons

4. **Black on Digital Pollen**
   - Text: `var(--black)`
   - Background: `var(--digital-pollen)`
   - Use for: Warning badges

## Usage Guidelines

### Do's ✅

- Use semantic color variables (`--background`, `--foreground`) when possible
- Test color combinations in both light and dark modes
- Use warm grays for neutral elements
- Use brand colors (pink, coral, green, pollen) sparingly for emphasis
- Maintain consistent color usage across your application

### Don'ts ❌

- Don't use pure black (`#000000`) - use `var(--black)` instead
- Don't use pure gray (`#808080`) - use warm gray variants
- Don't mix cool grays with warm grays
- Don't use brand colors for large background areas
- Don't ignore dark mode support

## Accessibility

All color combinations in this guide meet or exceed WCAG 2.1 Level AA standards for color contrast. For critical text (small text, body copy), aim for AAA standards (7:1 ratio).

### Contrast Ratios

| Combination | Ratio | Rating |
|-------------|-------|--------|
| White on Black | 18.5:1 | AAA |
| Black on White | 18.5:1 | AAA |
| Warm Gray 800 on Warm Gray 100 | 6.2:1 | AA |
| Warm Gray 400 on Black | 4.8:1 | AA |
| Black on Data Green | 5.1:1 | AA |
| Black on Digital Pollen | 8.9:1 | AAA |
| White on Code Coral Dark | 10.2:1 | AAA |
| White on Data Green Dark | 9.8:1 | AAA |

## Examples

### Button Color Patterns

```css
/* Success button */
.btn-success {
  background: var(--data-green);
  color: var(--black);
}

/* Error button */
.btn-error {
  background: var(--code-coral);
  color: var(--white);
}

/* Warning button */
.btn-warning {
  background: var(--digital-pollen);
  color: var(--black);
}
```

### Status Badge Patterns

```css
/* Success badge */
.badge-success {
  background: var(--data-green);
  color: var(--black);
}

/* Error badge */
.badge-error {
  background: var(--code-coral);
  color: var(--white);
}

/* Info badge */
.badge-info {
  background: var(--disc-pink);
  color: var(--black);
}
```

### Alert Patterns

```css
/* Success alert (dark mode) */
.alert-success {
  background: var(--data-green-dark);
  color: var(--white);
  border-left: 4px solid var(--data-green);
}

/* Error alert (dark mode) */
.alert-error {
  background: var(--code-coral-dark);
  color: var(--white);
  border-left: 4px solid var(--code-coral);
}
```

## Color Psychology

### Data Green
- **Emotion**: Trust, safety, success
- **Use when**: Confirming actions, showing completion, positive feedback

### Code Coral
- **Emotion**: Urgency, attention, caution
- **Use when**: Errors need attention, destructive actions, critical warnings

### Digital Pollen
- **Emotion**: Optimism, energy, warning
- **Use when**: Important but non-critical information, loading states

### Disc Pink
- **Emotion**: Creativity, friendliness, innovation
- **Use when**: Highlighting features, informational elements, fun interactions

### Warm Grays
- **Emotion**: Stability, neutrality, professionalism
- **Use when**: Text, borders, backgrounds, structure

## Export Formats

### CSS
Already provided in `nutrient-brand.css`

### SCSS Variables
```scss
// Primary Colors
$disc-pink: hsla(317, 50%, 74%, 1);
$code-coral: hsla(9, 87%, 61%, 1);
$data-green: hsla(129, 32%, 57%, 1);
$digital-pollen: hsla(43, 82%, 67%, 1);

// Neutral Colors
$white: hsla(0, 0%, 100%, 1);
$warm-gray-100: hsla(30, 20%, 92%, 1);
$warm-gray-200: hsla(13, 13%, 87%, 1);
$warm-gray-400: hsla(30, 14%, 72%, 1);
$warm-gray-600: hsla(32, 10%, 49%, 1);
$warm-gray-800: hsla(30, 16%, 35%, 1);
$warm-gray-900: hsla(27, 15%, 24%, 1);
$warm-gray-950: hsla(24, 15%, 13%, 1);
$black: hsla(0, 13%, 9%, 1);
```

### JavaScript/TypeScript
```typescript
export const colors = {
  discPink: 'hsla(317, 50%, 74%, 1)',
  codeCoral: 'hsla(9, 87%, 61%, 1)',
  dataGreen: 'hsla(129, 32%, 57%, 1)',
  digitalPollen: 'hsla(43, 82%, 67%, 1)',
  white: 'hsla(0, 0%, 100%, 1)',
  warmGray100: 'hsla(30, 20%, 92%, 1)',
  warmGray200: 'hsla(13, 13%, 87%, 1)',
  warmGray400: 'hsla(30, 14%, 72%, 1)',
  warmGray600: 'hsla(32, 10%, 49%, 1)',
  warmGray800: 'hsla(30, 16%, 35%, 1)',
  warmGray900: 'hsla(27, 15%, 24%, 1)',
  warmGray950: 'hsla(24, 15%, 13%, 1)',
  black: 'hsla(0, 13%, 9%, 1)',
};
```

### Tailwind Config
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'disc-pink': 'hsla(317, 50%, 74%, 1)',
        'code-coral': 'hsla(9, 87%, 61%, 1)',
        'data-green': 'hsla(129, 32%, 57%, 1)',
        'digital-pollen': 'hsla(43, 82%, 67%, 1)',
        'warm-gray': {
          100: 'hsla(30, 20%, 92%, 1)',
          200: 'hsla(13, 13%, 87%, 1)',
          400: 'hsla(30, 14%, 72%, 1)',
          600: 'hsla(32, 10%, 49%, 1)',
          800: 'hsla(30, 16%, 35%, 1)',
          900: 'hsla(27, 15%, 24%, 1)',
          950: 'hsla(24, 15%, 13%, 1)',
        },
      },
    },
  },
};
```
