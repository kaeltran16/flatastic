import { withSentryConfig } from '@sentry/nextjs';
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  sw: 'sw.js', // Generated service worker filename
  customWorkerDir: 'worker', // Directory containing your custom SW code (worker/index.js)
  reloadOnOnline: true,
  swcMinify: true,
  // fallbacks: {
  //   document: '/offline', // Optional: create an offline page
  // },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // FIXED: Explicitly set connect-src to allow Supabase
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:* https://storage.googleapis.com https://api.github.com https://*.sentry.io",
              // Allow service workers and web workers
              "worker-src 'self' blob: data:",
              "child-src 'self' blob: data:",
              // Scripts for Next.js and Workbox
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://storage.googleapis.com https://va.vercel-scripts.com",
              // Styles
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images - allow Supabase storage
              "img-src 'self' blob: data: https: http: https://*.supabase.co",
              // Fonts
              "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
              // Media for audio/video if needed
              "media-src 'self' blob: data: https://*.supabase.co",
              // Manifest
              "manifest-src 'self'",
              // Prevent other inclusions
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              // Add upgrade-insecure-requests in production
              ...(process.env.NODE_ENV === 'production'
                ? ['upgrade-insecure-requests']
                : []),
            ].join('; '),
          },
          // Security headers
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        // Service Worker specific headers
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://storage.googleapis.com",
              "script-src 'self' 'unsafe-eval' https://storage.googleapis.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
      {
        // PWA manifest
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Enable experimental features if needed
  experimental: {
    // Add any experimental features you need
  },

  images: {
    remotePatterns: [
      // Google/Gmail avatars
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh5.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh6.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.googleapis.com',
      },
    ],
  },
};

module.exports = withPWA(nextConfig);

export default withSentryConfig(undefined, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'personal-mys',

  project: 'flatastic',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Uncomment to route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  // tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});
