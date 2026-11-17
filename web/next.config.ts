import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Caché clásico (ISR): `fetch(..., { next: { revalidate: 3600 } })`, como define el blueprint (8.3).
  // Con Cache Components habría que envolver cada lectura de la API en Suspense o `use cache`.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
