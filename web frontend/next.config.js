/** @type {import('next').NextConfig} */
const nextConfig = {
  // إزالة console.log في Production - يحتفظ بـ error و warn
  compiler: {
    removeConsole: {
      exclude: ['error', 'warn'],
    },
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: process.env.NEXT_PUBLIC_SERVER_HOSTNAME || 'localhost',
        port: process.env.NEXT_PUBLIC_SERVER_PORT || '4000',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  // تكوين إعادة التوجيه للوصول إلى موارد الباك إند
  async rewrites() {
    const serverUrl = process.env.NEXT_PUBLIC_SERVER_BASE_URL || 'http://localhost:4000';
    return [
      // إعادة توجيه طلبات API إلى الباك إند
      {
        source: '/api/:path*',
        destination: `${serverUrl}/api/:path*`,
      },
      // إعادة توجيه طلبات الصور إلى الباك إند
      {
        source: '/backend-uploads/:path*',
        destination: `${serverUrl}/uploads/:path*`,
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "127.0.0.1:3000"],
    },
  },
  // Turbopack config (فارغ للتوافق مع Next.js 16)
  turbopack: {},
  // Standalone output for Docker
  output: 'standalone',
};

module.exports = nextConfig;
