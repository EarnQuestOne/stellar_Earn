/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      // This tells Turbopack to look one or two levels up if needed
      root: "../../",
    },
  },
};

export default nextConfig;
