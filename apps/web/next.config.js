/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@bbb/shared"],
  experimental: {
    typedRoutes: false
  }
};

module.exports = nextConfig;
