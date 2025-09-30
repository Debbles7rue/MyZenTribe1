// components/CommunitiesTutorial.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_communities_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "🌍",
    title: "Find Your Tribe & Discover Local Gems",
    description: "Communities is where connection happens—meet like-minded people, discover wellness businesses, and explore events near you (or anywhere in the world!).",
    highlight: true,
    features: [
      "Join communities of people who share your interests",
      "Discover wellness businesses in your area—or across the globe",
      "Find events and experiences you never knew existed",
      "Create your own community if you can't find your tribe"
    ]
  },
  {
    step: 2,
    icon: "📍",
    title: "Explore the Map: Your Discovery Tool",
    description: "Use our interactive map to find wellness businesses and events wherever you are—or wherever you're going.",
    highlight: false,
    features: [
      "See pins for businesses and events on a visual map",
      "Zoom in to discover what's down the road from you",
      "Zoom out to explore what's happening across the world",
      "Perfect for finding new spots when traveling"
    ],
    specialNote: {
      icon: "💼",
      title: "Business Owners",
      message: "Have a wellness business? Drop a pin on the map with your information to help people discover you! Mark your physical location and promote your offerings to the community."
    },
    tip: "Planning a trip? Zoom into your destination to see what wellness experiences await you there!"
  },
  {
    step: 3,
    icon: "🔍",
    title: "Find or Create Your Perfect Community",
    description: "Whether you're searching for something specific or exploring what's out there, your tribe is waiting.",
    highlight: false,
    features: [
      "Filter by interest: yoga, meditation, church, hiking—whatever speaks to you",
      "Search by zip code to discover communities in your area",
      "Join in-person communities OR virtual communities with online events",
      "Can't find what you're looking for? Create your own community!"
    ],
    comparisonNote: {
      icon: "🌐",
      title: "In-Person or Virtual",
      message: "Communities can be location-based with local meetups, or completely virtual with online events. Connect however works best for you!"
    }
  },
  {
    step: 4,
    icon: "✨",
    title: "Support Local Wellness Businesses",
    description: "Discover hidden gems and support the businesses that make your community thrive.",
    highlight: false,
    features: [
      "Business members can share their events with the community",
      "Find wellness studios, practitioners, and services you didn't know existed",
      "Get notified about workshops, classes, and special offerings",
      "Support local entrepreneurs doing meaningful work"
    ],
    finalMessage: "When you support small wellness businesses, you're not just attending an event—you're helping someone's dream flourish. 💜"
  },
  {
    step: 5,
    icon: "💬",
    title: "Connect, Chat & Feel Supported",
    description: "Communities aren't just for finding events—they're for genuine connection.",
    highlight: false,
    features: [
      "Start discussions about topics you care about",
      "Chat with members who understand your journey",
      "Ask questions, share experiences, get advice",
      "Build real friendships with people who get it"
    ],
    tip: "The best communities are built on authentic connection. Share openly, support generously, and watch your tribe grow!"
  },
  {
    step: 6,
    icon: "🕊️",
    title: "A Safe, Positive Space",
    description: "Communities are sanctuaries from the chaos. We're committed to keeping them that way.",
    highlight: true,
    features: [
      "No politics or divisive content allowed",
      "Focus on wellness, growth, and positive connection",
      "Moderators and admins maintain a respectful environment",
      "Problematic posts or members will be removed"
    ],
    specialNote: {
      icon: "🛡️",
      message: "We all need spaces where we can breathe, connect, and feel safe. Community guidelines aren't about censorship—they're about protection. This is your peaceful corner of the internet."
    },
    finalMessage: "Here, you can let your guard down. Here, kindness is the currency. Here, you belong. 🌟"
  }
];

export default function CommunitiesTutorial() {
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

          {/* Special Note */}
          {step.specialNote && (
            <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-purple-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.specialNote.icon}</span>
                <div>
                  {step.specialNote.title && (
                    <div className="font-bold text-purple-900 mb-2">{step.specialNote.title}</div>
                  )}
                  <div className="text-sm text-purple-800 leading-relaxed">{step.specialNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison/Example Note */}
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
