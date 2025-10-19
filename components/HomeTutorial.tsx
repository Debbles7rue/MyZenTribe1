// components/HomeTutorial.tsx - UPDATED WITH SMALL POPUP
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_home_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "📱",
    title: "Never Lose MyZenTribe Again!",
    description: "Add this app to your home screen for instant access. It'll sit right next to your other apps!",
    highlight: true,
    details: [
      {
        platform: "iPhone",
        icon: "🍎",
        instruction: "Tap the Share button (square with arrow), then select 'Add to Home Screen'"
      },
      {
        platform: "Android",
        icon: "🤖",
        instruction: "Tap the Menu (⋮) button, then select 'Install App' or 'Add to Home Screen'"
      }
    ]
  },
  {
    step: 2,
    icon: "👥",
    title: "See Updates from Your Tribe",
    description: "Your feed shows posts from friends, wellness businesses you follow, and communities you've joined.",
    highlight: false,
    features: [
      "Posts from friends you've connected with",
      "Event reminders from wellness businesses",
      "Community announcements and shared moments",
      "All in one peaceful, organized feed"
    ]
  },
  {
    step: 3,
    icon: "✨",
    title: "Co-Create Posts Together",
    description: "Going to an event with friends? Create ONE shared post where everyone can add their photos!",
    highlight: false,
    features: [
      "Tag friends as co-creators when creating a post",
      "All co-creators can add their own photos and videos",
      "No more duplicate posts flooding the feed",
      "Everyone's memories in one beautiful shared post"
    ],
    tip: "Pro tip: Co-creators get notified and can edit the post anytime to add more content!"
  },
  {
    step: 4,
    icon: "🏷️",
    title: "Tag Friends in Posts",
    description: "See something your friend would love? Tag them so they don't miss it!",
    highlight: false,
    features: [
      "Tag friends in any post you create",
      "They'll get a notification about being tagged",
      "Tagged posts appear on their feed",
      "Perfect for sharing events, photos, or moments"
    ]
  },
  {
    step: 5,
    icon: "🔒",
    title: "Control Your Privacy",
    description: "Choose who sees each post you create.",
    highlight: false,
    privacyLevels: [
      {
        icon: "🔒",
        level: "Private",
        description: "Only you and co-creators can see it"
      },
      {
        icon: "👥",
        level: "Friends",
        description: "All friends of all co-creators can see it"
      },
      {
        icon: "🌍",
        level: "Public",
        description: "Anyone viewing your profile can see it"
      }
    ]
  },
  {
    step: 6,
    icon: "🕊️",
    title: "Keep It Positive",
    description: "This is your sanctuary from the chaos of the world.",
    highlight: false,
    features: [
      "No politics or divisive content",
      "No terrible news or doom-scrolling",
      "Share gratitude, joy, and positive moments",
      "This is your escape—let's keep it peaceful"
    ],
    finalMessage: "We're bombarded with negativity everywhere else. Here, we celebrate what's good in life."
  }
];

export default function HomeTutorial() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false); // NEW: Prompt state

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShowPrompt(true); // CHANGED: Show prompt instead of full modal
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

  // Small Prompt Popup (shows first)
  if (showPrompt) {
    return (
      <>
        {/* Invisible backdrop - clicking anywhere dismisses */}
        <div 
          className="fixed inset-0 z-[999]" 
          onClick={() => setShowPrompt(false)}
        />
        
        {/* Small popup in bottom-right */}
        <div className="fixed bottom-6 right-6 z-[1000] animate-slideIn">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-purple-300 p-5 max-w-xs">
            {/* Close button */}
            <button
              onClick={() => {
                setShowPrompt(false);
                if (typeof window !== "undefined") {
                  localStorage.setItem(STORAGE_KEY, "1");
                }
              }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
            
            {/* Content */}
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">👋</span>
              <div>
                <h3 className="font-bold text-gray-800 text-lg mb-1">
                  New to this page?
                </h3>
                <p className="text-sm text-gray-600">
                  Want a quick tour of the features?
                </p>
              </div>
            </div>
            
            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPrompt(false);
                  setOpen(true);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
              >
                Yes, Show Me!
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Full Tutorial Modal (shows when they click "Yes")
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

          {/* PWA Install Instructions (Step 1) */}
          {step.details && (
            <div className="space-y-4">
              {step.details.map((detail, idx) => (
                <div key={idx} className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{detail.icon}</div>
                    <div>
                      <div className="font-bold text-purple-900 mb-1">{detail.platform}</div>
                      <div className="text-sm text-purple-700">{detail.instruction}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

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

          {/* Privacy Levels (Step 5) */}
          {step.privacyLevels && (
            <div className="space-y-3">
              {step.privacyLevels.map((level, idx) => (
                <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-2xl">{level.icon}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{level.level}</div>
                    <div className="text-sm text-gray-600">{level.description}</div>
                  </div>
                </div>
              ))}
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

          {/* Final Message (Last Step) */}
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
