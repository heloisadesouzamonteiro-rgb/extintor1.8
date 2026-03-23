import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
let client = null;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export function getSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }

  return client;
}

export const supabase = isSupabaseConfigured ? getSupabase() : null;

export async function invokeSupabaseFunction(functionName, { body, headers, ...options } = {}) {
  const client = getSupabase();

  let {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.access_token) {
    const { data: refreshedData } = await client.auth.refreshSession();
    session = refreshedData.session ?? null;
  }

  if (!session?.access_token) {
    await client.auth.signOut();
    throw new Error("Sessao expirada. Faca login novamente para continuar.");
  }

  return client.functions.invoke(functionName, {
    ...options,
    body,
    headers: {
      ...(headers ?? {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });
}
