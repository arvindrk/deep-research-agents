# Linear Design System Tokens Reference

Complete reference for all design tokens in the Linear design system.

## Token Categories

### Colors

**Location**: `src/lib/design-system/tokens/colors.ts`

#### Background Layers

Use for creating depth and hierarchy:

```typescript
backgrounds: {
  primary: '#08090a',    // Darkest - page background
  secondary: '#1c1c1f',  // Layer 2 - cards, panels
  tertiary: '#232326',   // Layer 3 - nested elements
  quaternary: '#28282c', // Layer 4 - deeply nested
}
```

**Tailwind classes**: `bg-bg-primary`, `bg-bg-secondary`, `bg-bg-tertiary`, `bg-bg-quaternary`

**Usage pattern**:

```tsx
<div className="bg-bg-primary">
    {' '}
    {/* Page */}
    <Card className="bg-bg-secondary">
        {' '}
        {/* Card */}
        <div className="bg-bg-tertiary">
            {' '}
            {/* Nested */}
            Content
        </div>
    </Card>
</div>
```

#### Text Colors

```typescript
text: {
  primary: '#f7f8f8',   // Main content
  secondary: '#8a8f98', // Supporting text
  tertiary: '#62666d',  // Subtle text, placeholders
}
```

**Tailwind classes**: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`

#### Border Colors

```typescript
borders: {
  primary: 'rgba(255, 255, 255, 0.06)',   // Default borders
  secondary: 'rgba(255, 255, 255, 0.08)', // Hover borders
}
```

**Tailwind classes**: `border-border-primary`, `border-border-secondary`

#### Accent Colors

```typescript
accent: {
  default: '#7170ff',  // Linear purple
  hover: '#828fff',    // Hover state
  light: '#9998ff',    // Light variant
}
```

**Tailwind classes**: `bg-accent`, `text-accent`, `bg-accent-hover`, `border-accent`

#### Status Colors

```typescript
status: {
  green: '#4cb782',   // Success, active
  blue: '#4ea7fc',    // Info, processing
  red: '#eb5757',     // Error, destructive
  orange: '#fc7840',  // Warning
  yellow: '#f2c94c',  // Caution
}
```

**Tailwind classes**: `text-green`, `bg-green`, `text-blue`, etc.

**Usage in badges**:

```tsx
<Badge className="bg-green/10 text-green border-green/20">Active</Badge>
<Badge className="bg-blue/10 text-blue border-blue/20">Info</Badge>
<Badge className="bg-red/10 text-red border-red/20">Error</Badge>
```

---

### Typography

**Location**: `src/lib/design-system/tokens/typography.ts`

#### Font Family

```typescript
fontFamily: {
  sans: '"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

// OpenType features enabled:
fontFeatureSettings: '"cv01", "ss03"'
```

#### Font Weights

```typescript
fontWeight: {
  regular: 400,
  medium: 510,   // Linear's custom medium weight
  semibold: 538, // Linear's custom semibold
}
```

**Tailwind classes**: `font-regular`, `font-medium`, `font-semibold`

#### Type Scale

**Display** (Hero sections, large headings):

```typescript
displayXl: {
  fontSize: '64px',
  lineHeight: '72px',
  letterSpacing: '-1.408px',
  fontWeight: 538,
}

displayLg: {
  fontSize: '48px',
  lineHeight: '56px',
  letterSpacing: '-1.056px',
  fontWeight: 538,
}

displayMd: {
  fontSize: '36px',
  lineHeight: '44px',
  letterSpacing: '-0.792px',
  fontWeight: 538,
}
```

**Heading** (Section titles, card headers):

```typescript
headingXl: {
  fontSize: '30px',
  lineHeight: '38px',
  letterSpacing: '-0.66px',
  fontWeight: 538,
}

headingLg: {
  fontSize: '24px',
  lineHeight: '32px',
  letterSpacing: '-0.288px',
  fontWeight: 510,
}

headingMd: {
  fontSize: '18px',
  lineHeight: '24px',
  letterSpacing: '-0.144px',
  fontWeight: 510,
}

headingSm: {
  fontSize: '16px',
  lineHeight: '24px',
  letterSpacing: '-0.096px',
  fontWeight: 510,
}
```

**Body** (Main content):

```typescript
bodyLg: {
  fontSize: '16px',
  lineHeight: '24px',
  letterSpacing: '-0.096px',
  fontWeight: 400,
}

bodyMd: {
  fontSize: '15px',
  lineHeight: '22px',
  letterSpacing: '-0.09px',
  fontWeight: 400,
}

bodyBase: {
  fontSize: '14px',
  lineHeight: '20px',
  letterSpacing: '-0.084px',
  fontWeight: 400,
}
```

**Button** (UI elements):

```typescript
buttonLg: {
  fontSize: '15px',
  lineHeight: '22px',
  letterSpacing: '-0.09px',
  fontWeight: 510,
}

buttonMd: {
  fontSize: '14px',
  lineHeight: '20px',
  letterSpacing: '-0.084px',
  fontWeight: 510,
}

buttonSm: {
  fontSize: '13px',
  lineHeight: '18px',
  letterSpacing: '-0.078px',
  fontWeight: 510,
}
```

**Caption** (Metadata, labels):

```typescript
captionMd: {
  fontSize: '13px',
  lineHeight: '18px',
  letterSpacing: '-0.078px',
  fontWeight: 400,
}

captionBase: {
  fontSize: '12px',
  lineHeight: '16px',
  letterSpacing: '-0.072px',
  fontWeight: 400,
}

captionSm: {
  fontSize: '11px',
  lineHeight: '14px',
  letterSpacing: '-0.066px',
  fontWeight: 400,
}

captionXs: {
  fontSize: '10px',
  lineHeight: '12px',
  letterSpacing: '-0.06px',
  fontWeight: 400,
}
```

**Usage**:

```tsx
// Custom classes available
<h1 className="text-[64px] font-semibold tracking-[-1.408px]">Hero</h1>
<h2 className="text-[24px] font-medium tracking-[-0.288px]">Section</h2>
<p className="text-[15px] tracking-[-0.09px]">Body text</p>
<span className="text-[13px] text-text-secondary">Caption</span>
```

---

### Spacing

**Location**: `src/lib/design-system/tokens/spacing.ts`

8px-based scale with irregular jumps (matching Linear's system):

```typescript
spacing: {
  px: '1px',
  0: '0',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  2.5: '10px',
  3: '11px',   // Irregular
  3.5: '14px',
  4: '11px',   // 11px (common gap)
  5: '13px',
  6: '16px',   // Common padding
  7: '18px',
  8: '24px',
  9: '28px',
  10: '32px',
  11: '36px',
  12: '40px',
  14: '48px',
  16: '64px',
  20: '80px',
}
```

**Common usage**:

```tsx
// Padding
className = 'p-6'; // 16px - card padding
className = 'px-4'; // 11px horizontal
className = 'py-2'; // 8px vertical

// Gap
className = 'gap-4'; // 11px between flex items
className = 'gap-6'; // 16px larger gap
className = 'space-y-4'; // 11px vertical spacing

// Margins
className = 'mb-8'; // 24px bottom margin
className = 'mt-6'; // 16px top margin
```

---

### Border Radius

**Location**: `src/lib/design-system/tokens/radius.ts`

```typescript
borderRadius: {
  xs: '1px',
  sm: '4px',
  md: '6px',    // Most common
  lg: '8px',
  xl: '10px',
  '2xl': '16px',
  full: '9999px', // Pills, circles
}
```

**Tailwind classes**: `rounded-xs`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`

**Usage**:

```tsx
<Card className="rounded-md">     {/* 6px - default */}
<Button className="rounded-lg">   {/* 8px - buttons */}
<Badge className="rounded-full">  {/* Pills */}
```

---

### Shadows

**Location**: `src/lib/design-system/tokens/shadows.ts`

```typescript
shadows: {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',           // Subtle elevation
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',         // Medium elevation
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',       // Large elevation
  focus: '0 0 0 3px rgba(113, 112, 255, 0.1)',     // Focus ring
  'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.05)', // Inner highlight
}
```

**Tailwind classes**: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-focus`, `shadow-inner-glow`

**Custom utilities**:

```tsx
// Available in globals.css
className = 'linear-shadow-sm'; // Subtle card shadow
className = 'linear-shadow-md'; // Hover elevation
```

**Usage**:

```tsx
<Card className="shadow-sm hover:shadow-md">  {/* Hover elevation */}
<Button className="focus-visible:ring-2 focus-visible:ring-accent"> {/* Focus */}
```

---

### Motion

**Location**: `src/lib/design-system/tokens/motion.ts`

#### Durations

```typescript
duration: {
  fast: '100ms',
  base: '150ms',   // Most common
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
}
```

**Tailwind classes**: `duration-fast`, `duration-base`, `duration-normal`, `duration-slow`

**Custom classes**:

```tsx
className = 'transition-fast'; // 150ms
className = 'transition-base'; // 200ms
className = 'transition-all'; // All properties
```

#### Easing Functions

```typescript
easing: {
  out: 'cubic-bezier(0, 0, 0.2, 1)',        // Default - smooth out
  in: 'cubic-bezier(0.4, 0, 1, 1)',         // Ease in
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)', // Ease in-out
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring effect
}
```

**Tailwind classes**: `ease-out`, `ease-in`, `ease-in-out`

**Usage patterns**:

```tsx
// Standard transition
className = 'transition-base ease-out';

