// components/BusinessViewerTutorial.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_business_viewer_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "➕",
    title: "Follow for Updates",
    description: "When you follow a business, you'll stay connected with their latest offerings and events.",
    highlight: true,
    followBenefits: [
      {
        icon: "📱",
        benefit: "Posts in Your Feed",
        description: "Business announcements and updates appear in your home feed"
      },
      {
        icon: "📅",
        benefit: "Events in What's Happening",
        description: "Their events automatically show up in your calendar's 'What's Happening' section"
      }
    ]
  },
  {
    step: 2,
    icon: "🔍",
    title: "Check Verification & Do Your Research",
    description: "Always verify businesses independently before attending events or paying for services.",
    highlight: false,
    verificationSteps: [
      {
        icon: "✅",
        action: "Check Their Verification Level",
        description: "Non-verified (⚠️) = use extra caution, Verified (✅) = established credibility"
      },
      {
        icon: "🌐",
        action: "Verify Outside the App",
        description: "Check their website, social media, and Google reviews"
      },
      {
        icon: "🚫",
        action: "Never Send Money to Strangers",
        description: "Don't pay anyone you haven't met or thoroughly verified"
      }
    ],
    disclaimer: "MyZenTribe is not responsible for financial transactions or what happens off the app."
  },
  {
    step: 3,
    icon: "🛡️",
    title: "Stay Safe at Events",
    description: "Use common sense safety practices when attending events with new people.",
    highlight: false,
    features: [
      "Tell someone where you're going and when you'll be back",
      "Arrange your own transportation to and from events",
      "Trust your instincts - leave if something feels off",
      "Consider bringing a friend to unfamiliar venues"
    ],
    finalMessage: "Trust your instincts, verify before you attend, and enjoy building authentic connections with wellness practitioners who align with your journey. 🌟"
  }
];

export default function BusinessViewerTutorial() {
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
        <div className={`${step.highlight ? 'bg-gradient-to-br from-blue-600 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-purple-600'} p-6 text-white relative`}>
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
              <div className="text-sm font-medium text-blue-100 mb-1">
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
            <ul className="space-y-3 mb-6">
              {step.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-blue-600 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Follow Benefits (Step 2) */}
          {step.followBenefits && (
            <div className="space-y-3 mb-6">
              {step.followBenefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-xl">{benefit.icon}</span>
                  <div>
                    <div className="font-semibold text-blue-900 text-sm">{benefit.benefit}</div>
                    <div className="text-xs text-blue-700">{benefit.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Levels (Step 3) */}
          {step.verificationLevels && (
            <div className="space-y-3 mb-6">
              {step.verificationLevels.map((level, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">{level.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{level.level}</div>
                      <div className="text-sm text-gray-600 mb-1">{level.description}</div>
                      <div className="text-xs text-blue-700 font-medium">{level.advice}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Steps (Step 4) */}
          {step.verificationSteps && (
            <div className="space-y-3 mb-6">
              {step.verificationSteps.map((verifyStep, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-xl">{verifyStep.icon}</span>
                  <div>
                    <div className="font-semibold text-green-900 text-sm">{verifyStep.action}</div>
                    <div className="text-xs text-green-700">{verifyStep.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Money Rules (Step 5) */}
          {step.moneyRules && (
            <div className="space-y-3 mb-4">
              {step.moneyRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-xl">{rule.icon}</span>
                  <div>
                    <div className="font-semibold text-red-900 text-sm">{rule.rule}</div>
                    <div className="text-xs text-red-700">{rule.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer (Step 5) */}
          {step.disclaimer && (
            <div className="mb-6 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 font-medium italic text-center">
                {step.disclaimer}
              </p>
            </div>
          )}

          {/* Business Features (Step 7) */}
          {step.businessFeatures && (
            <div className="space-y-3 mb-6">
              {step.businessFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-xl">{feature.icon}</span>
                  <div>
                    <div className="font-semibold text-purple-900 text-sm">{feature.feature}</div>
                    <div className="text-xs text-purple-700">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Safety Note (Step 6) */}
          {step.safetyNote && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.safetyNote.icon}</span>
                <div>
                  <div className="font-bold text-orange-900 mb-2">{step.safetyNote.title}</div>
                  <div className="text-sm text-orange-800 leading-relaxed">{step.safetyNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Pro Tip */}
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

          {/* Final Message */}
          {step.finalMessage && (
            <div className="p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border border-blue-200">
              <p className="text-blue-900 font-medium text-center italic">
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
                      ? 'bg-blue-600 w-6' 
                      : idx < currentStep 
                        ? 'bg-blue-300' 
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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => close(true)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg"
                >
                  Explore Safely 👀
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
