/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
  },
  images: {
    domains: ['yeblzgxbyytpcqiveojw.supabase.co'], // Replace with your actual Supabase storage URL if needed
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/auth/login', // Redirect to the login page initially
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
