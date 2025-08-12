"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Get current user from Supabase
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login"); // redirect if not logged in
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-4">Profile</h1>
        <p className="mb-6">Signed in as <strong>{user.email}</strong></p>
        <button
          onClick={handleLogout}
          className="btn btn-neutral w-full"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
