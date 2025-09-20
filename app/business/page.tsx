// app/business/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the actual business dashboard
    router.replace('/business/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Loading business dashboard...</p>
      </div>
    </div>
  );
}
