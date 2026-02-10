# YC Companies Frontend Design

**Date:** 2026-02-10  
**Status:** Approved  
**Type:** Feature Implementation

## Overview

Build a front-end landing page to display and browse YC companies from the database with pagination. Uses Linear design system tokens, shadcn components, and Next.js 15 Server Components with SSR.

## Requirements

### Functional
- Display companies in a 4×6 grid (24 per page)
- Traditional pagination with page numbers
- Responsive layout (4 cols desktop, 2 tablet, 1 mobile)
- Server-side rendering for performance and SEO
- Show company logo, name, batch, description, location, and tags

### Non-Functional
- Follow Linear design system (no hardcoded values)
- Use design tokens from `src/lib/design-system/tokens/`
- Install shadcn components via MCP
- No hover movement (only visual changes)
- Fast page loads with SSR

## Architecture

### Routing
- **Route:** `/` (root page.tsx as Server Component)
- **URL Pattern:** `/?page=1`, `/?page=2`, etc.
- **Navigation:** Next.js Link with `scroll={false}` for smooth transitions

### Data Fetching (Server-Side)
```typescript
// app/page.tsx
export default async function Page({ searchParams }) {
  const page = Number(searchParams.page) || 1;
  
  // Get total count
  const countResult = await getCompanyCount();
  const totalPages = Math.ceil(countResult.data / 24);
  
  // Validate page number
  if (page < 1 || page > totalPages) redirect('/?page=1');
  
  // Fetch companies with offset
  const offset = (page - 1) * 24;
  const result = await getCompaniesWithOffset(offset, 24);
  
  return <CompanyDirectory companies={result.data} page={page} totalPages={totalPages} />;
}
```

### Pagination Strategy: Offset-Based

**Implementation:**
```sql
SELECT * FROM companies 
ORDER BY id 
LIMIT 24 OFFSET ${(page - 1) * 24}
```

**Why offset over cursor:**
- Simpler with page numbers
- Works naturally with shadcn Pagination
- No cursor-to-page mapping needed
- Acceptable performance with proper indexing

**Trade-off:** Slightly less efficient than cursor pagination, but negligible for this use case.

## Component Structure

### Page Hierarchy
```
app/page.tsx (Server Component)
├── Header
│   ├── Title: "YC Companies"
│   ├── Subtitle: "Discover companies from Y Combinator's portfolio"
│   └── Company count: "5,653 companies"
│
├── CompanyGrid (Client Component)
│   └── CompanyCard × 24
│
└── Pagination (shadcn)
```

### CompanyCard Component (Client Component)

**Props:**
```typescript
interface CompanyCardProps {
  company: Company;
}
```

**Structure:**
- Card container with hover states
- Logo section (48×48px)
- Batch badge (top-right corner)
- Company name
- One-liner description
- Location with icon
- Industry/tag badges (max 3-4 visible)

**Layout:**
```
┌─────────────────────────────────┐
│ [Logo]           [W26 Badge]    │
│                                  │
│ Company Name                     │
│ Brief one-liner description...   │
│                                  │
│ 📍 San Francisco, CA             │
│ [SaaS] [B2B] [AI] +2            │
└─────────────────────────────────┘
```

## Design System Implementation

### Linear Design Tokens (NO Hardcoded Values)

