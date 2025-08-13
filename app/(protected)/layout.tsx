import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClientServer } from "@/lib/supabase-server";
import ProtectedNav from "@/components/ProtectedNav";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = createClientServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/"); // hide everything unless logged in
  return (
    <div className="min-h-screen">
      <ProtectedNav />
      {children}
    </div>
  );
}
