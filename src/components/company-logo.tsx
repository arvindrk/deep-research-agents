'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Stands in when a company's own logo URL fails to load. */
const FALLBACK_LOGO = '/yc.png';

interface CompanyLogoProps {
  src: string;
  name: string;
  size: number;
}

/**
 * The one client leaf in the company surfaces: it owns image load-failure
 * state, so cards and detail headers can stay server-rendered around it.
 */
export function CompanyLogo({ src, name, size }: CompanyLogoProps) {
  const [failed, setFailed] = useState(false);

  return (
    <Image
      src={failed ? FALLBACK_LOGO : src}
      alt={`${name} logo`}
      width={size}
      height={size}
      className={cn('object-contain', failed && 'grayscale opacity-60')}
      onError={() => setFailed(true)}
    />
  );
}
