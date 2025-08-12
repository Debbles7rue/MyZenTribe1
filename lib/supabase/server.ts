import { supabase } from "../supabaseClient";

export function createServerClient() {
  return supabase;
}

export { supabase as serverSupabase };
export default supabase;
