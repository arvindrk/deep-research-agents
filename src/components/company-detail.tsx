import Link from 'next/link';
import { Building2, ExternalLink, MapPin, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CompanyEvidence } from '@/components/company-evidence';
import { CompanyLogo } from '@/components/company-logo';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { StoredResearchRun } from '@/db/queries/research';
import type { Company } from '@/db/types';
import { formatBatch } from '@/lib/format-batch';
import { httpUrl } from '@/lib/safe-url';
import { cn } from '@/lib/utils';

function formatSyncedAt(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

interface CompanyDetailProps {
  company: Company;
  research: StoredResearchRun | null;
}

export function CompanyDetail({ company, research }: CompanyDetailProps) {
  const websiteHref = httpUrl(company.website);
  const description = company.long_description ?? company.one_liner;
  const tags = company.tags ?? [];
  const industries = company.industries ?? [];

  return (
    <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <nav className="mb-8">
          <Link
            href="/"
            className={cn(
              'text-sm',
              'text-[var(--color-text-secondary)]',
              'hover:text-[var(--color-text-primary)]'
            )}
          >
            ← All companies
          </Link>
        </nav>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex items-start gap-4">
              {company.logo_url ? (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  <CompanyLogo src={company.logo_url} name={company.name} size={64} />
                </div>
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-2xl leading-tight">
                    {company.name}
                  </CardTitle>
                  {company.batch && (
                    <Badge variant="secondary">{formatBatch(company.batch)}</Badge>
                  )}
                  <Badge variant="outline">{company.status}</Badge>
                </div>

                {company.one_liner && company.long_description && (
                  <CardDescription className="text-base">
                    {company.one_liner}
                  </CardDescription>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-8">
            {description && (
              <section className="space-y-2">
                <h2
                  className={cn(
                    'text-sm font-medium',
                    'text-[var(--color-text-secondary)]'
                  )}
                >
                  About
                </h2>
                <p
                  className={cn(
                    'whitespace-pre-wrap text-base leading-relaxed',
                    'text-[var(--color-text-primary)]'
                  )}
                >
                  {description}
                </p>
              </section>
            )}

            <dl className="grid gap-4 sm:grid-cols-2">
              {websiteHref && (
                <div className="space-y-1">
                  <dt
                    className={cn(
                      'text-sm font-medium',
                      'text-[var(--color-text-secondary)]'
                    )}
                  >
                    Website
                  </dt>
                  <dd>
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        'inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline',
                        'text-[var(--color-text-primary)]'
                      )}
                    >
                      {websiteHref.replace(/^https?:\/\//, '')}
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </dd>
                </div>
              )}

              {company.team_size != null && (
                <div className="space-y-1">
                  <dt
                    className={cn(
                      'text-sm font-medium',
                      'text-[var(--color-text-secondary)]'
                    )}
                  >
                    Team size
                  </dt>
                  <dd
                    className={cn(
                      'inline-flex items-center gap-1.5 text-sm',
                      'text-[var(--color-text-primary)]'
                    )}
                  >
                    <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                    {company.team_size.toLocaleString()}
                  </dd>
                </div>
              )}

              {company.all_locations && (
                <div className="space-y-1 sm:col-span-2">
                  <dt
                    className={cn(
                      'text-sm font-medium',
                      'text-[var(--color-text-secondary)]'
                    )}
                  >
                    Location
                  </dt>
                  <dd
                    className={cn(
                      'inline-flex items-start gap-1.5 text-sm',
                      'text-[var(--color-text-primary)]'
                    )}
                  >
                    <MapPin
                      className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    {company.all_locations}
                  </dd>
                </div>
              )}

              <div className="space-y-1">
                <dt
                  className={cn(
                    'text-sm font-medium',
                    'text-[var(--color-text-secondary)]'
                  )}
                >
                  Last synced
                </dt>
                <dd
                  className={cn(
                    'text-sm',
                    'text-[var(--color-text-primary)]'
                  )}
                >
                  {formatSyncedAt(company.last_synced_at)}
                </dd>
              </div>
            </dl>

            {industries.length > 0 && (
              <section className="space-y-2">
                <h2
                  className={cn(
                    'text-sm font-medium',
                    'text-[var(--color-text-secondary)]'
                  )}
                >
                  Industries
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {industries.map((industry) => (
                    <Badge key={industry} variant="secondary">
                      {industry}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {tags.length > 0 && (
              <section className="space-y-2">
                <h2
                  className={cn(
                    'text-sm font-medium',
                    'text-[var(--color-text-secondary)]'
                  )}
                >
                  Tags
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
            {research && <CompanyEvidence research={research} now={new Date()} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
