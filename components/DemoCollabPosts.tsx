// components/DemoCollabPosts.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoCollabPosts() {
  const router = useRouter();

  useEffect(() => {
    router.push('/profile');
  }, [router]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#EDE7F6] to-[#F6EFE5] flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
        <h2 className="text-2xl font-semibold mb-4">📸 Redirecting to Photos...</h2>
        <p className="text-gray-600 mb-4">Please use the Photos & Memories section to upload and manage photos.</p>
        <div className="animate-spin inline-block">⏳</div>
      </div>
    </div>
  );
}
