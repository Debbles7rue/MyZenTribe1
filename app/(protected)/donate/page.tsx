// app/(protected)/donate/page.tsx
"use client";

import { useState } from "react";

export default function DonatePage() {
  const [selectedAmount, setSelectedAmount] = useState<number>(10);

  // You'll replace these with your actual Stripe Payment Links
  // Create these in your Stripe Dashboard under "Payment Links"
  const stripeLinks = {
    5: "https://buy.stripe.com/your-5-dollar-link",
    10: "https://buy.stripe.com/your-10-dollar-link",
    25: "https://buy.stripe.com/your-25-dollar-link",
    50: "https://buy.stripe.com/your-50-dollar-link",
    100: "https://buy.stripe.com/your-100-dollar-link",
    custom: "https://donate.stripe.com/your-custom-amount-link"
  };

  const predefinedAmounts = [5, 10, 25, 50, 100];

  const handleDonation = () => {
    // For now, we'll use a temporary message
    // Replace with actual Stripe payment links when you have them
    const link = stripeLinks[selectedAmount as keyof typeof stripeLinks] || stripeLinks.custom;
    
    // If you have Stripe payment links set up, uncomment this line:
    // window.location.href = link;
    
    // Temporary alert while you set up Stripe
    alert(`Donation feature coming soon! You selected $${selectedAmount}. \n\nTo set this up:\n1. Go to your Stripe Dashboard\n2. Create Payment Links for each amount\n3. Replace the URLs in this file`);
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

          {/* Custom Amount Note */}
          <div className="mb-6 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">
              💡 For custom amounts, click the donate button and enter your preferred amount on the payment page.
            </p>
          </div>

          {/* Donate Button */}
          <button
            onClick={handleDonation}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
          >
            Donate ${selectedAmount}
          </button>

          {/* Alternative Payment Methods */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Other ways to support:</p>
            <div className="space-y-2">
              <a
                href="https://paypal.me/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <span className="mr-2">💳</span> PayPal
              </a>
              <a
                href="https://venmo.com/yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-2 px-4 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
              >
                <span className="mr-2">📱</span> Venmo
              </a>
              <a
                href="https://cash.app/$yourusername"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <span className="mr-2">💵</span> Cash App
              </a>
            </div>
          </div>

          {/* Security Note */}
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure payment processing
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
                <h4 className="font-medium text-gray-800">Keep the Platform Free</h4>
                <p className="text-gray-600 text-sm mt-1">
                  Help us maintain a free, accessible space for everyone seeking connection and support.
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
