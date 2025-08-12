// inside your Home component (client)
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const [hasSession, setHasSession] = useState(false);
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => setHasSession(!!data.session));
}, []);

// In the JSX where you show buttons:
{hasSession ? (
  <a href="/calendar" className="btn btn-brand">Go to calendar</a>
) : (
  <a href="/login" className="btn btn-brand">Get started</a>
)}
