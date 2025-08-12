# Pactwise Design System & Aesthetic Guide

## Core Design Philosophy
**Minimalist, Professional, Enterprise-Grade**

The landing page aesthetic follows a strict minimalist approach with geometric precision, emphasizing clarity, whitespace, and purposeful animations. The design communicates enterprise reliability through restraint rather than embellishment.

## Color Palette

### Primary Colors
- **Gray-900** (#111827): Primary text, borders, CTAs
- **Gray-800** (#1F2937): Hover states for dark elements
- **Gray-700** (#374151): Secondary text
- **Gray-600** (#4B5563): Body text, descriptions
- **Gray-500** (#6B7280): Tertiary text, metadata
- **Gray-400** (#9CA3AF): Disabled states, subtle dividers
- **Gray-300** (#D1D5DB): Borders, dividers
- **Gray-200** (#E5E7EB): Subtle borders, secondary dividers
- **Gray-100** (#F3F4F6): Hover backgrounds
- **Gray-50** (#F9FAFB): Background, sections
- **White** (#FFFFFF): Cards, primary backgrounds

### Accent Colors (Used Sparingly)
- **Green-600** (#059669): Success states, checkmarks
- **Green-800** (#065F46): Success text
- **Green-100** (#D1FAE5): Success backgrounds
- **Red-600** (#DC2626): Error states only
- **Black** (#000000): Logo accents only

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif;
```

### Font Weights
- **200 (Light)**: Logo variations
- **300 (Light)**: Logo variations
- **400 (Regular)**: Body text, descriptions
- **600 (Semibold)**: Subheadings, important text
- **700 (Bold)**: Headlines, CTAs

### Font Sizes
- **6xl** (60px): Main hero headlines
- **5xl** (48px): Section headlines
- **4xl** (36px): Subsection headlines
- **2xl** (24px): Card titles
- **xl** (20px): Large body text
- **lg** (18px): Emphasized body text
- **base** (16px): Standard body text
- **sm** (14px): Secondary text, descriptions
- **xs** (12px): Metadata, labels

### Letter Spacing
- Headlines: `-0.03em` (tight)
- Body text: Default
- Uppercase labels: `0.05em` (slightly expanded)

## Spacing & Layout

### Container
- Max-width: `container mx-auto`
- Padding: `px-6` (24px on mobile/desktop)

### Section Spacing
- Vertical padding: `py-20` (80px)
- Between elements: `mb-20` (80px) for major sections
- Card spacing: `gap-8` (32px)

### Grid System
- Primary: 1, 2, or 3 columns
- Breakpoints: 
  - Mobile: Single column
  - `md:` (768px+): 2-3 columns
  - `lg:` (1024px+): 3-4 columns

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

#### Primary Button
```jsx
<Button className="bg-gray-900 hover:bg-gray-800 text-white">
```
- Background: gray-900
- Hover: gray-800
- No rounded corners (`rounded-none` when specified)
- Padding: `px-8 py-4` for large, `px-6 py-3` for normal

#### Secondary Button
```jsx
<Button variant="outline" className="border-gray-900 text-gray-900 hover:bg-gray-100">
```
- Border: gray-900 (1-2px)
- Text: gray-900
- Hover: gray-100 background

#### Ghost Button
```jsx
<Button variant="ghost" className="text-gray-600 hover:text-gray-900">
```

### Badges
```jsx
<Badge className="bg-white text-gray-700 border-gray-300 px-6 py-2 text-sm">
```
- Minimal styling
- Used for section labels and status indicators

## Visual Elements

### Borders & Lines
- Primary borders: 1px solid gray-300
- Active/hover borders: 1px solid gray-900
- Emphasized borders: 2px solid gray-900
- Dividers: 1px solid gray-200

### Geometric Patterns
- Grid background: 40x40px squares with 0.5px lines at 5% opacity
- Decorative lines: 1px solid black at various opacities
- Square/rectangular emphasis over rounded shapes

### Icons
- Size: `w-4 h-4` (16px) for inline, `w-6 h-6` (24px) for feature icons
- Color: Inherit from text color, typically gray-600 or gray-900
- Library: Lucide React icons exclusively

## Animation & Interaction

### Motion Principles
- **Subtle and purposeful**: Animations should enhance, not distract
- **Duration**: 200-500ms for most transitions
- **Easing**: Default ease or linear for continuous animations

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
- Border color changes: gray-300 → gray-900
- Background fills: transparent → gray-100
- Text color darkening: gray-600 → gray-900
- Subtle scale: 1.00 → 1.02
- Underline animations for links

## Key Visual Characteristics

### 1. **Extreme Minimalism**
- No gradients (except specific AI agent cards)
- No shadows or drop-shadows
- No rounded corners on primary elements
- Flat design with emphasis on borders

### 2. **Geometric Precision**
- Square and rectangular shapes
- Right angles preferred
- Grid-based layouts
- Mathematical spacing (multiples of 4px/8px)

### 3. **Monochromatic Focus**
- 95% grayscale palette
- Color used only for:
  - Success states (green)
  - Error states (red)
  - Critical CTAs (black/gray-900)

### 4. **Typography-First**
- Large, bold headlines
- Clear hierarchy
- Plenty of whitespace
- No decorative fonts

### 5. **Motion Restraint**
- Subtle parallax effects
- Gentle fade-ins
- No bouncy or playful animations
- Professional, measured transitions

## Implementation Guidelines

### Do's
- ✅ Use consistent spacing multiples (4, 8, 16, 32, 64)
- ✅ Maintain high contrast (gray-900 on white)
- ✅ Keep animations under 500ms
- ✅ Use system fonts for optimal performance
- ✅ Emphasize content over decoration
- ✅ Use borders to create separation
- ✅ Apply hover states consistently

### Don'ts
- ❌ Add gradients without specific purpose
- ❌ Use shadows for depth
- ❌ Round corners unnecessarily
- ❌ Add colors outside the palette
- ❌ Create busy or complex layouts
- ❌ Use decorative elements without function
- ❌ Implement playful or bouncy animations

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

## Accessibility

- Minimum contrast ratio: 4.5:1 for body text
- Focus states: 2px solid gray-900 outline
- Interactive elements: minimum 44x44px touch target
- Semantic HTML structure
- ARIA labels where needed

## Special Components

### Logo Treatment
```jsx
<span style={{ fontWeight: 400 }}>P</span>
<span style={{ fontWeight: 300 }}>act</span>
<span style={{ fontWeight: 200 }}>wise</span>
```
Variable font weights create subtle distinction

### Status Indicators
- Active: 1.5px solid circle/square in gray-900
- Inactive: 1px solid circle/square in gray-400
- Processing: Rotating border animation

### Progress Indicators
- Thin horizontal lines (1px)
- Fill from left to right
- Gray-900 color
- No percentage text unless critical

## Summary

The Pactwise design system prioritizes **clarity**, **professionalism**, and **restraint**. Every element serves a purpose, with no superfluous decoration. The aesthetic communicates enterprise-grade reliability through precise geometry, generous whitespace, and a strictly limited color palette. This creates a sophisticated, trustworthy appearance that appeals to business decision-makers while maintaining excellent usability and performance.