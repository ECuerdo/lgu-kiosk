import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

// Standard client for client-side interactions (respects RLS)
function requireClientConfig(url: string, key: string, clientName: string) {
    if (!url || !key) {
        throw new Error(`${clientName} Supabase configuration is missing.`);
    }
    return createClient(url, key);
}

export function getSupabase() {
    if (supabaseClient) {
        return supabaseClient;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    supabaseClient = requireClientConfig(supabaseUrl, supabaseAnonKey, "Public");
    return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        const client = getSupabase();
        const value = client[prop as keyof SupabaseClient];
        return typeof value === "function" ? value.bind(client) : value;
    },
});
