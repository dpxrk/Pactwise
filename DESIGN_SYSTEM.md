# Pactwise Design System

This document contains the complete design system, brand guidelines, and visual specifications for the Pactwise platform.

> **For coding agents**: This file contains UI/design guidance. For architecture, APIs, and development patterns, see [CLAUDE.md](./CLAUDE.md).

---

## Core Design Philosophy

**Bloomberg Terminal meets Linear: Technical Precision with Purple/Pink Identity**

The Pactwise aesthetic combines dense information architecture with the purple/pink brand identity. The design prioritizes:

- **Information Density**: Maximum data per screen without cognitive overload
- **Technical Authority**: Monospace fonts for data, metrics, IDs, timestamps
- **Sharp Precision**: No rounded corners, surgical whitespace, grid-based layouts
- **Purple/Pink Identity**: Brand colors applied to interactive elements
- **Instant Feedback**: Minimal animation, immediate state changes
- **Functional First**: Every pixel serves a purpose, no decoration

---

## Brand Color Palette

### Primary Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Dark Purple | `#291528` | Primary buttons, headers, important UI |
| Mountbatten Pink | `#9e829c` | Hover states, highlights, accents |
| Ghost White | `#f0eff4` | Main application background |
| Black Olive | `#3a3e3b` | Body text, borders |

### Extended Palette

```javascript
{
  'purple': {
    50: '#faf5f9',
    100: '#f5ebf3',
    200: '#ead6e7',
    300: '#dab5d5',
    400: '#c388bb',
    500: '#9e829c',  // Mountbatten Pink - Secondary accent
    600: '#7d5c7b',
    700: '#644862',
    800: '#533e52',
    900: '#291528',  // Dark Purple - Primary brand
    950: '#1a0d18',
  },
  'ghost': {
    50: '#ffffff',   // Pure white for cards
    100: '#f0eff4',  // Ghost white - Main background
    200: '#e1e0e9',
    300: '#d2d1de',
    400: '#a9a8b5',
    500: '#80808c',
    600: '#5a5a66',
    700: '#3a3e3b',  // Black Olive - Body text
    800: '#2a2a2a',
    900: '#1a1a1a',
    950: '#0a0a0a',
  }
}
```

### Semantic Colors

| Purpose | Color | Hex |
|---------|-------|-----|
| Success | Green | `#059669` |
| Warning | Amber | `#d97706` |
| Error | Red | `#dc2626` |
| Info | Mountbatten Pink | `#9e829c` |

---

## Color Usage Guidelines

### Backgrounds

| Element | Token | Hex |
|---------|-------|-----|
| Primary Background | `ghost-100` | `#f0eff4` |
| Card Background | `ghost-50` | `#ffffff` |
| Dark Sections | `purple-900` | `#291528` |
| Hover Backgrounds | `ghost-200` | `#e1e0e9` |

### Typography Colors

| Element | Token | Hex |
|---------|-------|-----|
| Primary Headings | `purple-900` | `#291528` |
| Body Text | `ghost-700` | `#3a3e3b` |
| Secondary Text | `ghost-500` | `#80808c` |
| Light Text on Dark | `ghost-50` | `#ffffff` |

### Interactive Elements

**Primary Button:**
- Background: `purple-900` (`#291528`)
- Text: `ghost-50` (white)
- Hover: `purple-800` (`#533e52`)

**Secondary Button:**
- Background: transparent
- Border: `purple-500` (`#9e829c`)
- Text: `purple-900` (`#291528`)
- Hover: `purple-50` (`#faf5f9`) background

**Ghost Button:**
- Background: transparent
- Text: `ghost-700` (`#3a3e3b`)
- Hover: `ghost-100` (`#f0eff4`) background, `purple-900` text

**Focus States:** `purple-500` ring with 2px width
**Links:** `purple-900` default, `purple-500` hover

### Badge Colors

| State | Background | Text |
|-------|------------|------|
| Active/Primary | `purple-900` | white |
| Pending/Secondary | `purple-500` | white |
| Success | Green-100 | green-800 |
| Warning | Amber-100 | amber-800 |
| Error | Red-100 | red-800 |

### Borders & Dividers

