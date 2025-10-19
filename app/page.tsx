// app/page.tsx - REPLACE ENTIRE FILE
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // If already logged in, go to their home feed
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.replace("/");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
        <div className="text-lg text-purple-600">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold">
              <span className="text-gray-700">My</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Zen</span>
              <span className="text-gray-900">Tribe</span>
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl text-gray-700 mb-4 font-light">
            Meditation • Community • Presence
          </p>
          
          {/* Description */}
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            A sanctuary free from political discourse and divisive content. 
            Share joy, gratitude, and uplifting moments with your tribe. 🕊️
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              href="/signup"
              className="w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
            >
              Sign Up Free 🚀
            </Link>
            
            <Link 
              href="/signin"
              className="w-full sm:w-auto px-12 py-4 bg-white text-purple-600 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-purple-200"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-5xl mb-4">🧘</div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Guided Meditation</h3>
            <p className="text-gray-600">
              Access guided meditations, breathing exercises, and mindfulness practices tailored to your journey.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Supportive Community</h3>
            <p className="text-gray-600">
              Connect with like-minded souls on a journey toward peace, presence, and positive living.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-800 mb-3">Wellness Calendar</h3>
            <p className="text-gray-600">
              Schedule meditation sessions, join community events, and track your mindfulness journey.
            </p>
          </div>
        </div>

        {/* Values Section */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-xl mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-8">
            Our Commitment to You
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <span className="text-3xl">🕊️</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Politics-Free Zone</h4>
                <p className="text-gray-600 text-sm">A peaceful sanctuary away from divisive discourse</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-3xl">✨</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Positive Focus</h4>
                <p className="text-gray-600 text-sm">Celebrate good news and uplifting experiences</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-3xl">🛡️</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Safe Space</h4>
                <p className="text-gray-600 text-sm">Supportive environment with strong community guidelines</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="text-3xl">💜</span>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Mindful Connection</h4>
                <p className="text-gray-600 text-sm">Build authentic relationships centered on growth</p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands finding peace and community
          </p>
          <Link 
            href="/signup"
            className="inline-block px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
          >
            Get Started - It's Free! 🌟
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-purple-200 bg-white/50 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
            <p>© 2025 MyZenTribe. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/legal/terms" className="hover:text-purple-600 transition-colors">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-purple-600 transition-colors">
                Privacy
              </Link>
              <Link href="/contact" className="hover:text-purple-600 transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
