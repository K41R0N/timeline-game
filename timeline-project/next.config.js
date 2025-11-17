/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@timeline/game-core'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@timeline/game-core': require('path').resolve(__dirname, '../game-core'),
    };
    return config;
  },
}

module.exports = nextConfig 