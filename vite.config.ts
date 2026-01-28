import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load *all* env vars (not only VITE_) so we can safely fallback when VITE_* is missing
  const env = loadEnv(mode, process.cwd(), "");

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  // Prefer the publishable/anon key used by the frontend
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY;

  return {
    // Ensure client-side code always gets a defined URL/key at build time.
    // This prevents: "Uncaught Error: supabaseUrl is required."
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl ?? ""),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey ?? ""),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: [
        // Force all app imports to use a resilient runtime client wrapper.
        // This prevents hard-crashes when Vite env injection is missing/misconfigured.
        {
          find: "@/integrations/supabase/client",
          replacement: path.resolve(__dirname, "./src/integrations/supabase/runtime-client.ts"),
        },
        {
          find: "@",
          replacement: path.resolve(__dirname, "./src"),
        },
      ],
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
    },
    preview: {
      host: "::",
      allowedHosts: ["tagtanamao.com.br"],
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
  };
});
