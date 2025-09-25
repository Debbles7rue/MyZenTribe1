// app/(protected)/calendar/components/PullToRefresh.tsx

import React from 'react';

interface PullToRefreshProps {
  isRefreshing: boolean;
  isMobile: boolean;
}

export default function PullToRefresh({ isRefreshing, isMobile }: PullToRefreshProps) {
  if (!isMobile || !isRefreshing) return null;
  
  return (
    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 mt-2 z-50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  );
}
