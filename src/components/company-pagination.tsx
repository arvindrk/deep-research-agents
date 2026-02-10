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

interface CompanyPaginationProps {
  currentPage: number;
  totalPages: number;
}

export function CompanyPagination({
  currentPage,
  totalPages,
}: CompanyPaginationProps) {
  const generatePageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    pages.push(totalPages);

    return pages;
  };

  const pages = generatePageNumbers();

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
