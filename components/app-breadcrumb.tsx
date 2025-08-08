'use client';

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

export const routeConfig: Record<string, { label: string }> = {
  dashboard: { label: 'Dashboard' },
  chores: { label: 'Chores' },
  expenses: { label: 'Expenses' },
  payments: { label: 'Payments' },
  household: { label: 'Household' },
  profile: { label: 'Profile' },
  settings: { label: 'Settings' },
  notifications: { label: 'Notifications' },
  // Common action words
  create: { label: 'Create' },
  new: { label: 'New' },
  add: { label: 'Add' },
  edit: { label: 'Edit' },
  view: { label: 'View' },
  details: { label: 'Details' },
};
// Route configuration with icons and display names

interface BreadcrumbItem {
  label: string;
  href?: string;
}

// Don't show breadcrumbs on these paths
const NO_BREADCRUMB_PATHS = ['/auth/login', '/auth/signup', '/auth/callback'];

export function AppBreadcrumb() {
  const pathname = usePathname();

  // Don't render breadcrumbs on auth pages or root
  if (NO_BREADCRUMB_PATHS.includes(pathname) || pathname === '/') {
    return null;
  }

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard (Home)
    breadcrumbs.push({
      label: 'Dashboard',
      href: '/dashboard',
    });

    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Skip if it's the dashboard segment (already added)
      if (segment === 'dashboard') return;

      const config = routeConfig[segment.toLowerCase()];
      const isLast = index === segments.length - 1;

      // For IDs or unknown segments, try to make them more readable
      let label = segment;

      if (config) {
        label = config.label;
      } else {
        // Handle dynamic segments (IDs, etc.)
        if (
          segment.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          )
        ) {
          // UUID format - likely an ID
          label = 'Details';
        } else if (segment.match(/^\d+$/)) {
          // Numeric ID
          label = `#${segment}`;
        } else {
          // Capitalize and replace hyphens/underscores with spaces
          label = segment
            .replace(/[-_]/g, ' ')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }

      breadcrumbs.push({
        label,
        href: isLast ? undefined : currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs if we only have the dashboard
  if (breadcrumbs.length <= 1) {
    return null;
  }

  const renderBreadcrumbItem = (
    item: BreadcrumbItem,
    index: number,
    isLast: boolean
  ) => {
    if (isLast) {
      return (
        <BreadcrumbPage key={index} className="flex items-center">
          {item.label}
        </BreadcrumbPage>
      );
    }

    return (
      <BreadcrumbItem key={index}>
        <BreadcrumbLink asChild>
          <Link href={item.href!} className="flex items-center">
            {item.label}
          </Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  };

  const renderCollapsedBreadcrumbs = () => {
    if (breadcrumbs.length <= 4) {
      // Show all breadcrumbs if 4 or fewer
      return breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <Fragment key={index}>
            {renderBreadcrumbItem(item, index, isLast)}
            {!isLast && <BreadcrumbSeparator />}
          </Fragment>
        );
      });
    }

    // Show first, ellipsis, last two
    const first = breadcrumbs[0];
    const lastTwo = breadcrumbs.slice(-2);
    const middle = breadcrumbs.slice(1, -2);

    return (
      <>
        {renderBreadcrumbItem(first, 0, false)}
        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center">
              <BreadcrumbEllipsis className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {middle.map((item, index) => {
                return (
                  <DropdownMenuItem key={index} asChild>
                    <Link href={item.href!} className="flex items-center">
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {lastTwo.map((item, index) => {
          const actualIndex = breadcrumbs.length - 2 + index;
          const isLast = index === lastTwo.length - 1;
          return (
            <Fragment key={actualIndex}>
              {renderBreadcrumbItem(item, actualIndex, isLast)}
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </>
    );
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <Breadcrumb>
          <BreadcrumbList>{renderCollapsedBreadcrumbs()}</BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}
