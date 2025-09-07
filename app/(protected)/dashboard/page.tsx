// app/(protected)/dashboard/page.tsx
"use client";
import HomeFeed from "@/components/HomeFeed";
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-pink-100">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Header - Mobile Optimized */}
          <div className="text-center mb-6 sm:mb-8 animate-fade-in px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2 sm:mb-3">
              Welcome to MyZenTribe
            </h1>
            <p className="text-base sm:text-lg text-gray-600">
              Meditation • Community • Presence
            </p>
            <div className="mt-3 sm:mt-4 flex justify-center gap-2 flex-wrap">
              <span className="px-2 sm:px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs sm:text-sm">
                ✨ Connect
              </span>
              <span className="px-2 sm:px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs sm:text-sm">
                💜 Share
              </span>
              <span className="px-2 sm:px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm">
                🤝 Support
              </span>
            </div>
          </div>
          {/* Main HomeFeed with integrated features */}
          <HomeFeed />
        </div>
      </div>
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
