// app/(protected)/donate/page.tsx
"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe (you'll need to add your publishable key to .env.local)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

export default function DonatePage() {
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const predefinedAmounts = [5, 10, 25, 50, 100];

  const handleDonation = async () => {
    setIsProcessing(true);
    setMessage("");

    const donationAmount = customAmount ? parseFloat(customAmount) : amount;
    
    if (donationAmount < 1) {
      setMessage("Please enter an amount of at least $1");
      setIsProcessing(false);
      return;
    }

    try {
      // Create checkout session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: donationAmount,
        }),
      });

      const { sessionId } = await response.json();

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (stripe) {
        const { error } = await stripe.redirectToCheckout({ sessionId });
        if (error) {
          setMessage(error.message || "Something went wrong");
        }
      }
    } catch (error) {
      setMessage("Unable to process donation. Please try again.");
      console.error("Donation error:", error);
    } finally {
      setIsProcessing(false);
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
              {predefinedAmounts.map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setAmount(preset);
                    setCustomAmount("");
                  }}
                  className={`py-3 px-4 rounded-lg font-medium transition-all ${
                    amount === preset && !customAmount
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md"
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or enter a custom amount:
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                $
              </span>
              <input
                type="number"
                min="1"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {message}
            </div>
          )}

          {/* Donate Button */}
          <button
            onClick={handleDonation}
            disabled={isProcessing}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              `Donate ${customAmount ? `$${customAmount}` : `$${amount}`}`
            )}
          </button>

          {/* Security Note */}
          <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure payment powered by Stripe
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
