/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    domains: [
      'ik.imagekit.io'
    ],
  },
};

module.exports = nextConfig;