| Element | Style |
|---------|-------|
| Default Border | `ghost-300` (`#d2d1de`) - 1px solid |
| Emphasized Border | `purple-500` (`#9e829c`) - for hover states |
| Dividers | `ghost-200` (`#e1e0e9`) - subtle separators |

---

## Chart & Graph Colors

### Light Mode Palette

| Variable | Token | Hex | Usage |
|----------|-------|-----|-------|
| chart-1 | `purple-900` | `#291528` | Primary data series |
| chart-2 | `purple-500` | `#9e829c` | Secondary data series |
| chart-3 | `purple-300` | `#dab5d5` | Tertiary data series |
| chart-4 | `purple-600` | `#7d5c7b` | Quaternary data series |
| chart-5 | `purple-700` | `#644862` | Quinary data series |

### Dark Mode Palette

| Variable | Token | Hex | Usage |
|----------|-------|-----|-------|
| chart-1 | `purple-500` | `#9e829c` | Primary data series |
| chart-2 | `purple-300` | `#dab5d5` | Secondary data series |
| chart-3 | `purple-600` | `#7d5c7b` | Tertiary data series |
| chart-4 | `purple-400` | `#c388bb` | Quaternary data series |
| chart-5 | `purple-600` | `#7d5c7b` | Quinary data series |

### Chart Guidelines

- Use chart-1 and chart-2 for primary comparisons (highest contrast)
- Reserve semantic colors (green, amber, red) for status indicators only
- Maintain WCAG AA compliance - ensure sufficient contrast
- Use opacity variations (50%, 75%, 100%) for stacked/area charts
- Grid lines: `ghost-300` at 30% opacity

---

## Typography

### Font Stack

```
--font-sans: Montserrat, system-ui, -apple-system, BlinkMacSystemFont, sans-serif (body text, UI elements)
--font-display: Syne, system-ui, -apple-system, BlinkMacSystemFont, sans-serif (headlines, display text)
--font-mono: JetBrains Mono, Monaco, Consolas, 'Courier New', monospace (data, metrics, IDs, timestamps, code)
```

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 200-300 | Logo variations |
| Regular | 400 | Body text, descriptions |
| Semibold | 600 | Subheadings, important text |
| Bold | 700 | Headlines, CTAs |

### Font Sizes

| Token | Size | Usage |
|-------|------|-------|
| 6xl | 60px | Main hero headlines |
| 5xl | 48px | Section headlines |
| 4xl | 36px | Subsection headlines |
| 2xl | 24px | Card titles |
| xl | 20px | Large body text |
| lg | 18px | Emphasized body text |
| base | 16px | Standard body text |
| sm | 14px | Secondary text, descriptions |
| xs | 12px | Metadata, labels |

### Letter Spacing

| Element | Value |
|---------|-------|
| Headlines | `-0.03em` (tight) |
| Body text | Default |
| Uppercase labels | `0.05em` (slightly expanded) |

---

## Spacing & Layout

### Container

- Max-width: `container mx-auto`
- Padding: `px-6` (24px on mobile/desktop)

### Section Spacing

- Vertical padding: `py-20` (80px)
- Between elements: `mb-20` (80px) for major sections
- Card spacing: `gap-8` (32px)

### Grid System

| Breakpoint | Columns |
|------------|---------|
| Mobile | 1 column |
| md (768px+) | 2-3 columns |
| lg (1024px+) | 3-4 columns |

---

## Component Patterns

### Cards

```jsx
<Card className="relative bg-white border border-gray-300 p-8 h-full">
```

- White background
- Gray-300 border (1px)
- Hover: `border-gray-900` transition
- Padding: `p-8` (32px) standard, `p-6` (24px) compact
- Always `h-full` for equal heights

### Buttons

**Primary Button:**
```jsx
<Button className="bg-gray-900 hover:bg-gray-800 text-white">
```
- Background: gray-900
- Hover: gray-800
- No rounded corners (`rounded-none`)
- Padding: `px-8 py-4` (large), `px-6 py-3` (normal)

**Secondary Button:**
```jsx
<Button variant="outline" className="border-gray-900 text-gray-900 hover:bg-gray-100">
```

**Ghost Button:**
```jsx
<Button variant="ghost" className="text-gray-600 hover:text-gray-900">
```

