import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'x-client-info': 'pluggy-quickstart',
      },
    },
    // Add timeout configuration for fetch requests
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const fetchPromise = fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      fetchPromise.finally(() => clearTimeout(timeoutId));
      
      return fetchPromise;
    },
  }
);

// Função helper para obter cliente admin
export const getSupabaseAdmin = () => supabaseAdmin;