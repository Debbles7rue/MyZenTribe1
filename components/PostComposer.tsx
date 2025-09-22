// components/PostComposer.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface PostComposerProps {
  onPostCreated?: () => void;
  className?: string;
}

export default function PostComposer({ onPostCreated, className = "" }: PostComposerProps) {
  const router = useRouter();

  useEffect(() => {
    router.push('/profile');
  }, [router]);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center ${className}`}>
      <h3 className="text-xl font-semibold mb-4">📸 Create Posts in Photos Section</h3>
      <p className="text-gray-600 mb-4">
        We've moved! Please use the Photos & Memories section on your profile to create and share posts.
      </p>
      <p className="text-sm text-gray-500">Redirecting you there now...</p>
      <div className="mt-4">
        <span className="inline-block animate-spin text-2xl">⏳</span>
      </div>
    </div>
  );
}
