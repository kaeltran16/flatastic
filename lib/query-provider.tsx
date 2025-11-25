'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type PropsWithChildren } from 'react';

export default function QueryProvider({ children }: PropsWithChildren) {
  // create the client once per browser session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Optimized for PWA performance
            staleTime: 5 * 60 * 1000, // 5 minutes - data doesn't change frequently
            gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
            refetchOnWindowFocus: false, // Reduce unnecessary refetches
            refetchOnMount: true, // Still refetch on component mount if stale
            retry: 1, // Reduce retries for faster error handling
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="left" />
      )}
    </QueryClientProvider>
  );
}