### Badges

```jsx
<Badge className="bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
```

---

## Visual Elements

### Borders & Lines

| Type | Style |
|------|-------|
| Primary borders | 1px solid gray-300 |
| Active/hover borders | 1px solid gray-900 |
| Emphasized borders | 2px solid gray-900 |
| Dividers | 1px solid gray-200 |

### Geometric Patterns

- Grid background: 40x40px squares with 0.5px lines at 5% opacity
- Decorative lines: 1px solid black at various opacities
- Square/rectangular emphasis over rounded shapes

### Icons

- Size: `w-4 h-4` (16px) inline, `w-6 h-6` (24px) feature icons
- Color: Inherit from text color (gray-600 or gray-900)
- Library: Lucide React icons exclusively

### Shadows & Effects

| Type | Value |
|------|-------|
| Card Shadow | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` |
| Elevated Shadow | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| Glass Effects | None (removed for consistency) |
| Gradients | Minimal - only for marketing pages (`purple-900` to `purple-700`) |

---

## Animation & Interaction

### Motion Principles

- Subtle and purposeful - enhance, don't distract
- Duration: 200-500ms for most transitions
- Easing: Default ease or linear for continuous animations

### Common Animations

```jsx
// Fade in on scroll
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}

// Hover scale
whileHover={{ scale: 1.02 }}

// Stagger children
transition={{ delay: index * 0.1 }}
```

### Hover States

- Border color: gray-300 to gray-900
- Background: transparent to gray-100
- Text color: gray-600 to gray-900
- Scale: 1.00 to 1.02
- Underline animations for links

---

## Key Visual Characteristics

### Extreme Minimalism
- No gradients (except specific AI agent cards)
- No shadows or drop-shadows
- No rounded corners on primary elements
- Flat design with emphasis on borders

### Geometric Precision
- Square and rectangular shapes
- Right angles preferred
- Grid-based layouts
- Mathematical spacing (multiples of 4px/8px)

### Monochromatic Focus
- 95% grayscale palette
- Color only for: success (green), error (red), critical CTAs

### Typography-First
- Large, bold headlines
- Clear hierarchy
- Plenty of whitespace
- No decorative fonts

### Motion Restraint
- Subtle parallax effects
- Gentle fade-ins
- No bouncy or playful animations
- Professional, measured transitions

---

## Do's and Don'ts

### Do
- Use consistent spacing multiples (4, 8, 16, 32, 64)
- Maintain high contrast (gray-900 on white)
- Keep animations under 500ms
- Use system fonts for optimal performance
- Emphasize content over decoration
- Use borders to create separation
- Apply hover states consistently

### Don't
- Add gradients without specific purpose
- Use shadows for depth
- Round corners unnecessarily
- Add colors outside the palette
- Create busy or complex layouts
- Use decorative elements without function
- Implement playful or bouncy animations

---

## Responsive Behavior

### Mobile First
- Stack elements vertically on mobile
- Maintain 24px horizontal padding
- Reduce font sizes by 10-20% on mobile
- Simplify grid layouts to single column

### Desktop Enhancements
- Multi-column layouts
- Larger typography
- More generous spacing
- Parallax and advanced animations

---

## Accessibility

| Requirement | Value |
|-------------|-------|
| Minimum contrast ratio | 4.5:1 for body text |
| Focus states | 2px solid gray-900 outline |
| Touch targets | Minimum 44x44px |
| HTML structure | Semantic elements required |
| ARIA labels | Where needed for non-visual context |

---

## Special Components

### Logo Treatment

```jsx
<span style={{ fontWeight: 400 }}>P</span>
<span style={{ fontWeight: 300 }}>act</span>
<span style={{ fontWeight: 200 }}>wise</span>
```

Variable font weights create subtle distinction.

### Status Indicators

| State | Style |
|-------|-------|
| Active | 1.5px solid circle/square in gray-900 |
| Inactive | 1px solid circle/square in gray-400 |
| Processing | Rotating border animation |

### Progress Indicators

- Thin horizontal lines (1px)
- Fill from left to right
- Gray-900 color
- No percentage text unless critical

---

## Demo Reference

See `/demo/revamp` for a comprehensive showcase of all design patterns, components, and interactions.
