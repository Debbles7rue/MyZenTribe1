// components/PostCard.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PostCardProps {
  post?: any;
  onChanged?: () => void;
  currentUserId?: string;
}

export default function PostCard({ post, onChanged, currentUserId }: PostCardProps) {
  const router = useRouter();

  useEffect(() => {
    router.push('/profile');
  }, [router]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
      <h3 className="text-lg font-semibold mb-3">📸 View Posts in Photos Section</h3>
      <p className="text-gray-600 text-sm">
        Posts have moved to the Photos & Memories section for a better experience.
      </p>
      <p className="text-xs text-gray-500 mt-3">Redirecting...</p>
      <div className="mt-3">
        <span className="inline-block animate-spin">⏳</span>
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
