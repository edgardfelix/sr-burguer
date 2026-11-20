import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Hosts do Firebase usados apenas pelo painel administrativo (Realtime Database + Auth com custom token).
 * O RTDB pode cair para long polling (JSONP), por isso aparece também em script-src e frame-src.
 */
const firebaseHttp = ['https://*.firebaseio.com', 'https://*.firebasedatabase.app'];
const firebaseWs = ['wss://*.firebaseio.com', 'wss://*.firebasedatabase.app'];
const googleAuth = ['https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com'];

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} ${firebaseHttp.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "font-src 'self' data:",
  `connect-src 'self' ${[...firebaseHttp, ...firebaseWs, ...googleAuth].join(' ')}${isDev ? ' ws://localhost:* ws://127.0.0.1:*' : ''}`,
  `frame-src ${firebaseHttp.join(' ')}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const staticAssetCache = 'public, max-age=604800, stale-while-revalidate=86400';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compiler: {
    styledComponents: true,
  },
  serverExternalPackages: ['express', 'firebase-admin'],
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [70, 82],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200],
    imageSizes: [48, 64, 96, 128, 160, 192, 256, 384],
    localPatterns: [{ pathname: '/images/**', search: '' }],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/images/:path*', headers: [{ key: 'Cache-Control', value: staticAssetCache }] },
      { source: '/video/:path*', headers: [{ key: 'Cache-Control', value: staticAssetCache }] },
    ];
  },
};

export default nextConfig;
