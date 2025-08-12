// lib/supabase/client.ts
// Thin wrapper so imports like "@/lib/supabase/client" work.
import { supabase } from "../supabaseClient";

export { supabase };      // named export
export default supabase;  // default export (in case some files use default)
