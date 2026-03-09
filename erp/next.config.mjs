/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: './tsconfig.json',
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
