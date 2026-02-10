---
name: linear-design-system
description: Maintain, extend, and improve the Linear design system. Add new UI components, modify design tokens, validate consistency, and ensure all components follow Linear's design principles and aesthetic guidelines. Use when adding components, updating tokens, validating design system usage, or migrating components to the design system.
version: 1.0.0
author: YC Agent
---

# Linear Design System Maintenance Skill

This skill guides the creation, maintenance, and improvement of the Linear design system implementation in this project.

## When to Use This Skill

Load this skill when:

- Adding new UI components to the design system
- Modifying design tokens (colors, typography, spacing, shadows, etc.)
- Validating component implementation against design system rules
- Migrating existing components to use design system tokens
- Reviewing code for design system compliance
- Generating component documentation

## Core Principles

### 1. Token-First Development

**NEVER hardcode design values**. Always use tokens from `src/lib/design-system/tokens/`:

```tsx
// ❌ WRONG - Hardcoded values
<div className="bg-[#1c1c1f] text-[#f7f8f8] rounded-[6px] p-[16px]">

// ✅ CORRECT - Using tokens
<div className="bg-bg-secondary text-text-primary rounded-md p-6">
```

**Hover States**: Smooth transitions with subtle effects

```tsx
className = 'hover:bg-bg-tertiary hover:shadow-md transition-base';
```

**Focus States**: Accent-colored ring

```tsx
className =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent';
```

### 2. Background Layering

Use increasing background layers to create depth:

```tsx
// Page background (darkest)
<div className="bg-bg-primary">
    // Card background
    <Card className="bg-bg-secondary">
        // Nested element
        <div className="bg-bg-tertiary">Content with depth</div>
    </Card>
</div>
```

### 3. Typography System

Use Linear's precise typography with negative letter spacing:

```tsx
// Display (hero sections)
className = 'text-[64px] font-semibold tracking-[-1.408px]';

// Headings
className = 'text-[24px] font-medium tracking-[-0.288px]';

// Body
className = 'text-[15px] leading-relaxed';

// Caption
className = 'text-[13px] text-text-secondary';
```

## Component Creation Workflow

### Step 1: Plan the Component

Before creating a component:

1. **Check existing components** in `src/components/ui/` for similar patterns
2. **Identify required tokens** from `src/lib/design-system/tokens/`
3. **Define variants** (visual styles) and sizes
4. **Plan interaction states** (hover, active, focus, disabled)

### Step 2: Component Structure