// Hover with color/background change
className = 'hover:bg-accent-hover transition-fast';

// Multiple properties
className = 'hover:bg-accent-hover hover:opacity-90 transition-base';
```

---

## Hover State Guidelines

### Allowed Hover Effects (No Movement)

**Background changes**:

```tsx
✅ hover:bg-bg-tertiary
✅ hover:bg-accent-hover
✅ hover:bg-[rgba(255,255,255,0.08)]
```

**Color changes**:

```tsx
✅ hover:text-text-primary
✅ hover:text-accent
✅ hover:border-accent
```

**Opacity changes**:

```tsx
✅ hover:opacity-90
✅ hover:opacity-80
```

**Shadow changes**:

```tsx
✅ hover:shadow-md
✅ hover:shadow-lg
```

**Text decoration**:

```tsx
✅ hover:underline
✅ hover:no-underline
```

### Prohibited Hover Effects (Causes Movement)

**Transform properties** - These shift element position:

```tsx
❌ hover:translate-x-1    // Shifts element horizontally
❌ hover:translate-y-1    // Shifts element vertically
❌ hover:scale-105        // Scales element (causes shift)
❌ hover:scale-[0.97]     // Scales element (causes shift)
```

**Margin/Padding changes** - These affect layout:

```tsx
❌ hover:m-2              // Changes margins (shifts layout)
❌ hover:p-4              // Changes padding (shifts content)
❌ hover:mx-4             // Changes horizontal margins
❌ hover:py-2             // Changes vertical padding
```

**Border width changes** - These push content:

```tsx
❌ hover:border-2         // Changes border width (shifts element)
❌ hover:border-4         // Unless using box-shadow to fake border
```

### Why No Movement?

Element movement on hover creates:

- **Layout instability** - Other elements shift unexpectedly
- **Jarring UX** - Creates visual noise and distraction
- **Accessibility issues** - Hard to track for users with motor impairments
- **Poor mobile experience** - Touch targets become unpredictable

**Best practice**: Use visual changes (color, opacity, shadow) instead of positional changes for hover feedback.

---

## Token Usage Patterns

### Creating Depth with Layers

```tsx
// Level 1: Page background
<div className="min-h-screen bg-bg-primary">
    // Level 2: Cards/panels
    <Card className="bg-bg-secondary">
        // Level 3: Nested elements
        <div className="bg-bg-tertiary rounded-md p-4">
            // Level 4: Deeply nested
            <div className="bg-bg-quaternary">Content</div>
        </div>
    </Card>
