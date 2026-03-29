/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.csb.app"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

module.exports = nextConfig;
