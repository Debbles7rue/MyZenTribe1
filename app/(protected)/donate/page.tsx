// app/(protected)/donate/page.tsx
"use client";

import { useState } from "react";

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(10);

  // Your actual Stripe Payment Links
  const stripeLinks = {
    5: "https://buy.stripe.com/cNi5kCgLfeQA2CseDI6wE06",
    10: "https://buy.stripe.com/eVq28q52xfUE2Cs5386wE01",
    25: "https://buy.stripe.com/aFaeVceD74bW1yoeDI6wE02",
    50: "https://buy.stripe.com/6oUaEWcuZbEo0uk67c6wE03",
    100: "https://buy.stripe.com/9B614m1QlgYIcd2dzE6wE04"
  };

  const predefinedAmounts = [5, 10, 25, 50, 100];

  const handleDonation = () => {
    const link = stripeLinks[selectedAmount as keyof typeof stripeLinks];
    
    if (link && link.includes("stripe.com")) {
      window.location.href = link;
    } else {
      alert("Please select a valid donation amount");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-purple-50 to-pink-100">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Support MyZenTribe
          </h1>
          <p className="text-base sm:text-lg text-gray-700 max-w-2xl mx-auto">
            Your generosity helps us maintain a safe, ad-free space for our community to connect, heal, and grow together.
          </p>
        </div>

        {/* Donation Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-3">
              💝 Make a Donation
            </h2>
            <p className="text-gray-600">
              Every contribution, no matter the size, makes a difference.
            </p>
          </div>

          {/* Predefined Amounts */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select an amount:
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {predefinedAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setSelectedAmount(amount)}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    selectedAmount === amount
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300"
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>
          </div>

          {/* Donate Button */}
          <button
            onClick={handleDonation}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Donate ${selectedAmount}
          </button>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure payment powered by Stripe
            </div>
          </div>
        </div>

        {/* Why Donate Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            Why Your Support Matters
          </h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3 flex-shrink-0">🌱</span>
              <div>
                <h4 className="font-medium text-gray-800">Platform Development</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Help us build new features and maintain a premium experience for our community.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3 flex-shrink-0">🛡️</span>
              <div>
                <h4 className="font-medium text-gray-800">Privacy & Safety</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Your donations help us maintain robust security and privacy features.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3 flex-shrink-0">💜</span>
              <div>
                <h4 className="font-medium text-gray-800">Community Growth</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Support new features and improvements based on community feedback.
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3 flex-shrink-0">🧘</span>
              <div>
                <h4 className="font-medium text-gray-800">Meditation Resources</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Fund new guided meditations and wellness content for the community.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <a
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 bg-white border-2 border-purple-200 text-purple-700 rounded-xl font-medium hover:bg-purple-50 hover:border-purple-300 transition-all shadow-sm"
          >
            ← Back to Dashboard
          </a>
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
