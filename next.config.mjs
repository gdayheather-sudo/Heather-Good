/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      // Supabase storage signed URLs
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
};

export default nextConfig;
