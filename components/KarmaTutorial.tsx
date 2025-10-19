// components/KarmaTutorial.tsx - UPDATED WITH SMALL POPUP
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_karma_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "📰",
    title: "Good News & Inspiring Stories",
    description: "This is your sanctuary from doom-scrolling—only beautiful, uplifting content allowed here.",
    highlight: true,
    features: [
      "Real stories that restore faith in humanity",
      "No politics, no drama, no terrible news",
      "Share inspiring stories you've experienced or heard about",
      "Post photos of beauty and kindness in the world"
    ],
    refugeNote: {
      icon: "🌈",
      title: "Your Daily Refuge",
      message: "We're bombarded with negativity everywhere else. Here, we celebrate what's good in life. This is your escape from the noise—let's keep it peaceful and uplifting."
    }
  },
  {
    step: 2,
    icon: "✨",
    title: "Anonymous Kindness & Challenges",
    description: "Share your good deeds anonymously and take on kindness challenges to inspire others.",
    highlight: false,
    features: [
      "Share your good deeds without revealing your identity",
      "Join weekly kindness challenges with specific actions",
      "Earn karma points for participating and spreading kindness",
      "Create a ripple effect of positive actions"
    ],
    challengeExamples: [
      {
        icon: "☕",
        challenge: "Pay It Forward",
        description: "Buy coffee for the person behind you in line"
      },
      {
        icon: "💌",
        challenge: "Gratitude Notes",
        description: "Leave encouraging notes in public places"
      }
    ],
    tip: "The most powerful kindness often happens when no one is watching. Share your story to encourage others!"
  },
  {
    step: 3,
    icon: "🌟",
    title: "Be the Light",
    description: "In a world that can feel heavy, you have the power to be someone's ray of sunshine.",
    highlight: true,
    features: [
      "Every act of kindness creates ripples of good",
      "Your story might inspire someone else's good deed",
      "Small actions can have massive impacts",
      "You're part of a growing movement of light workers"
    ],
    finalMessage: "You don't have to change the whole world—just change someone's day. That's how we heal the world, one heart at a time. 💫"
  }
];

export default function KarmaTutorial() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShowPrompt(true);
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
        <div 
          className="fixed inset-0 z-[999]" 
          onClick={() => setShowPrompt(false)}
        />
        
        <div className="fixed bottom-6 right-6 z-[1000] animate-slideIn">
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-emerald-300 p-5 max-w-xs">
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
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPrompt(false);
                  setOpen(true);
                }}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => close(true)}
      />
      
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className={`${step.highlight ? 'bg-gradient-to-br from-emerald-600 to-teal-600' : 'bg-gradient-to-br from-emerald-500 to-green-600'} p-6 text-white relative`}>
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
              <div className="text-sm font-medium text-emerald-100 mb-1">
                Step {step.step} of {TUTORIAL_STEPS.length}
              </div>
              <h2 className="text-2xl font-bold leading-tight">{step.title}</h2>
            </div>
          </div>
          
          <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <p className="text-gray-700 text-base leading-relaxed mb-6">
            {step.description}
          </p>

          {step.features && (
            <ul className="space-y-3 mb-6">
              {step.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {step.refugeNote && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.refugeNote.icon}</span>
                <div>
                  <div className="font-bold text-blue-900 mb-2">{step.refugeNote.title}</div>
                  <div className="text-sm text-blue-800 leading-relaxed">{step.refugeNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {step.challengeExamples && (
            <div className="space-y-3 mb-6">
              <div className="text-sm font-semibold text-gray-700 mb-2">Example Challenges:</div>
              {step.challengeExamples.map((example, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-xl">{example.icon}</span>
                  <div>
                    <div className="font-semibold text-emerald-900 text-sm">{example.challenge}</div>
                    <div className="text-xs text-emerald-700">{example.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step.karmaNote && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-amber-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.karmaNote.icon}</span>
                <div>
                  <div className="font-bold text-amber-900 mb-2">{step.karmaNote.title}</div>
                  <div className="text-sm text-amber-800 leading-relaxed">{step.karmaNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {step.tip && (
            <div className="mb-6 bg-amber-50 rounded-lg p-4 border-l-4 border-amber-400">
              <div className="flex items-start gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <div className="font-semibold text-amber-900 text-sm mb-1">Pro Tip</div>
                  <div className="text-sm text-amber-800">{step.tip}</div>
                </div>
              </div>
            </div>
          )}

          {step.finalMessage && (
            <div className="p-4 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl border border-emerald-200">
              <p className="text-emerald-900 font-medium text-center italic">
                {step.finalMessage}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              {TUTORIAL_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentStep 
                      ? 'bg-emerald-600 w-6' 
                      : idx < currentStep 
                        ? 'bg-emerald-300' 
                        : 'bg-gray-300'
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

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
                  className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => close(true)}
                  className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-lg"
                >
                  Spread the Light ✨
                </button>
              )}
            </div>
          </div>

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
