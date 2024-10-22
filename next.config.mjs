import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Convert `import.meta.url` to `__dirname` equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '.env.local') });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
