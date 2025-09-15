// app/profile/page.tsx - SIMPLIFIED VERSION FOR TESTING
"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUserId(data.user?.id || null);
      } catch (err: any) {
        console.error("Auth error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <h1>Not logged in</h1>
        <a href="/login">Go to login</a>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Profile Page</h1>
      <p>User ID: {userId}</p>
      <p>If you see this, the basic page is working!</p>
    </div>
  );
}
