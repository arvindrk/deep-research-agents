import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyLogo } from '@/components/company-logo';
import type { Company } from '@/db/types';
import { overflowTagLabel, pickDisplayTags } from '@/lib/company-tags';
import { formatBatch } from '@/lib/format-batch';
import { Building2, MapPin } from 'lucide-react';

interface CompanyCardProps {
  company: Company;
}

export function CompanyCard({ company }: CompanyCardProps) {
  const displayTags = pickDisplayTags(company.tags);
  const overflowLabel = overflowTagLabel(company.tags);

  return (
    <Link
      href={`/companies/${company.id}`}
      prefetch={false}
      className="block transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
      aria-label={`View details for ${company.name}`}
    >
      <Card className="flex flex-col h-full">
        <CardHeader className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {company.logo_url ? (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  <CompanyLogo src={company.logo_url} name={company.name} size={48} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <CardTitle className="text-lg leading-tight truncate min-w-0">
                {company.name}
              </CardTitle>
            </div>
            {company.batch && (
              <Badge variant="secondary" className="flex-shrink-0">
                {formatBatch(company.batch)}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3">
          {company.one_liner && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {company.one_liner}
            </p>
          )}

          {company.all_locations && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{company.all_locations}</span>
            </div>
          )}

          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {overflowLabel && (
                <Badge variant="outline" className="text-xs">
                  {overflowLabel}
                </Badge>
              )}
            </div>
          )}

          {company.is_hiring && (
            <div className="pt-2 border-t">
              <Badge className="bg-green-500 hover:bg-green-600">
                Hiring
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
