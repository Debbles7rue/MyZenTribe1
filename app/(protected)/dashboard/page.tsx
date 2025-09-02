"use client";

import HomeFeed from "@/components/HomeFeed";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="container-app py-8">
        <div className="max-w-4xl mx-auto">
          {/* Simple Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Welcome to MyZenTribe
            </h1>
            <p className="text-gray-600 mt-2">
              Connect • Share • Support
            </p>
          </div>

          {/* Your existing HomeFeed with the integrated SOS feature */}
          <HomeFeed />
        </div>
      </div>
    </div>
  );
}
