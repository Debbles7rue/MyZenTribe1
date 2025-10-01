// components/MeditationTutorial.tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "mzt_meditation_tutorial_seen_v1";

const TUTORIAL_STEPS = [
  {
    step: 1,
    icon: "⏰",
    title: "Schedule Your Practice",
    description: "Create consistency in your meditation journey with flexible scheduling options.",
    highlight: true,
    features: [
      "Set regular meditation times that work for your schedule",
      "Get gentle reminders when it's time to practice",
      "Track your meditation streaks and progress",
      "Adjust your schedule as your life changes"
    ],
    tip: "Even 5 minutes a day creates profound changes over time. Start small and build from there!"
  },
  {
    step: 2,
    icon: "👥",
    title: "Meditation Buddies",
    description: "Find accountability and connection through meditation partnerships.",
    highlight: false,
    features: [
      "Schedule meditation sessions with friends",
      "Support each other's practice journey",
      "Share experiences and insights safely",
      "Create deeper bonds through shared mindfulness"
    ],
    buddyNote: {
      icon: "🤝",
      title: "The Power of Partnership",
      message: "Having a meditation buddy increases your consistency by 80%! When you commit to someone else, you're more likely to show up for yourself too."
    }
  },
  {
    step: 3,
    icon: "🧘‍♀️",
    title: "Join Group Sessions",
    description: "Connect with others in scheduled group meditation sessions throughout the day.",
    highlight: false,
    features: [
      "Join live group sessions with meditation timer",
      "See who else is meditating with you",
      "Access group sessions from the calendar",
      "Feel supported even when practicing alone"
    ]
  },
  {
    step: 4,
    icon: "💬",
    title: "Sacred Sharing Space",
    description: "Connect with others through our peaceful meditation lounge chat.",
    highlight: false,
    features: [
      "Share positive messages and insights",
      "Support others on their meditation journey",
      "Ask questions and receive gentle guidance",
      "Keep the space sacred and uplifting"
    ],
    guidelines: [
      {
        icon: "🕊️",
        rule: "Peaceful Communication",
        description: "Only positive, supportive, and uplifting messages"
      },
      {
        icon: "🙏",
        rule: "Respect & Reverence",
        description: "Honor everyone's unique spiritual journey"
      },
      {
        icon: "✨",
        rule: "Mindful Sharing",
        description: "Share insights that inspire and heal"
      }
    ]
  },
  {
    step: 5,
    icon: "🕯️",
    title: "Light Candles for Loved Ones",
    description: "Send love and healing energy to those who need it most through our virtual candle room.",
    highlight: false,
    features: [
      "Light a candle for someone special ($0.99)",
      "Honor the memory of loved ones who have passed",
      "Send healing energy to those who are struggling",
      "Candles appear in the public meditation room and on your profile"
    ],
    candleNote: {
      icon: "💝",
      title: "Why Light a Candle?",
      message: "Lighting a candle is a beautiful way to focus your intention and send positive energy across any distance. It's a sacred act of love that connects hearts and souls."
    }
  },
  {
    step: 6,
    icon: "📊",
    title: "Track Your Sacred Journey",
    description: "Watch your meditation practice grow and see your contribution to the global peace mission.",
    highlight: false,
    features: [
      "See your personal meditation statistics",
      "Track your consistency and growth over time",
      "Contribute to our global meditation counter",
      "Celebrate milestones in your practice"
    ],
    tip: "Every session—no matter how short—adds to the global field of peace. Your practice truly matters!"
  },
  {
    step: 7,
    icon: "🌸",
    title: "Your Meditation Hub",
    description: "Everything you need for a consistent, meaningful meditation practice is right here.",
    highlight: true,
    features: [
      "Access all meditation tools from one peaceful space",
      "Connect with your meditation community anytime",
      "Track your growth and celebrate your journey",
      "Find support and inspiration when you need it most"
    ],
    finalMessage: "Your meditation practice is a gift to yourself and to all of humanity. Every moment of peace you cultivate ripples out into the world. 🙏"
  }
];

export default function MeditationTutorial() {
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
        <div className={`${step.highlight ? 'bg-gradient-to-br from-purple-600 to-pink-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} p-6 text-white relative`}>
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
            <ul className="space-y-3 mb-6">
              {step.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-purple-600 font-bold mt-0.5">✓</span>
                  <span className="text-gray-700 flex-1">{feature}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Mission Note (Step 1) */}
          {step.missionNote && (
            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-indigo-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.missionNote.icon}</span>
                <div>
                  <div className="font-bold text-indigo-900 mb-2">{step.missionNote.title}</div>
                  <div className="text-sm text-indigo-800 leading-relaxed">{step.missionNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Buddy Note (Step 3) */}
          {step.buddyNote && (
            <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.buddyNote.icon}</span>
                <div>
                  <div className="font-bold text-green-900 mb-2">{step.buddyNote.title}</div>
                  <div className="text-sm text-green-800 leading-relaxed">{step.buddyNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Science Note (Step 4) */}
          {step.scienceNote && (
            <div className="mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border-2 border-teal-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.scienceNote.icon}</span>
                <div>
                  <div className="font-bold text-teal-900 mb-2">{step.scienceNote.title}</div>
                  <div className="text-sm text-teal-800 leading-relaxed">{step.scienceNote.message}</div>
                </div>
              </div>
            </div>
          )}

          {/* Guidelines (Step 5) */}
          {step.guidelines && (
            <div className="space-y-3 mb-6">
              {step.guidelines.map((guideline, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-xl">{guideline.icon}</span>
                  <div>
                    <div className="font-semibold text-purple-900 text-sm">{guideline.rule}</div>
                    <div className="text-xs text-purple-700">{guideline.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Candle Note (Step 6) */}
          {step.candleNote && (
            <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{step.candleNote.icon}</span>
                <div>
                  <div className="font-bold text-orange-900 mb-2">{step.candleNote.title}</div>
                  <div className="text-sm text-orange-800 leading-relaxed">{step.candleNote.message}</div>
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
            <div className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
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
                  Begin Journey 🙏
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
