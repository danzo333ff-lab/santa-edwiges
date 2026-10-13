"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/env";

let browserClient: SupabaseClient | undefined;

export function createClient() {
  if (browserClient) return browserClient;

  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("O Supabase ainda não foi configurado neste ambiente.");
  }

  browserClient = createBrowserClient(config.url, config.key);
  return browserClient;
}
