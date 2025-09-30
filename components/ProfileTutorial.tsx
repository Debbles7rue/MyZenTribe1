// components/ProfileTutorial.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_profile_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "👤",
    title: "Your Personal Space",
    description: "This is YOUR corner of MyZenTribe—where your story lives and grows.",
    highlight: true,
    features: [
      "All your posts appear here in one organized place",
      "See posts where friends have tagged you",
      "Share your journey with those who matter most",
      "Your profile, your vibe, your memories"
    ]
  },
  {
    step: 2,
    icon: "👥",
    title: "Find & Connect with Friends",
    description: "Building your tribe starts here! View your current connections and discover new friends.",
    highlight: false,
    features: [
      "See your complete friends list in one place",
      "Search for new friends to add to your tribe",
      "Connect with like-minded wellness enthusiasts",
      "Grow your supportive community"
    ],
    tip: "Your tribe grows stronger with every genuine connection you make!"
  },
  {
    step: 3,
    icon: "📔",
    title: "Gratitude Journal",
    description: "Transform your mindset, three grateful moments at a time.",
    highlight: false,
    features: [
      "Write just 3 things you're thankful for each day",
      "Rewire your brain for positive thinking",
      "Build a beautiful record of life's blessings",
      "Completely optional, but incredibly beneficial"
    ],
    specialNote: {
      icon: "🧠",
      title: "The Science of Gratitude",
      message: "Daily gratitude practice has been proven to reduce stress, improve sleep, and increase overall happiness. Click on the gratitude journal to learn more about how this simple habit can change your life."
    }
  },
  {
    step: 4,
    icon: "🕯️",
    title: "Meditation & Candles",
    description: "Create peaceful moments and spread light to those you love.",
    highlight: false,
    features: [
      "Access your personal meditation space",
      "Light a virtual candle for someone special ($0.99)",
      "Candles appear in the public meditation room",
      "Quick access to candles you've lit from your profile"
    ],
    tip: "Lighting a candle is a beautiful way to send positive energy to someone, whether near or far."
  },
  {
    step: 5,
    icon: "🎁",
    title: "Send Digital Gifts",
    description: "Brighten someone's day with a thoughtful surprise!",
    highlight: false,
    features: [
      "Send digital gifts to friends for just $0.99",
      "Perfect for birthdays, celebrations, or just because",
      "Let friends know you're thinking of them",
      "Spread joy with a simple, meaningful gesture"
    ],
    finalMessage: "Sometimes the smallest gestures create the biggest smiles. 💜"
  },
  {
    step: 6,
    icon: "📸",
    title: "Create Photo Albums",
    description: "Preserve your most precious memories in beautiful, customizable albums.",
    highlight: false,
    features: [
      "Create dedicated albums for special occasions",
      "Unlimited pages to organize and customize",
      "Add co-creators (just like posts!) to collaborate",
      "Choose to keep albums private or share with others"
    ],
    comparisonNote: {
      icon: "✨",
      title: "Albums vs. Posts",
      message: "While posts are great for sharing moments, albums are like digital scrapbooks—perfect for preserving family reunions, anniversaries, vacations, and other milestone events with unlimited photos and creative layouts."
    }
  },
  {
    step: 7,
    icon: "🌸",
    title: "Your Profile, Your Sanctuary",
    description: "This is your personal dashboard for wellness, gratitude, connection, and joy.",
    highlight: true,
    features: [
      "Everything you need is right here at your fingertips",
      "Share what matters, preserve what's precious",
      "Connect authentically with your tribe",
      "Create your own peaceful corner of the internet"
    ],
    finalMessage: "Welcome home. This space is yours to nurture, grow, and cherish. 🌟"
  }
];

export default function ProfileTutorial() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setOpen(true);
    }
  }, []);

  const close = (remember: boolean) => {
    if (typeof window !== "undefined" && remember) {
      localStorage.setItem(STORAGE_KEY, "1");
    }
    setOpen(false);
  };

  const goNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => close(true)}
      />
      
      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with progress */}
        <div className={`${step.highlight ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-purple-500 to-purple-700'} p-6 text-white relative`}>
          <button
            onClick={() => close(true)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-all text-xl"
            aria-label="Close tutorial"
          >
            ×
          </button>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="text-5xl">{step.icon}</div>
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-100 mb-1">
                Step {step.step} of {TUTORIAL_STEPS.length}
              </div>
              <h2 className="text-2xl font-bold leading-tight">{step.title}</h2>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-700 text-base leading-relaxed mb-6">
            {step.description}
          </p>

          {/* Feature List */}
          {step.features && (
            <ul className="space-y-3">
              {step.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-purple-600 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Special Note (Gratitude Journal) */}
          {step.specialNote && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.specialNote.icon}</span>
                <div>
                  <div className="font-bold text-purple-900 mb-2">{step.specialNote.title}</div>
                  <div className="text-sm text-purple-800 leading-relaxed">{step.specialNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Note (Albums) */}
          {step.comparisonNote && (
            <div className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.comparisonNote.icon}</span>
                <div>
                  <div className="font-bold text-amber-900 mb-2">{step.comparisonNote.title}</div>
                  <div className="text-sm text-amber-800 leading-relaxed">{step.comparisonNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Pro Tip */}
          {step.tip && (
            <div className="mt-6 bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <div className="font-semibold text-amber-900 text-sm mb-1">Pro Tip</div>
                  <div className="text-sm text-amber-800">{step.tip}</div>
                </div>
              </div>
            </div>
          )}

          {/* Final Message */}
          {step.finalMessage && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
              <p className="text-purple-900 font-medium text-center italic">
                {step.finalMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            {/* Step Indicators */}
            <div className="flex gap-2">
              {TUTORIAL_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep 
                      ? 'bg-purple-600 w-6' 
                      : idx < currentStep 
                        ? 'bg-purple-300' 
                        : 'bg-gray-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-2">
              {!isFirstStep && (
                <button
                  onClick={goPrev}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Back
                </button>
              )}
              
              {!isLastStep ? (
                <button
                  onClick={goNext}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => close(true)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold shadow-lg"
                >
                  Let's Go! ✨
                </button>
              )}
            </div>
          </div>

          {/* Skip Tutorial Link */}
          <div className="text-center mt-3">
            <button
              onClick={() => close(false)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
