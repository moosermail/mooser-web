/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      allowedOrigins: ["app.mooser.email"],
    },
  },
};

module.exports = nextConfig;
