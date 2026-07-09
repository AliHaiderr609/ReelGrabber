/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@reelgrabber/types',
    '@reelgrabber/validation',
    '@reelgrabber/config',
    '@reelgrabber/shared',
    '@reelgrabber/database',
  ],
};

export default nextConfig;
