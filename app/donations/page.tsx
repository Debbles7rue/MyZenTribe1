// app/donations/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export default function DonationsPage() {
  const [selectedAmount, setSelectedAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Replace these with your actual Stripe Payment Links
  // You can set these in your .env.local file or directly here
  const donationLinks = {
    "5": process.env.NEXT_PUBLIC_STRIPE_DONATE_5 || "YOUR_STRIPE_$5_LINK_HERE",
    "10": process.env.NEXT_PUBLIC_STRIPE_DONATE_10 || "YOUR_STRIPE_$10_LINK_HERE",
    "25": process.env.NEXT_PUBLIC_STRIPE_DONATE_25 || "YOUR_STRIPE_$25_LINK_HERE",
    "50": process.env.NEXT_PUBLIC_STRIPE_DONATE_50 || "YOUR_STRIPE_$50_LINK_HERE",
    "100": process.env.NEXT_PUBLIC_STRIPE_DONATE_100 || "YOUR_STRIPE_$100_LINK_HERE",
    "custom": process.env.NEXT_PUBLIC_STRIPE_DONATE_CUSTOM || "YOUR_STRIPE_CUSTOM_AMOUNT_LINK_HERE"
  };

  const handleDonate = () => {
    if (!selectedAmount) {
      alert("Please select a donation amount");
      return;
    }

    const stripeLink = donationLinks[selectedAmount];
    
    // Check if we have a valid Stripe link
    if (!stripeLink || stripeLink.includes("YOUR_STRIPE")) {
      alert("Donation link not configured yet. Please contact support.");
      return;
    }

    // Make sure it's actually a Stripe link for security
    if (!stripeLink.includes("stripe.com")) {
      alert("Invalid payment link detected. Please contact support.");
      return;
    }

    setIsProcessing(true);
    // Open Stripe Checkout in same tab (you can use _blank for new tab)
    window.location.href = stripeLink;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent mb-3">
            Support MyZenTribe
          </h1>
          <p className="text-gray-600 text-lg">
            Your generosity helps us build a safer, more connected community for everyone.
          </p>
        </div>

        {/* Main Donation Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden">
          {/* Mission Section */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-8">
            <h2 className="text-2xl font-semibold mb-3">Our Mission</h2>
            <p className="text-purple-100 leading-relaxed">
              We're building a mindful community platform that prioritizes mental wellness, 
              authentic connections, and personal growth. Every donation directly supports 
              our server costs, safety features, and community programs.
            </p>
          </div>

          {/* Donation Options */}
          <div className="p-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Choose Your Donation Amount
            </h3>
            
            {/* Amount Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { value: "5", label: "$5" },
                { value: "10", label: "$10" },
                { value: "25", label: "$25" },
                { value: "50", label: "$50" },
                { value: "100", label: "$100" },
                { value: "custom", label: "Custom" }
              ].map((amount) => (
                <button
                  key={amount.value}
                  onClick={() => setSelectedAmount(amount.value)}
                  className={`
                    py-4 px-6 rounded-xl font-semibold transition-all transform
                    ${selectedAmount === amount.value
                      ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white scale-105 shadow-lg"
                      : "bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-700 hover:scale-102"
                    }
                  `}
                >
                  {amount.label}
                </button>
              ))}
            </div>

            {/* What Your Donation Does */}
            {selectedAmount && (
              <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                <p className="text-sm text-purple-800 font-medium">
                  {selectedAmount === "5" && "☕ Covers our daily server costs"}
                  {selectedAmount === "10" && "🛡️ Helps maintain safety features for one week"}
                  {selectedAmount === "25" && "🌱 Supports community wellness programs"}
                  {selectedAmount === "50" && "🚀 Funds new feature development"}
                  {selectedAmount === "100" && "💜 Makes you a founding supporter!"}
                  {selectedAmount === "custom" && "✨ Every amount makes a difference!"}
                </p>
              </div>
            )}

            {/* Donate Button */}
            <button
              onClick={handleDonate}
              disabled={!selectedAmount || isProcessing}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all
                ${!selectedAmount
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : isProcessing
                  ? "bg-purple-300 text-white cursor-wait"
                  : "bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700 transform hover:scale-[1.02] shadow-lg"
                }
              `}
            >
              {isProcessing ? "Redirecting to Stripe..." : selectedAmount ? `Donate ${selectedAmount === "custom" ? "Custom Amount" : "$" + selectedAmount}` : "Select an Amount"}
            </button>

            {/* Security Badge */}
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span>Secure payment powered by Stripe</span>
            </div>
          </div>

          {/* Impact Section */}
          <div className="bg-gradient-to-br from-purple-50 to-white p-8 border-t border-purple-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Impact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">🛡️</div>
                <div className="text-3xl font-bold text-purple-600">24/7</div>
                <div className="text-sm text-gray-600">Safety Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🧘</div>
                <div className="text-3xl font-bold text-purple-600">1,000+</div>
                <div className="text-sm text-gray-600">Meditation Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">💜</div>
                <div className="text-3xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-gray-600">Goes to Platform</div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Ways to Help */}
        <div className="mt-8 text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Other Ways to Support</h3>
          <p className="text-gray-600 mb-4">
            Not able to donate? You can still help by sharing MyZenTribe with friends, 
            contributing to discussions, or volunteering as a community moderator.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/communities" className="text-purple-600 hover:text-purple-700 font-medium">
              Join Communities →
            </Link>
            <Link href="/karma" className="text-purple-600 hover:text-purple-700 font-medium">
              Visit Karma Corner →
            </Link>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
