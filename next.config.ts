const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  sw: 'sw.js', // Your custom service worker
  customWorkerDir: 'worker', // Directory containing your custom SW
  reloadOnOnline: true,
  swcMinify: true,
  fallbacks: {
    document: '/offline', // Optional: create an offline page
  },
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
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co ws://localhost:* http://localhost:* https://storage.googleapis.com https://api.github.com",
              // Allow service workers and web workers
              "worker-src 'self' blob: data:",
              "child-src 'self' blob: data:",
              // Scripts for Next.js and Workbox
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://storage.googleapis.com",
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
};

module.exports = withPWA(nextConfig);
