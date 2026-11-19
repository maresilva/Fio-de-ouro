import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Variáveis de ambiente configuráveis na Vercel ou no arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
);

/**
 * Cliente oficial do Supabase para o ERP Fio de Ouro.
 * Utiliza exclusivamente a anon key pública no frontend.
 * Chaves administrativas (service_role) NUNCA devem ser inseridas aqui.
 */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey && isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'fio_de_ouro_auth_token',
      },
    })
  : null;

export interface SupabaseConfigStatus {
  configured: boolean;
  missingKeys: string[];
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  return {
    configured: isSupabaseConfigured,
    missingKeys: missing,
  };
}
