import type { NextConfig } from "next";

// Las fotos subidas viven en Supabase Storage (bucket público): se permite ese host en next/image.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : [],
  },
  // La ruta principal de la app es /home.
  async redirects() {
    return [
      { source: "/", destination: "/home", permanent: true },
      { source: "/propiedades", destination: "/properties", permanent: true },
      { source: "/propiedades/:code", destination: "/properties/:code", permanent: true },
    ];
  },
};

export default nextConfig;
