/** @type {import('next').NextConfig} */
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const nextConfig = {
  // Transpile the shared TS workspace package (§C.1 shared types seam).
  transpilePackages: ['@agrisense/shared'],
  async rewrites() {
    // Proxy /api/* to the Express backend so the browser never touches CORS (§C.1).
    return [{ source: '/api/:path*', destination: `${API}/api/:path*` }];
  },
};

module.exports = nextConfig;