All components must follow this structure:

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 1. Define variants using cva
const componentVariants = cva(
    // Base classes (applied to all variants)
    'inline-flex items-center justify-center rounded-md transition-base',
    {
        variants: {
            variant: {
                default:
                    'bg-bg-secondary text-text-primary hover:bg-bg-tertiary',
                primary: 'bg-accent text-white hover:bg-accent-hover',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-8 px-3 text-sm',
                lg: 'h-12 px-6 text-lg',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

// 2. Define TypeScript interface
export interface ComponentProps
    extends
        React.HTMLAttributes<HTMLElement>,
        VariantProps<typeof componentVariants> {
    asChild?: boolean;
}

// 3. Export component with forwardRef
const Component = React.forwardRef<HTMLElement, ComponentProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <element
                ref={ref}
                className={cn(componentVariants({ variant, size, className }))}
                {...props}
            />
        );
    }
);

Component.displayName = 'Component';

export { Component, componentVariants };
```

### Step 3: Apply Linear Patterns

Ensure every interactive component includes:

1. **Smooth transitions**:

```tsx
className = 'transition-fast'; // 150ms
// or
className = 'transition-base'; // 200ms
```

2. **Focus ring**:

```tsx
className =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary';
```

3. **Disabled state**:

```tsx
className = 'disabled:opacity-50 disabled:pointer-events-none';
```

### Step 4: Create Variants

Common variant patterns in Linear's system:

**Button Variants**:

- `default`: Secondary background with hover
- `primary`: Accent background
- `secondary`: Tertiary background
- `ghost`: Transparent with hover
- `accent`: Linear purple
- `destructive`: Red for dangerous actions

**Badge Variants**:

- `default`: Neutral gray
- `success`: Green for positive states
- `info`: Blue for informational
- `warning`: Orange for caution
- `destructive`: Red for errors

**Status Colors** (use semantic naming):

```tsx
variant: {
  success: "bg-green/10 text-green border-green/20",
  info: "bg-blue/10 text-blue border-blue/20",
  warning: "bg-orange/10 text-orange border-orange/20",
  destructive: "bg-red/10 text-red border-red/20",
}
```

### Step 5: File Organization

Place files correctly:

- **New component**: `src/components/ui/{component-name}.tsx`
- **Component variants**: Use single file with `cva()`
- **Compound components**: Export multiple from same file (e.g., Card, CardHeader, CardContent)

### Step 6: Add to Demo

Update `/design-system` page to showcase the new component:

1. Import the component
2. Add section with heading
3. Show all variants and sizes
4. Include code example

## Token Management

### Adding New Tokens

When adding tokens to any file in `src/lib/design-system/tokens/`:

1. **Edit the token file**:

```typescript
// src/lib/design-system/tokens/colors.ts
export const colors = {
    // Existing tokens...

    // New token
    newColor: {
        default: '#7170ff',
        hover: '#828fff',
    },
};
```

2. **Export from index**:

```typescript
// src/lib/design-system/tokens/index.ts
export * from './colors';
export * from './typography';
// ... rest of exports
```

3. **Update Tailwind config** if needed:

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'new-color': 'var(--color-new-color)',
    }
  }
}
```

4. **Add CSS variable** to globals.css:

```css
:root {
    --color-new-color: theme('colors.newColor.DEFAULT');
}
```

### Token Categories

**Colors** (`colors.ts`):

- Background layers (primary → quaternary)
- Text hierarchy (primary → tertiary)
- Borders (primary, secondary)
- Accent colors
- Status colors (success, info, warning, destructive)

**Typography** (`typography.ts`):

- Font families (with OpenType features)
- Font weights (400, 510, 538)
- Type scales (display, heading, body, caption)
- Letter spacing (negative values)
- Line heights

**Spacing** (`spacing.ts`):

- 8px-based scale with irregular jumps
- Values: 0, 4, 8, 11, 16, 24, 32, 40, 48, 64, 80

**Radius** (`radius.ts`):

- xs (1px), sm (4px), md (6px), lg (8px), xl (10px), 2xl (16px), full (9999px)

**Shadows** (`shadows.ts`):

- Elevation levels (sm, md, lg)
- Focus ring shadow
- Inner glow effect

**Motion** (`motion.ts`):

- Durations (fast: 100ms, base: 150ms, normal: 200ms, slow: 300ms)
- Easings (out, in, in-out, spring)

## Validation Rules

### Component Validation Checklist

When reviewing or creating components, verify:

- [ ] **No hardcoded values** - All design values use tokens
- [ ] **TypeScript types** - Proper interfaces and props
- [ ] **ForwardRef** - Component accepts refs for composition
- [ ] **Variants with cva** - Uses `class-variance-authority`
- [ ] **Interactive states** - Proper hover and active states
- [ ] **No hover movement** - Elements don't shift on hover (no translate/scale/margin changes)
- [ ] **Smooth transitions** - Uses `transition-fast` or `transition-base`
- [ ] **Focus states** - Accent ring on focus-visible
- [ ] **Disabled states** - Proper opacity and pointer-events
- [ ] **Accessible** - Semantic HTML, ARIA attributes
- [ ] **Theme support** - Works in both dark and light modes
- [ ] **Exported** - Properly exported from file and index

### Common Issues

**Issue**: Hardcoded colors

```tsx
// ❌ WRONG
<div className="bg-[#1c1c1f]">

// ✅ CORRECT
<div className="bg-bg-secondary">
```

**Issue**: Inconsistent spacing

```tsx
// ❌ WRONG
<div className="p-[15px]">

// ✅ CORRECT
<div className="p-6"> {/* 16px from spacing scale */}
```

**Issue**: Missing focus states

```tsx
// ❌ WRONG
<button className="bg-accent">

// ✅ CORRECT
<button className="bg-accent focus-visible:ring-2 focus-visible:ring-accent">
```

## Migration Guide

### Migrating Existing Components

To migrate a component to the design system:

1. **Identify hardcoded values**:

```bash
# Search for hardcoded colors
grep -r "bg-\[#" src/components/
grep -r "text-\[#" src/components/
```

2. **Map to tokens**:

```tsx
// Before
className = 'bg-[#1c1c1f] text-[#f7f8f8]';

// After
className = 'bg-bg-secondary text-text-primary';
```

3. **Update imports**:

```tsx
// Use design system components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

## Examples

### Example 1: Creating a Select Component

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const selectVariants = cva(
    'flex items-center justify-between rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary transition-fast focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent disabled:opacity-50 disabled:pointer-events-none',
    {
        variants: {
            size: {
                default: 'h-10',
                sm: 'h-8 text-xs',
                lg: 'h-12 text-base',
            },
        },
        defaultVariants: {
            size: 'default',
        },
    }
);

export interface SelectProps
    extends
        React.SelectHTMLAttributes<HTMLSelectElement>,
        VariantProps<typeof selectVariants> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, size, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={cn(selectVariants({ size, className }))}
                {...props}
            />
        );
    }
);

Select.displayName = 'Select';

export { Select, selectVariants };
```

### Example 2: Adding a New Color Token

```typescript
// 1. Add to colors.ts
export const colors = {
  // ... existing colors
  purple: {
    default: '#a78bfa',
    hover: '#c4b5fd',
    light: '#e9d5ff',
  },
};

// 2. Update tailwind.config.ts
colors: {
  purple: {
    DEFAULT: '#a78bfa',
    hover: '#c4b5fd',
    light: '#e9d5ff',
  },
}

// 3. Add to globals.css
:root {
  --color-purple: #a78bfa;
  --color-purple-hover: #c4b5fd;
  --color-purple-light: #e9d5ff;
}

// 4. Use in components
<Badge className="bg-purple/10 text-purple border-purple/20">
  New Badge
</Badge>
```

### Example 3: Validating Component

```typescript
// Check this component for issues:
function MyComponent() {
  return (
    <button className="bg-[#7170ff] text-white p-4 rounded">
      Click me
    </button>
  );
}

// Issues found:
// ❌ Hardcoded background color (#7170ff)
// ❌ Hardcoded padding (p-4 should use design system scale)
// ❌ Missing hover state
// ❌ Missing focus ring
// ❌ Missing disabled state
// ❌ No transition

// Fixed version:
function MyComponent() {
  return (
    <button className="bg-accent text-white px-4 py-2 rounded-md hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-base disabled:opacity-50">
      Click me
    </button>
  );
}
```

## Documentation Generation

When creating a new component, add documentation:

### Component Documentation Template

```markdown
## {ComponentName}

**Location**: `src/components/ui/{component-name}.tsx`

**Description**: Brief description of what the component does.

### Usage

\`\`\`tsx
import { ComponentName } from '@/components/ui/{component-name}';

<ComponentName variant="default" size="md">
  Content
</ComponentName>
\`\`\`

### Variants

- `default`: Default styling
- `primary`: Primary accent styling
- `secondary`: Secondary styling

### Sizes

- `sm`: Small (compact spacing)
- `md`: Medium (default)
- `lg`: Large (generous spacing)

### Props

Extends `React.HTMLAttributes<HTMLElement>` with:

- `variant`: Variant style
- `size`: Component size
- `asChild`: Use child element as base (optional)
```

## Resources

### Reference Files

- **Token definitions**: `src/lib/design-system/tokens/`
- **Existing components**: `src/components/ui/`
- **Design system docs**: `DESIGN_SYSTEM.md`, `LINEAR_DESIGN_SYSTEM.md`
- **Demo page**: `src/app/design-system/page.tsx`
- **Tailwind config**: `tailwind.config.ts`
- **Global styles**: `src/app/globals.css`

### Source Data

Design system extracted from:

- `output/linear.app/2026-01-24T02-07-46-212Z.json`
- `output/linear.app/2026-01-24T02-09-26-752Z.json`
- `output/linear.app/2026-01-24T01-58-33-543Z.tokens.json`
- `output/linear.app/2026-01-24T02-03-04-856Z.tokens.json`

## Quick Commands

### Add a new component

1. Create file in `src/components/ui/{name}.tsx`
2. Use component template with `cva()` variants
3. Apply proper hover and focus states
4. Export from file
5. Add to demo page

### Modify tokens

1. Edit token file in `src/lib/design-system/tokens/`
2. Verify export in `tokens/index.ts`
3. Update Tailwind config if new token
4. Add CSS variable to globals.css if needed

### Validate component

1. Check for hardcoded values
2. Verify token usage
3. Check hover and focus states
4. Test in dark/light themes
5. Verify TypeScript types
6. Test accessibility

---

**Remember**: The goal is to maintain Linear's distinctive aesthetic—precise typography, subtle interactions, layered backgrounds, and smooth transitions. Every component should feel cohesive with the design system.
