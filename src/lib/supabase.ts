import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Standard client for client-side interactions (respects RLS)
function requireClientConfig(url: string, key: string, clientName: string) {
    if (!url || !key) {
        throw new Error(`${clientName} Supabase configuration is missing.`);
    }
    return createClient(url, key);
}

export const supabase = requireClientConfig(supabaseUrl, supabaseAnonKey, "Public");
