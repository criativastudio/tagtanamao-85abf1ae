// Runtime client wrapper.
//
// Why this exists:
// In some hosting/build setups, Vite env injection can be missing, causing
// the auto-generated client to crash at import-time with:
//   "Uncaught Error: supabaseUrl is required."
//
// We keep the same export shape (`export const supabase = ...`) so the rest
// of the app works unchanged.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Prefer Vite-provided env vars, but fall back to known project values.
// NOTE: The key used here is a publishable (anon) key, safe to ship to the client.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://fgjgofbstljjuiwbnmba.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnamdvZmJzdGxqanVpd2JubWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODI2NzksImV4cCI6MjA4NDE1ODY3OX0.VVf1Ox0AcNEe6VJI0_4sjsq5jVaXC0djVs1jyzyaXwA";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
