import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    // Variables de prueba: nunca la BD ni el Supabase reales. Vacía = no definida (ver src/lib/env.ts).
    env: {
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/cosave_test",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      SUPABASE_JWT_SECRET: "secreto-solo-para-pruebas",
    },
  },
});
