/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['cdn.pluggy.ai'],
  },
  env: {
    PLUGGY_CLIENT_ID: process.env.PLUGGY_CLIENT_ID,
    PLUGGY_CLIENT_SECRET: process.env.PLUGGY_CLIENT_SECRET,
  },
}

module.exports = nextConfig