</div>
```

### Text Hierarchy

```tsx
<div>
    <h1 className="text-text-primary font-semibold">
        {' '}
        {/* Primary heading */}
        Main Title
    </h1>
    <p className="text-text-secondary">
        {' '}
        {/* Secondary text */}
        Supporting description
    </p>
    <span className="text-text-tertiary text-sm">
        {' '}
        {/* Tertiary/subtle */}
        Metadata
    </span>
</div>
```

### Interactive States

```tsx
<Button
    className="
    bg-accent text-white                    // Base state
    hover:bg-accent-hover                   // Hover
    focus-visible:ring-2 focus-visible:ring-accent  // Focus
    disabled:opacity-50 disabled:pointer-events-none // Disabled
    transition-base                         // Smooth transition
  "
>
    Click me
</Button>
```

### Status Indicators

```tsx
{
    /* Success */
}
<Badge className="bg-green/10 text-green border border-green/20">Active</Badge>;

{
    /* Info */
}
<Badge className="bg-blue/10 text-blue border border-blue/20">
    Processing
</Badge>;

{
    /* Warning */
}
<Badge className="bg-orange/10 text-orange border border-orange/20">
    Pending
</Badge>;

{
    /* Error */
}
<Badge className="bg-red/10 text-red border border-red/20">Failed</Badge>;
```

---

## Token Guidelines

### Do's

✅ Always use design tokens via Tailwind classes
✅ Follow the background layering system for depth
✅ Use negative letter spacing for typography
✅ Apply smooth transitions to all interactive elements
✅ Implement proper focus states with accent rings

### Don'ts

❌ Never hardcode color values (`#7170ff`)
❌ Don't use arbitrary spacing values (`p-[15px]`)
❌ Don't mix design systems (no random Tailwind colors)
❌ Never omit focus states

---

## Quick Reference

### Most Common Tokens

**Colors**:

- Background: `bg-bg-secondary`
- Text: `text-text-primary`
- Accent: `bg-accent`, `text-accent`
- Border: `border-border-primary`

**Typography**:

- Heading: `text-[24px] font-medium tracking-[-0.288px]`
- Body: `text-[15px] tracking-[-0.09px]`
- Caption: `text-[13px] text-text-secondary`

**Spacing**:

- Card padding: `p-6` (16px)
- Gap: `gap-4` (11px)
- Section margin: `mb-8` (24px)

**Radius**:

- Default: `rounded-md` (6px)
- Button: `rounded-lg` (8px)

**Shadows**:

- Card: `shadow-sm`
- Hover: `hover:shadow-md`

---

**For implementation examples, see `SKILL.md` and `COMPONENTS.md`.**
