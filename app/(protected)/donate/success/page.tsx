// app/(protected)/donate/success/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

export default function DonationSuccessPage() {
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti animation on mount
    setShowConfetti(true);
    
    // Only trigger confetti if the library is available
    if (typeof window !== "undefined" && confetti) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#9333ea", "#ec4899", "#8b5cf6", "#f472b6"],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#9333ea", "#ec4899", "#8b5cf6", "#f472b6"],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-pink-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
          {/* Success Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center animate-bounce">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3">
            Thank You! 💜
          </h1>
          
          {amount && (
            <p className="text-lg text-gray-600 mb-4">
              Your generous donation of <span className="font-semibold text-purple-600">${amount}</span> has been received.
            </p>
          )}

          <p className="text-gray-600 mb-8">
            Your support means the world to us and helps keep MyZenTribe a safe, nurturing space for our entire community.
          </p>

          {/* Gratitude Message */}
          <div className="bg-purple-50 rounded-lg p-4 mb-8">
            <p className="text-purple-700 text-sm italic">
              "No act of kindness, no matter how small, is ever wasted."
            </p>
            <p className="text-purple-600 text-xs mt-2">- Aesop</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <a
              href="/dashboard"
              className="block w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              Return to Dashboard
            </a>
            <a
              href="/community"
              className="block w-full py-3 bg-white border-2 border-purple-200 text-purple-700 rounded-lg font-medium hover:bg-purple-50 hover:border-purple-300 transition-all"
            >
              Join the Community
            </a>
          </div>

          {/* Share Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-3">
              Help spread the word about MyZenTribe
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: "MyZenTribe",
                      text: "I just supported MyZenTribe - a beautiful meditation and wellness community!",
                      url: window.location.origin,
                    });
                  }
                }}
                className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                title="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Receipt Note */}
        <p className="text-center text-sm text-gray-600 mt-4">
          A receipt has been sent to your email address.
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}
