// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import HomeFeed from "@/components/HomeFeed";
import SOSFloatingButton from "@/components/SOSFloatingButton";

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUserId(user.id);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4ECFF] to-[#FFF9F5]">
      {/* Header Section */}
      <div className="text-center py-12 px-4">
        <h1 className="text-4xl font-bold text-purple-600 mb-2">
          Welcome to MyZenTribe
        </h1>
        <p className="text-gray-600 text-lg">
          Connect • Share • Support
        </p>
      </div>

      {/* Main Content Area */}
      <div className="container-app max-w-2xl mx-auto px-4">
        {/* Post Feed - Let HomeFeed handle its own card styling */}
        <HomeFeed />

        {/* Inspirational Quote (Optional) */}
        <div className="text-center py-8 px-4">
          <p className="text-gray-500 italic text-sm">
            "Where intention goes, energy flows"
          </p>
        </div>
      </div>

      {/* Small SOS Button - Fixed Position with Red Styling */}
      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="/safety"
          className="block w-14 h-14 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center font-bold text-sm transition-all hover:scale-110 no-underline"
          style={{ backgroundColor: '#ef4444', color: 'white' }}
          aria-label="Emergency SOS"
        >
          SOS
        </a>
      </div>
    </div>
  );
}
