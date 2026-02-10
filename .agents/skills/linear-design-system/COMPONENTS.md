# Linear Design System Components Guide

Patterns and examples for creating components in the Linear design system.

## Component Architecture

### Base Structure

All components follow this architecture:

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// 1. Variant definition
const componentVariants = cva('base classes', {
    variants: {
        /* variant definitions */
    },
    defaultVariants: {
        /* defaults */
    },
});

// 2. TypeScript interface
export interface ComponentProps
    extends
        React.HTMLAttributes<HTMLElement>,
        VariantProps<typeof componentVariants> {}

// 3. Component implementation
const Component = React.forwardRef<HTMLElement, ComponentProps>(
    ({ className, variant, ...props }, ref) => {
        return (
            <element
                ref={ref}
                className={cn(componentVariants({ variant, className }))}
                {...props}
            />
        );
    }
);

Component.displayName = 'Component';

export { Component, componentVariants };
```

---

## Component Examples

### Button Component

**Full implementation** from `src/components/ui/button.tsx`:

```tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    // Base classes - applied to all variants
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                default:
                    'bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-border-primary',
                primary: 'bg-accent text-white hover:bg-accent-hover',
                secondary:
                    'bg-bg-tertiary text-text-primary hover:bg-bg-quaternary',
                ghost: 'hover:bg-bg-secondary hover:text-text-primary',
                accent: 'bg-accent text-white hover:bg-accent-hover shadow-sm',
                destructive: 'bg-red text-white hover:bg-red/90',
            },
            size: {
                default: 'h-10 px-4 py-2',
                sm: 'h-8 rounded-md px-3 text-xs',
                lg: 'h-12 rounded-lg px-6 text-base',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends
        React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button';
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Key patterns**:

- `transition-fast` - Smooth 150ms transitions
- `focus-visible:ring-2 focus-visible:ring-accent` - Accessible focus states
- `disabled:opacity-50 disabled:pointer-events-none` - Proper disabled state

**Usage**:

```tsx
<Button variant="default">Default</Button>
<Button variant="primary">Primary</Button>
<Button variant="accent" size="lg">Large Accent</Button>
<Button variant="ghost" size="sm">Small Ghost</Button>
```

---

### Badge Component

**Full implementation** from `src/components/ui/badge.tsx`:

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2',
    {
        variants: {
            variant: {
                default:
                    'border-border-primary bg-bg-secondary text-text-secondary',
                secondary:
                    'border-border-primary bg-bg-tertiary text-text-primary',
                success: 'border-green/20 bg-green/10 text-green',
                destructive: 'border-red/20 bg-red/10 text-red',
                warning: 'border-orange/20 bg-orange/10 text-orange',
                info: 'border-blue/20 bg-blue/10 text-blue',
                outline: 'border-border-secondary text-text-primary',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends
        React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
```

**Status color pattern**:

```tsx
// Color/10 background + Color text + Color/20 border
'border-green/20 bg-green/10 text-green';
```

**Usage**:

```tsx
<Badge variant="success">Active</Badge>
<Badge variant="info">Beta</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="destructive">Error</Badge>
```

---

### Card Component

**Full implementation** from `src/components/ui/card.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'rounded-lg border border-border-primary bg-bg-secondary text-text-primary shadow-sm transition-all hover:border-border-secondary hover:shadow-md',
            className
        )}
        {...props}
    />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            'text-2xl font-semibold leading-none tracking-tight',
            className
        )}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-text-secondary', className)}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
};
```

**Key patterns**:

- Compound components exported from single file
- Hover border change: `hover:border-border-secondary`
- Shadow on hover: `hover:shadow-md`
- Semantic structure with Header/Content/Footer

**Usage**:

```tsx
<Card>
    <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description or subtitle</CardDescription>
    </CardHeader>
    <CardContent>
        <p>Main card content goes here</p>
    </CardContent>
    <CardFooter>
        <Button>Action</Button>
    </CardFooter>
</Card>
```

---

### Input Component

**Full implementation** from `src/components/ui/input.tsx`:

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    'flex h-10 w-full rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary ring-offset-bg-primary file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-fast',
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';

export { Input };
```

**Key patterns**:

- Focus ring with offset: `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`
- Placeholder styling: `placeholder:text-text-tertiary`
- File input styling: `file:border-0 file:bg-transparent`

**Usage**:

```tsx
<Input type="text" placeholder="Enter text..." />
<Input type="email" placeholder="email@example.com" />
<Input type="password" placeholder="Password" />
```

---

## New Component Templates

### Select/Dropdown Template

```tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const selectVariants = cva(
    'flex h-10 w-full items-center justify-between rounded-md border border-border-primary bg-bg-secondary px-3 py-2 text-sm text-text-primary ring-offset-bg-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-fast',
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
    ({ className, size, children, ...props }, ref) => {
        return (
            <select
                ref={ref}
                className={cn(selectVariants({ size, className }))}
                {...props}
            >
                {children}
            </select>
        );
    }
);

Select.displayName = 'Select';

export { Select, selectVariants };
```

