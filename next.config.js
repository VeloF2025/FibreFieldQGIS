/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Image optimization - updated for new Firebase project
  images: {
    domains: [
      'firebasestorage.googleapis.com',
      'fibrefield.firebasestorage.app'
    ]
  }
};

module.exports = nextConfig;