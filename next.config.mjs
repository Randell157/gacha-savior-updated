/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Genshin pages moved under /genshin when the games hub was added.
  // Keep the old addresses working for bookmarks and links.
  async redirects() {
    return [
      { source: "/characters", destination: "/genshin/characters", permanent: true },
      { source: "/characters/:key", destination: "/genshin/characters/:key", permanent: true },
      { source: "/weapons", destination: "/genshin/weapons", permanent: true },
      { source: "/artifacts", destination: "/genshin/artifacts", permanent: true },
    ];
  },
  // Basic browser protections for every page. Vercel adds HTTPS-only (HSTS)
  // itself. No full Content-Security-Policy yet: it would need testing against
  // Firebase, Next.js and the build card's image export.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Other sites can't show the site inside a frame (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