**Backgrounds (Layering for depth):**
- Page: `bg-bg-primary` (#08090a)
- Cards: `bg-bg-secondary` (#1c1c1f)
- Logo container: `bg-bg-tertiary` (#232326)

**Typography:**
- Title: Custom heading class with negative letter spacing
- Company name: `text-base font-medium text-text-primary`
- Description: `text-sm text-text-secondary`
- Location: `text-xs text-text-tertiary`

**Spacing:**
- Card padding: `p-6` (16px)
- Grid gap: `gap-4 lg:gap-6` (11px/16px)
- Section spacing: `space-y-4` (11px vertical)

**Borders & Shadows:**
- Border: `border-border-primary`
- Hover: `hover:border-border-secondary`
- Shadow: `shadow-sm hover:shadow-md`

**Interactive States:**
- Hover: `hover:bg-bg-tertiary transition-fast` (NO translate/scale)
- Focus: `focus-visible:ring-2 focus-visible:ring-accent`
- Transition: `transition-fast` (150ms)

**Radius:**
- Cards: `rounded-md` (6px)
- Badges: `rounded-full` (pills)

### Responsive Grid
```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
```

## Logo Handling

### Fallback Strategy
1. **Primary:** If `company.logo_url` exists and loads → show company logo
2. **Fallback:** If logo fails or null → show `/yc.png` with grayscale filter
3. **Styling:** `filter: grayscale(100%)` with `opacity-50` for subtle B&W effect

### Implementation
```tsx
<Image
  src={company.logo_url || '/yc.png'}
  alt={company.name}
  width={48}
  height={48}
  className={cn(
    'rounded-md object-cover',
    !company.logo_url && 'grayscale opacity-50'
  )}
  onError={(e) => {
    e.currentTarget.src = '/yc.png';
    e.currentTarget.className += ' grayscale opacity-50';
  }}
/>
```

## Tag & Badge Rendering

### Priority Logic
1. Show industries first (if available)
2. Fall back to tags if no industries
3. Limit to first 3-4 visible
4. Show "+N more" badge if exceeds

### Industry Color Mapping
```typescript
const industryColors: Record<string, string> = {
  'SaaS': 'blue',
  'Healthcare': 'green',
  'Fintech': 'blue',
  'AI': 'blue',
  'B2B': 'default',
  // ... more mappings
};
```

### Badge Variants (shadcn)
- Default: `bg-bg-tertiary text-text-secondary`
- Blue: `bg-blue/10 text-blue border-blue/20`
- Green: `bg-green/10 text-green border-green/20`
- Orange: `bg-orange/10 text-orange border-orange/20`

## Database Queries

### New Query: getCompaniesWithOffset

Add to `src/db/queries/companies.ts`:

```typescript
export async function getCompaniesWithOffset(
  offset: number,
  limit: number = 24
): Promise<QueryResult<Company[]>> {
  try {
    const sql = getDBClient();
    
    const results = await sql`
      SELECT 
        id, source, source_id, source_url, name, slug, website, logo_url,
        one_liner, long_description, tags, industries, regions, batch,
        team_size, founded_at, stage, status, is_hiring, is_nonprofit,
        all_locations, source_metadata, created_at, updated_at, last_synced_at
      FROM companies
      ORDER BY id
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { success: true, data: results as Company[] };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## Shadcn Components to Install

Use shadcn MCP to install:
1. **Card** - Company card container
2. **Badge** - Batch, industry, and tag badges
3. **Pagination** - Page navigation
4. **Avatar** (optional) - Logo fallback alternative

## Error Handling

### Empty State
```tsx
{companies.length === 0 && (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="rounded-full bg-bg-tertiary p-6 mb-4">
      <IconBuilding className="h-8 w-8 text-text-tertiary" />
    </div>
    <h3 className="text-lg font-medium text-text-primary mb-2">
      No companies found
    </h3>
    <p className="text-text-secondary">
      Check back later for new additions.
    </p>
  </div>
)}
```

### Error State
- Database errors → Show error component with retry option
- Invalid page → Redirect to `/?page=1`
- Network errors → Show error boundary

## Performance Optimizations

### Server-Side
- Direct database queries from Server Components
- No API routes needed (reduces latency)
- Streaming support with Suspense (future enhancement)

### Client-Side
- Minimal JavaScript (only pagination interaction)
- Next.js Image optimization for logos
- No client-side data fetching

### Caching
- Static generation not used (data changes frequently)
- Dynamic rendering with `force-dynamic` if needed
- Consider ISR with revalidation for future optimization

## File Structure

```
src/
├── app/
│   ├── page.tsx                    # Main landing page (Server Component)
│   └── favicon.ico
├── components/
│   ├── company-card.tsx            # Company card (Client Component)
│   ├── company-grid.tsx            # Grid wrapper (Client Component)
│   └── ui/                         # shadcn components
│       ├── card.tsx
│       ├── badge.tsx
│       └── pagination.tsx
├── db/
│   └── queries/
│       └── companies.ts            # Add getCompaniesWithOffset
└── lib/
    └── design-system/
        └── tokens/                 # Design tokens (already exists)
```

## Implementation Checklist

1. **Database Query**
   - [ ] Add `getCompaniesWithOffset` to `companies.ts`
   - [ ] Test pagination with different offsets

2. **Shadcn Components**
   - [ ] Install Card component via MCP
   - [ ] Install Badge component via MCP
   - [ ] Install Pagination component via MCP

3. **Company Card**
   - [ ] Create `CompanyCard` component
   - [ ] Implement logo with fallback
   - [ ] Add batch badge positioning
   - [ ] Implement tag rendering logic
   - [ ] Apply Linear design tokens

4. **Main Page**
   - [ ] Create `app/page.tsx` with SSR
   - [ ] Extract searchParams and validate
   - [ ] Fetch companies and total count
   - [ ] Render grid with pagination
   - [ ] Add error handling

5. **Testing**
   - [ ] Test pagination navigation
   - [ ] Verify responsive layout (desktop/tablet/mobile)
   - [ ] Test logo fallback
   - [ ] Validate design token usage (no hardcoded values)
   - [ ] Check hover states (no movement)
   - [ ] Test empty/error states

## Future Enhancements (Out of Scope)

- Search functionality (text + semantic)
- Filtering by batch, industry, stage
- Sorting options
- Company detail pages
- Infinite scroll option
- ISR/caching strategy

## Design Validation

### Linear Design System Compliance
- ✅ No hardcoded values (all tokens)
- ✅ Background layering (primary → secondary → tertiary)
- ✅ No hover movement (only visual changes)
- ✅ Proper focus states with accent ring
- ✅ Smooth transitions (transition-fast)
- ✅ Typography with negative letter spacing
- ✅ ForwardRef on all components
- ✅ CVA for variants

### Accessibility
- Semantic HTML structure
- Focus states on interactive elements
- Alt text on images
- ARIA labels where needed
- Keyboard navigation support

## Dependencies

**Existing:**
- Next.js 15+ (App Router)
- React 18+
- Tailwind CSS (with Linear tokens)
- Database client (`src/db/client.ts`)
- Linear design system tokens

**To Install:**
- shadcn/ui components (Card, Badge, Pagination)
- lucide-react (icons)

## Notes

- Pagination uses traditional page numbers (not infinite scroll)
- 24 companies per page (4×6 grid)
- Server-side rendering for all pages
- No search in initial version
- Linear design system strictly enforced (no hardcoded values)
- Reference image: CleanShot_2026-02-10_at_14.07.14_2x
