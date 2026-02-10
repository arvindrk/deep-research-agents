# Linear Design System Skill

AI agent skill for maintaining, extending, and improving a Linear-based design system.

## Quick Start

This skill helps you:

- ✨ Create new UI components following Linear's design patterns
- 🎨 Manage design tokens (colors, typography, spacing, etc.)
- ✅ Validate components against design system rules
- 🔄 Migrate existing components to use the design system
- 📚 Document and maintain design system consistency

## File Structure

```
linear-design-system/
├── SKILL.md         # Main skill guide - Start here
├── TOKENS.md        # Complete token reference
├── COMPONENTS.md    # Component patterns & examples
├── VALIDATION.md    # Validation rules & checklists
├── metadata.json    # Skill metadata
└── README.md        # This file
```

## When to Use This Skill

Load this skill when you need to:

- **Add components**: Create Button, Card, Input, Modal, etc.
- **Modify tokens**: Update colors, spacing, typography scales
- **Review code**: Check for design system compliance
- **Migrate components**: Convert to use design tokens
- **Validate**: Ensure Linear patterns are followed

## Quick Reference

### Core Principles

1. **Token-First**: Never hardcode values

    ```tsx
    ❌ className="bg-[#1c1c1f]"
    ✅ className="bg-bg-secondary"
    ```

2. **Background Layers**: Create depth

    ```tsx
    ✅ bg-bg-primary → bg-bg-secondary → bg-bg-tertiary
    ```

3. **Precise Typography**: Negative letter spacing
    ```tsx
    ✅ text-[24px] font-medium tracking-[-0.288px]
    ```

### Component Template

```tsx
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const componentVariants = cva('base classes', {
    variants: {
        /* */
    },
    defaultVariants: {
        /* */
    },
});

interface ComponentProps extends VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLElement, ComponentProps>(
    ({ className, variant, ...props }, ref) => (
        <element
            ref={ref}
            className={cn(componentVariants({ variant, className }))}
            {...props}
        />
    )
);
```

## Design System Locations

- **Tokens**: `src/lib/design-system/tokens/`
- **Components**: `src/components/ui/`
- **Config**: `tailwind.config.ts`, `src/app/globals.css`
- **Demo**: `src/app/design-system/page.tsx`

## Common Tasks

### Create New Component

1. Read `SKILL.md` → Component Creation Workflow
2. Reference `COMPONENTS.md` for patterns
3. Use `TOKENS.md` for design values
4. Validate with `VALIDATION.md` checklist

### Modify Tokens

1. Edit token file in `src/lib/design-system/tokens/`
2. Update Tailwind config if needed
3. Test affected components
4. Update documentation

### Validate Component

1. Check for hardcoded values
2. Verify proper hover and focus states
3. Test focus/hover/active states
4. Ensure theme compatibility
5. Review accessibility

## Resources

- **Main Guide**: Start with `SKILL.md`
- **Token Reference**: See `TOKENS.md` for all tokens
- **Examples**: `COMPONENTS.md` has full implementations
- **Validation**: Use `VALIDATION.md` for code review

## Design System Info

**Based on**: Linear.app production tokens  
**Source files**: `output/linear.app/*.json`  
**Version**: 1.0.0  
**Framework**: Next.js + Tailwind CSS  
**Tools**: CVA, TypeScript, React

## Key Features

- 🎯 Production-grade tokens from Linear
- 🔒 Type-safe with TypeScript
- 🌓 Dark-first with light theme support
- ⚡ Smooth transitions and interactions
- 📐 Precise spacing, typography, and colors
- 🧩 Extensible and consistent

---

**For detailed instructions, read `SKILL.md` first, then reference the other docs as needed.**