### Checkbox Template

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
    ({ className, ...props }, ref) => {
        return (
            <input
                type="checkbox"
                ref={ref}
                className={cn(
                    'h-4 w-4 rounded border-border-primary bg-bg-secondary text-accent ring-offset-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-fast',
                    className
                )}
                {...props}
            />
        );
    }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
```

### Modal/Dialog Template

```tsx
import * as React from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange(false)}
            />

            {/* Content */}
            <div className="relative z-50 w-full max-w-lg animate-in fade-in-0 zoom-in-95">
                {children}
            </div>
        </div>
    );
};

const DialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'rounded-lg border border-border-primary bg-bg-secondary p-6 shadow-lg',
            className
        )}
        {...props}
    />
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex flex-col space-y-1.5 text-center sm:text-left',
            className
        )}
        {...props}
    />
));
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h2
        ref={ref}
        className={cn('text-lg font-semibold text-text-primary', className)}
        {...props}
    />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-text-secondary', className)}
        {...props}
    />
));
DialogDescription.displayName = 'DialogDescription';

export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription };
```

**Usage**:

```tsx
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
        <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog description text</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">{/* Dialog content */}</div>
    </DialogContent>
</Dialog>;
```

---

## Component Patterns

### Compound Components Pattern

Use for complex components with multiple sub-components:

```tsx
// Export multiple related components from single file
export {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
};

// Usage allows flexible composition
<Card>
    <CardHeader>
        <CardTitle>Title</CardTitle>
    </CardHeader>
    <CardContent>Content</CardContent>
</Card>;
```

### AsChild Pattern

Allow component to be rendered as a different element:

```tsx
import { Slot } from '@radix-ui/react-slot';

interface ButtonProps {
    asChild?: boolean;
    // ... other props
}

const Button: React.FC<ButtonProps> = ({ asChild = false, ...props }) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp {...props} />;
};

// Usage
<Button asChild>
    <a href="/link">Link styled as button</a>
</Button>;
```

### Variant Composition

Combine variants for complex styling:

```tsx
const componentVariants = cva('base classes', {
    variants: {
        variant: {
            /* styles */
        },
        size: {
            /* sizes */
        },
        state: {
            /* states */
        },
    },
    compoundVariants: [
        {
            variant: 'primary',
            size: 'lg',
            className: 'additional classes for primary + large',
        },
    ],
    defaultVariants: {
        /* defaults */
    },
});
```

---

## Common Patterns

### Loading States

```tsx
<Card className="animate-pulse">
    <CardHeader>
        <div className="h-6 bg-bg-tertiary rounded w-1/2" />
        <div className="h-4 bg-bg-tertiary rounded w-3/4 mt-2" />
    </CardHeader>
    <CardContent>
        <div className="h-4 bg-bg-tertiary rounded w-full" />
    </CardContent>
</Card>
```

### Empty States

```tsx
<div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="rounded-full bg-bg-tertiary p-6 mb-4">
        <Icon className="h-8 w-8 text-text-tertiary" />
    </div>
    <h3 className="text-lg font-medium text-text-primary mb-2">
        No items found
    </h3>
    <p className="text-text-secondary mb-6">
        Get started by creating your first item.
    </p>
    <Button variant="primary">Create Item</Button>
</div>
```

### Error States

```tsx
<div className="rounded-lg border border-red/20 bg-red/10 p-4">
    <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red flex-shrink-0" />
        <div>
            <h4 className="text-sm font-medium text-red mb-1">Error</h4>
            <p className="text-sm text-text-secondary">
                An error occurred. Please try again.
            </p>
        </div>
    </div>
</div>
```

### Lists with Hover

```tsx
<div className="space-y-2">
    {items.map((item) => (
        <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-fast cursor-pointer border border-transparent hover:border-border-secondary"
        >
            <span className="text-text-primary">{item.name}</span>
            <Badge variant="success">{item.status}</Badge>
        </div>
    ))}
</div>
```

---

## Best Practices

### 1. Always Use ForwardRef

```tsx
const Component = React.forwardRef<HTMLElement, ComponentProps>(
    (props, ref) => {
        return <element ref={ref} {...props} />;
    }
);
```

### 2. Set DisplayName

```tsx
Component.displayName = 'Component';
```

### 3. Use CVA for Variants

```tsx
import { cva, type VariantProps } from 'class-variance-authority';

const variants = cva('base', {
    variants: {
        /* */
    },
});
```

### 4. Extend HTML Attributes

```tsx
interface ComponentProps
    extends
        React.HTMLAttributes<HTMLElement>,
        VariantProps<typeof componentVariants> {}
```

### 5. Apply Interactive States (No Movement)

```tsx
// ✅ GOOD - Visual changes only (no position shift)
className="
  hover:bg-accent-hover
  hover:text-white
  focus-visible:ring-2 focus-visible:ring-accent
  transition-fast
"

// ❌ BAD - These cause element movement
className="
  hover:translate-x-1    // Shifts position
  hover:scale-105        // Changes size
  hover:m-2             // Changes layout
"
```

---

**For token reference, see `TOKENS.md`. For validation rules, see `SKILL.md`.**
