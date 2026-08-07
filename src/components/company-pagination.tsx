'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { getPageSlots } from '@/lib/pagination-model';

interface CompanyPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function CompanyPagination({
  currentPage,
  totalPages,
}: CompanyPaginationProps) {
  const pages = getPageSlots(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          {currentPage === 1 ? (
            <PaginationPrevious
              className="pointer-events-none opacity-50"
              aria-disabled="true"
            />
          ) : (
            <Link href={`/?page=${currentPage - 1}`} passHref legacyBehavior>
              <PaginationPrevious />
            </Link>
          )}
        </PaginationItem>

        {pages.map((page, index) =>
          page === 'ellipsis' ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <Link href={`/?page=${page}`} passHref legacyBehavior>
                <PaginationLink isActive={currentPage === page}>
                  {page}
                </PaginationLink>
              </Link>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          {currentPage === totalPages ? (
            <PaginationNext
              className="pointer-events-none opacity-50"
              aria-disabled="true"
            />
          ) : (
            <Link href={`/?page=${currentPage + 1}`} passHref legacyBehavior>
              <PaginationNext />
            </Link>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
