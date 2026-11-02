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
};

export default nextConfig;
